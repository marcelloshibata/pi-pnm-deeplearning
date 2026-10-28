import mongoose from "mongoose";
import Paciente from "../model/Paciente.js";
import Exame from "../model/Exame.js";

const soDigitos = (valor = "") => valor.replace(/\D/g, "");

// Aceita Date ou string "YYYY-MM-DD"; retorna null se a data for inválida ou futura.
export const calcularIdade = (dataNascimento, hoje = new Date()) => {
  const nasc = new Date(dataNascimento);
  if (Number.isNaN(nasc.getTime())) return null;

  // Datas "YYYY-MM-DD" são lidas como UTC, então usamos getUTC* para não recuar um dia.
  let idade = hoje.getFullYear() - nasc.getUTCFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nasc.getUTCMonth() ||
    (hoje.getMonth() === nasc.getUTCMonth() && hoje.getDate() < nasc.getUTCDate());
  if (aindaNaoFezAniversario) idade--;

  return idade >= 0 ? idade : null;
};

const formatarCpf = (cpf = "") =>
  cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");

// Escapa caracteres especiais para o texto digitado poder ser usado dentro de um RegExp
const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const LIMITE_BUSCA = 8;

// Busca os pacientes do médico logado por nome ou CPF (usada pelo campo de pesquisa do modal de exame)
export function buscar(req, res) {
  const termo = String(req.query.q || "").trim();
  const digitos = soDigitos(termo);

  const filtro = { cadastrado_por: req.session.user.id };
  if (termo) {
    const criterios = [{ nome_paciente: new RegExp(escaparRegex(termo), "i") }];
    if (digitos) criterios.push({ cpf_paciente: new RegExp(escaparRegex(digitos)) });
    filtro.$or = criterios;
  }

  Paciente.find(filtro)
    .sort({ nome_paciente: 1 })
    .limit(LIMITE_BUSCA)
    .lean()
    .then((pacientes) => {
      res.json(
        pacientes.map((p) => ({
          id: p._id.toString(),
          nome: p.nome_paciente,
          cpf: formatarCpf(p.cpf_paciente),
          idade: p.idade_paciente,
          sexo: p.sexo_biologico,
        })),
      );
    })
    .catch((erro) => {
      console.log(`Erro ao buscar pacientes: ${erro}`);
      res.status(500).json({ erro: "Não foi possível buscar os pacientes." });
    });
}

// Quantos pacientes aparecem na tabela
const LIMITE_LISTA = 10;

// A data é salva ao meio-dia ou em UTC; formatar no fuso de Brasília nunca muda o dia
const formatarData = (data) =>
  data
    ? new Date(data).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "";

// O celular é salvo só com números; aqui ele volta para o formato (00) 00000-0000
const formatarCelular = (celular = "") =>
  celular.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");

// Monta só o que a tela precisa para cada linha da tabela
const formatarPaciente = (p) => ({
  id: p._id.toString(),
  nome: p.nome_paciente,
  idade: p.idade_paciente,
  sexo: p.sexo_biologico,
  cpf: formatarCpf(p.cpf_paciente),
  contato: formatarCelular(p.contato_paciente?.celular_paciente),
  cadastro: formatarData(p.createdAt),
  tipoSanguineo: p.tipo_sanguineo,
  etnia: p.etnia_paciente,
  rg: p.rg_paciente,
  email: p.contato_paciente?.email_paciente,
  cep: p.endereco_paciente?.cep,
  logradouro: p.endereco_paciente?.logradouro,
  numero: p.endereco_paciente?.numero_casa,
  bairro: p.endereco_paciente?.bairro,
  cidade: p.endereco_paciente?.cidade,
  estado: p.endereco_paciente?.estado,
  complemento: p.endereco_paciente?.complemento,
  nomeSocial: p.nome_social,
});

