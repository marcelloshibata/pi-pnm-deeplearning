import mongoose from "mongoose";
import Exame from "../model/Exame.js";
import { pipeline } from "node:stream/promises";
import Paciente from "../model/Paciente.js";
import { salvarImagem, removerImagem, abrirImagem } from "../config/gridfs.js";
import PDFDocument from "pdfkit";

// Confere os primeiros bytes do arquivo, pois o mimetype enviado pelo navegador pode ser falso
const ehPng = (b) =>
  b.length > 8 &&
  b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
const ehJpeg = (b) =>
  b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

// Quantos exames aparecem na tabela "Exames recentes"
const LIMITE_RECENTES = 10;

// Traduz o status salvo no banco para o texto mostrado na tela
const STATUS = {
  PENDENTE_TRIAGEM: "Pendente",
  CONCLUIDO: "Concluído",
};

// O CPF é salvo só com números; aqui ele volta para o formato 000.000.000-00
const formatarCpf = (cpf = "") =>
  cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");

// A data é salva ao meio-dia, então formatar no fuso de Brasília nunca muda o dia
const formatarData = (data) =>
  data
    ? new Date(data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "";

// Fração para porcentagem no formato brasileiro (ex.: 0.734 -> "73,4%")
const formatarPorcentagem = (fracao, casas = 1) =>
  fracao.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

// Cor do alerta da análise: acima de 70% vermelho, acima de 40% amarelo, senão verde
const nivelDeRisco = (fracao) =>
  fracao > 0.7 ? "danger" : fracao > 0.4 ? "warning" : "success";

// Monta só o que a tela precisa: vai para a tabela e para o modal de visualização
function formatarExame(exame) {
  const id = exame._id.toString();
  // Depois do populate, pacienteId é o documento do paciente (ou null, se ele foi apagado)
  const paciente = exame.pacienteId || {};

  return {
    id,
    // Dados do paciente
    paciente: paciente.nome_paciente,
    idade: paciente.idade_paciente,
    tipoSanguineo: paciente.tipo_sanguineo,
    etnia: paciente.etnia_paciente,
    sexo: paciente.sexo_biologico,
    rg: paciente.rg_paciente,
    cpf: formatarCpf(paciente.cpf_paciente),
    // Dados do exame
    tipoExame: exame.tipo_exame,
    data: formatarData(exame.data_hora_exame),
    status: STATUS[exame.status_exame] || exame.status_exame,
    pendente: exame.status_exame === "PENDENTE_TRIAGEM", // deixa o chip de status amarelo
    // Imagem: o navegador busca o arquivo pela rota GET /exames/:id/imagem
    imagens: exame.imagem_exame?.arquivoId ? 1 : 0,
    imagemUrl: `/exames/${id}/imagem`,
    imagemNome: exame.imagem_exame?.nomeOriginal,
    // Só existe depois de "Analisar exame": o modal mostra o alerta e trava o botão enquanto isso estiver preenchido
    analise:
      exame.probabilidade_pnm == null
        ? null
        : {
            mensagem: `Probabilidade de pneumonia de ${paciente.nome_paciente}: ${formatarPorcentagem(exame.probabilidade_pnm)}.`,
            nivel: nivelDeRisco(exame.probabilidade_pnm),
          },

    relatorio: exame.relatorio?.parecer_final
          ? {
            diagnostico: exame.relatorio.diagnostico_confirmado,
            parecer: exame.relatorio.parecer_final,
            // YYYY-MM-DD, formato do <input type="date"> do modal (gravada às 12h, então o dia não muda em UTC)
            data_relatorio: exame.relatorio.data_relatorio?.toISOString().slice(0, 10),
          }
          : null,
  };
}

// Renderiza a página inicial com os exames do médico logado (usada também para mostrar erros)
// "extras" permite mandar dados a mais para a view, como { erro: "..." } para abrir o modal de erro
export function renderInicio(req, res, status = 200, extras = {}) {
  const medicoId = req.session.user.id;

  // As duas consultas rodam ao mesmo tempo
  return Promise.all([
    // Exames mais recentes do médico, já trazendo os dados do paciente junto
    Exame.find({ medicoId })
      .sort({ createdAt: -1 })
      .limit(LIMITE_RECENTES)
      .populate("pacienteId")
      .lean(), // objeto JS simples, mais leve que um documento do Mongoose
    // Total de exames do médico, usado no card "Exames cadastrados"
    Exame.countDocuments({ medicoId }),
  ])
    .then(([exames, totalExames]) => {
      res.status(status).render("exames", {
        usuario: req.session.user,
        exames: exames.map(formatarExame),
        totalExames,
        resumo: { exames: totalExames },
        ...extras,
      });
    })
    .catch((erro) => {
      // Se o banco falhar, ainda mostra a página (vazia) com o modal de erro
      console.log(`Erro ao carregar os exames: ${erro}`);
      res.status(500).render("exames", {
        usuario: req.session.user,
        erro: "Não foi possível carregar os exames.",
        ...extras,
      });
    });
}

// Atalho para voltar à página inicial mostrando o modal de erro com a mensagem
const error = (req, res, status, erro) =>
  renderInicio(req, res, status, { erro });

// Envia a radiografia guardada no GridFS, só para o médico dono do exame
export function imagem(req, res) {
  const { id } = req.params;
  // Um id em formato inválido faria a consulta falhar, então já responde "não encontrado"
  if (!mongoose.isValidObjectId(id)) return res.sendStatus(404);

  // Filtrar também pelo medicoId impede que um médico veja a imagem do exame de outro
  Exame.findOne({ _id: id, medicoId: req.session.user.id })
    .lean()
    .then((exame) => {
      if (!exame) return res.sendStatus(404);

      res.set({
        "Content-Type": exame.imagem_exame.contentType,
        // O navegador pode guardar a imagem por 1 hora, mas só para este usuário
        "Cache-Control": "private, max-age=3600",
        // Impede o navegador de "adivinhar" outro tipo de arquivo além do informado
        "X-Content-Type-Options": "nosniff",
      });
      // Lê o arquivo do GridFS aos poucos e vai enviando na resposta, sem carregar tudo na memória
      return pipeline(abrirImagem(exame.imagem_exame.arquivoId), res);
    })
    .catch((erro) => {
      console.log(`Erro ao abrir a imagem do exame: ${erro}`);
      // Se parte da imagem já foi enviada, não dá mais para trocar o status da resposta
      if (!res.headersSent) res.sendStatus(500);
    });
}

// Recebe o id do exame no modal de visualização e grava a probabilidade de pneumonia
export function analisar(req, res) {
  const id = req.body.id;
  const proba = Math.random();

  // Só analisa exames que ainda não têm probabilidade (probabilidade_pnm: null também casa com o campo ausente)
  Exame.findOneAndUpdate(
    { _id: id, medicoId: req.session.user.id, probabilidade_pnm: null },
    { probabilidade_pnm: proba },
  )
    .then((exame) => {
      if (!exame) return error(req, res, 404, "Exame não encontrado ou já analisado.");

      // Volta para a página inicial e reabre o modal do exame, que já vem com o alerta da probabilidade
      return renderInicio(req, res, 200, { exameAnalisadoId: id });
    })
    .catch((erro) => {
      console.log(`Erro ao analisar o exame: ${erro}`);
      return error(req, res, 500, "Erro interno ao analisar o exame.");
    });
}

// Recebe o formulário do modal "Registrar relatório": grava o parecer final e conclui o exame
export function registrarRelatorio(req, res) {
  const id = req.body.id;
  const dataRelatorio = req.body.dataRelatorio;
  const parecer_final = req.body.parecer;
  let diagnostico;

  if (req.body.diagnostico === "sim") {
    diagnostico = true;
  } else {
    diagnostico = false;
  }
  
  Exame.findOneAndUpdate(
    {_id: id, medicoId: req.session.user.id},
    {
      status_exame: "CONCLUIDO",
      relatorio: {
        diagnostico_confirmado: diagnostico,
        parecer_final: parecer_final,
        data_relatorio: new Date(`${dataRelatorio}T12:00:00`)
      }
    }
  ).then(() => {
    res.redirect("/exames");
  })
}

export async function exportarRelatorio(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.sendStatus(404);

  try {
    const exame = await Exame.findOne({ _id: id, medicoId: req.session.user.id }).populate("pacienteId").lean()
    if (!exame?.relatorio?.parecer_final) return res.sendStatus(404);

    const dados = formatarExame(exame);
    const { relatorio } = exame;

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    res.set({
      "Content-Type": "application/pdf",
      // Attachment faz o navegador baixar o arquivo em vez de navegar até ele
      "Content-Disposition": `attachment;filename="relatorio-${id}.pdf"`,
    });

    doc.pipe(res);
    doc.fontSize(20).text("Relatório médico", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text("Paciente");
    doc.fontSize(11)
      .text(`Nome: ${dados.paciente}`)
      .text(`CPF: ${dados.cpf}`)
      .text(`Idade: ${dados.idade}`)
      .text(`Sexo: ${dados.sexo}`);
    doc.moveDown();

    doc.fontSize(14).text("Exame");
    doc.fontSize(11)
      .text(`Tipo: ${dados.tipoExame}`)
      .text(`Data do exame: ${dados.data}`);
    doc.moveDown();

    doc.fontSize(14).text("Relatório");
    doc.fontSize(11)
      .text(`Diagnóstico de pneumonia: ${relatorio.diagnostico_confirmado ? "Sim" : "Não"}`)
      .text(`Data do relatório: ${formatarData(relatorio.data_relatorio)}`);
    doc.moveDown();
    doc.fontSize(14).text("Parecer final");
    doc.fontSize(11).text(relatorio.parecer_final, { align: "justify" });
    doc.end();
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
  
}

// Recebe o formulário do modal "Novo exame": vincula um paciente já cadastrado, salva a imagem e cria o exame
// req.body e req.file são preenchidos pelo middleware Upload (multer)
export function cadastrar(req, res) {
  const pacienteId = req.body.pacienteId;
  const dataExame = req.body.dataExame;
  const medicoId = req.session.user.id;

  // Validações antes de mexer no banco
  if (!pacienteId || !dataExame)
    return error(req, res, 400, "Selecione um paciente e informe a data do exame.");
  if (!mongoose.isValidObjectId(pacienteId))
    return error(req, res, 400, "Paciente inválido.");

  if (!req.file) return error(req, res, 400, "Anexe uma imagem PNG ou JPG.");

  // O multer guarda o arquivo na memória; o tipo real é descoberto pelos bytes do arquivo
  const buffer = req.file.buffer;
  const contentType = ehPng(buffer)
    ? "image/png"
    : ehJpeg(buffer)
      ? "image/jpeg"
      : null;

  if (!contentType)
    return error(req, res, 400, "A imagem deve ser PNG ou JPG.");

  // Guarda o que já foi criado, para poder desfazer se algum passo seguinte falhar
  let imagemId = null;

  // PASSO 1: confirma que o paciente existe e pertence ao médico logado
  Paciente.exists({ _id: pacienteId, cadastrado_por: medicoId }).then(paciente => {
    if (!paciente) {
      const naoEncontrado = new Error("Paciente não encontrado");
      naoEncontrado.name = "PacienteNaoEncontrado";
      throw naoEncontrado;
    }

    // PASSO 2: salva a radiografia no GridFS e recebe o id do arquivo
    return salvarImagem(buffer, {
        nome: req.file.originalname,
        contentType: contentType,
        metadata: { pacienteId: pacienteId, medicoId: medicoId },
    })
  }).then(id => {
    imagemId = id;

    // PASSO 3: cria o exame ligando o médico, o paciente e a imagem
    return Exame.create({
        medicoId: medicoId,
        pacienteId: pacienteId,
        // Meio-dia evita que a conversão de fuso horário jogue a data para o dia anterior
        data_hora_exame: new Date(`${dataExame}T12:00:00`),
        imagem_exame: {
            arquivoId: imagemId,
            contentType: contentType,
            nomeOriginal: req.file.originalname
        },
    })
  }).then(() => {
    // Volta para a página inicial, que já vai listar o exame novo e o total atualizado
    res.redirect("/exames");
  }).catch(erro => {
    console.log(`Erro ao cadastrar exame: ${erro}`);

    // Desfaz a imagem já salva, para não sobrar arquivo sem exame
    const limpezas = [];
    if (imagemId) limpezas.push(removerImagem(imagemId));

    // allSettled espera todas as limpezas, mesmo que alguma delas falhe
    return Promise.allSettled(limpezas).then(() => {
        if (erro.name === "PacienteNaoEncontrado") {
            return error(req, res, 404, "Paciente não encontrado.");
        }
        // Algum campo não passou nas regras do schema do Mongoose
        if (erro.name === "ValidationError") {
            return error(req, res, 400, "Dados inválidos.");
        }
        return error(req, res, 500, "Erro interno ao cadastrar o exame.");
    })
  })
}

