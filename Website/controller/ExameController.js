import mongoose from "mongoose";
import Exame from "../model/Exame.js";
import { pipeline } from "node:stream/promises";
import { connection } from "../config/db.js";
import Paciente from "../model/Paciente.js";
import { salvarImagem, removerImagem, abrirImagem } from "../config/gridfs.js";

// Remove tudo que não for número (ex.: "123.456.789-01" -> "12345678901")
const soDigitos = (valor = "") => valor.replace(/\D/g, "");

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
  };
}

// Renderiza a página inicial com os exames do médico logado (usada também para mostrar erros)
// "extras" permite mandar dados a mais para a view, como { erro: "..." } para abrir o modal de erro
export function renderInicio(req, res, status = 200, extras = {}) {
  const medicoId = req.session.user.id;

  return connection()
    .then(() =>
      // As duas consultas rodam ao mesmo tempo
      Promise.all([
        // Exames mais recentes do médico, já trazendo os dados do paciente junto
        Exame.find({ medicoId })
          .sort({ createdAt: -1 })
          .limit(LIMITE_RECENTES)
          .populate("pacienteId")
          .lean(), // objeto JS simples, mais leve que um documento do Mongoose
        // Total de exames do médico, usado no card "Exames cadastrados"
        Exame.countDocuments({ medicoId }),
      ]),
    )
    .then(([exames, totalExames]) => {
      res.status(status).render("index", {
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
      res.status(500).render("index", {
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

  connection()
    .then(() =>
      // Filtrar também pelo medicoId impede que um médico veja a imagem do exame de outro
      Exame.findOne({ _id: id, medicoId: req.session.user.id }).lean(),
    )
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

// Recebe o formulário do modal "Novo exame": cria o paciente, salva a imagem e cria o exame
// req.body e req.file são preenchidos pelo middleware Upload (multer)
export function cadastrar(req, res) {
  const nome_paciente = req.body.nome;
  const idade_paciente = Number(req.body.idade);
  const tipo_sanguineo = req.body.tipoSanguineo;
  const etnia = req.body.etnia;
  const sexo = req.body.sexo;
  const rg = req.body.rg;
  const cpf = soDigitos(req.body.cpf);
  const dataExame = req.body.dataExame;
  const medicoId = req.session.user.id;

  // Validações antes de mexer no banco
  if (
    !nome_paciente ||
    !idade_paciente ||
    !tipo_sanguineo ||
    !etnia ||
    !sexo ||
    !rg ||
    !cpf ||
    !dataExame
  )
    return error(req, res, 400, "Preencha todos os campos.");
  if (cpf.length !== 11) return error(req, res, 400, "CPF inválido.");

  if (!Number.isInteger(idade_paciente) || idade_paciente < 0 || idade_paciente > 130)
    return error(req, res, 400, "Idade inválida.");

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

  // Guardam o que já foi criado, para poder desfazer se algum passo seguinte falhar
  let pacienteId = null;
  let imagemId = null;

  connection().then(() => {
    // PASSO 1: criar o paciente
    return Paciente.create({
        nome_paciente: nome_paciente.trim(),
        idade_paciente: idade_paciente,
        tipo_sanguineo: tipo_sanguineo,
        etnia_paciente: etnia,
        sexo_biologico: sexo,
        rg_paciente: rg,
        cpf_paciente: cpf,
        cadastrado_por: medicoId
    });
  }).then(paciente => {
    pacienteId = paciente._id;

    // 2 PASSO: salva a radiografia no GridFS e recebe o id do arquivo
    return salvarImagem(buffer, {
        nome: req.file.originalname,
        contentType: contentType,
        metadata: { pacienteId: pacienteId, medicoId: medicoId },
    })
  }).then(id => {
    imagemId = id;

    // 3 PASSO: cria o exame ligando o médico, o paciente e a imagem
    return Exame.create({
        medicoId: medicoId,
        pacienteId: pacienteId,
        tipo_exame: req.body.tipoExame,
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
    res.redirect("/inicio");
  }).catch(erro => {
    console.log(`Erro ao cadastrar exame: ${erro}`);

    // Desfaz o que já foi criado, para não sobrar imagem ou paciente sem exame
    const limpezas = [];
    if (imagemId) limpezas.push(removerImagem(imagemId));
    if (pacienteId) limpezas.push(Paciente.findByIdAndDelete(pacienteId));

    // allSettled espera todas as limpezas, mesmo que alguma delas falhe
    return Promise.allSettled(limpezas).then(() => {
         // 11000 é o código do MongoDB para valor duplicado em campo único
         if (erro.code === 11000) {
            return error(req, res, 409, "Já existe um paciente cadastrado com este CPF.");
        }
        // Algum campo não passou nas regras do schema do Mongoose
        if (erro.name === "ValidationError") {
            return error(req, res, 400, "Dados inválidos.");
        }
        return error(req, res, 500, "Erro interno ao cadastrar o exame.");
    })
  })
}