// Renderiza a página de pacientes do médico logado (usada também para mostrar erros)
// "extras" permite mandar dados a mais para a view, como { erro: "..." } para abrir o modal de erro
export function renderPacientes(req, res, status = 200, extras = {}) {
  const medicoId = req.session.user.id;
  const agora = new Date();
  const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const mes = agora.toLocaleDateString("pt-BR", { month: "long", timeZone: "America/Sao_Paulo" });

  return Promise.all([
    Paciente.find({ cadastrado_por: medicoId })
      .sort({ createdAt: -1 })
      .limit(LIMITE_LISTA)
      .lean(),
    Paciente.countDocuments({ cadastrado_por: medicoId }),
    Paciente.countDocuments({ cadastrado_por: medicoId, createdAt: { $gte: inicioDoMes } }),
    // Pacientes com algum exame ainda sem resultado
    Exame.distinct("pacienteId", { medicoId, status_exame: "PENDENTE_TRIAGEM" }),
  ])
    .then(([pacientes, totalPacientes, novos, emAcompanhamento]) => {
      res.status(status).render("pacientes", {
        usuario: req.session.user,
        pacientes: pacientes.map(formatarPaciente),
        totalPacientes,
        resumo: {
          pacientes: totalPacientes,
          pacientesHint: "Base de pacientes da unidade",
          acompanhamento: emAcompanhamento.length,
          acompanhamentoHint: "Com acompanhamento aberto",
          novos,
          novosHint: `Cadastros realizados em ${mes}`,
        },
        ...extras,
      });
    })
    .catch((erro) => {
      // Se o banco falhar, ainda mostra a página (vazia) com o modal de erro
      console.log(`Erro ao carregar os pacientes: ${erro}`);
      res.status(500).render("pacientes", {
        usuario: req.session.user,
        erro: "Não foi possível carregar os pacientes.",
        ...extras,
      });
    });
}

export function cadastrar(req, res) {
    const nome = req.body.nome;
    const dataNasc = req.body.dataNascimento;
    const cpf = soDigitos(req.body.cpf);
    const rg = req.body.rg;
    const sexo = req.body.sexo;
    const tipoSanguineo = req.body.tipoSanguineo;
    const etnia = req.body.etnia;
    const nomeSocial = req.body.nomeSocial;
    const celular = req.body.celular;
    const email = req.body.email;
    const cep = req.body.cep;
    const logradouro = req.body.logradouro;
    const numero_casa = Number(req.body.numero);
    const bairro = req.body.bairro;
    const cidade = req.body.cidade;
    const estado = req.body.estado;
    const complemento = req.body.complemento;

    const usuario = req.session.user;
    const erro = (status, mensagem) =>
        renderPacientes(req, res, status, { erro: mensagem });

    const idade = calcularIdade(dataNasc);

    if (!nome || !dataNasc || !cpf || !sexo || !tipoSanguineo || !etnia || !celular ||
        !cep || !logradouro || !bairro || !cidade || !estado || Number.isNaN(numero_casa))
        return erro(400, "Preencha todos os campos obrigatórios.");
    if (idade === null || idade > 130) return erro(400, "Data de nascimento inválida.");
    if (cpf.length !== 11) return erro(400, "CPF inválido.");

    Paciente.findOne({ cpf_paciente: cpf, cadastrado_por: usuario.id }).then((existente) => {
        if (existente) return erro(409, "Paciente já cadastrado.");

        return Paciente.create({
            nome_paciente: nome.trim(),
            dataNascimento_paciente: dataNasc,
            idade_paciente: idade,
            tipo_sanguineo: tipoSanguineo,
            rg_paciente: rg,
            cpf_paciente: cpf,
            sexo_biologico: sexo,
            etnia_paciente: etnia,
            nome_social: nomeSocial,
            cadastrado_por: usuario.id,
            contato_paciente: {
                celular_paciente: soDigitos(celular),
                email_paciente: email,
            },
            endereco_paciente: {
                cep: soDigitos(cep),
                logradouro: logradouro,
                numero_casa: numero_casa,
                bairro: bairro,
                cidade: cidade,
                estado: estado,
                complemento: complemento,
            },
        }).then(() => res.redirect("/pacientes"));
    }).catch((e) => {
        console.log(`Erro ao cadastrar paciente: ${e}`);
        if (e.name === "ValidationError") return erro(400, "Dados inválidos.");
        return erro(500, "Erro interno ao cadastrar o paciente.");
    });
}