import Exame from "../model/Exame.js";
import { pipeline } from "node:stream/promises";
import { connection } from "../config/db.js";
import Paciente from "../model/Paciente.js";
import { salvarImagem, removerImagem, abrirImagem } from "../config/gridfs.js";

const soDigitos = (valor = "") => valor.replace(/\D/g, "");

// Confere os primeiros bytes do arquivo, pois o mimetype enviado pelo navegador pode ser falso
const ehPng = (b) =>
  b.length > 8 &&
  b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
const ehJpeg = (b) =>
  b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

const error = (req, res, status, erro) =>
  res.status(status).render("index", { usuario: req.session.user, erro });

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

  const buffer = req.file.buffer;
  const contentType = ehPng(buffer)
    ? "image/png"
    : ehJpeg(buffer)
      ? "image/jpeg"
      : null;

  if (!contentType)
    return error(req, res, 400, "A imagem deve ser PNG ou JPG.");

  let pacienteId = null;
  let imagemId = null;

  connection().then(() => {
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

    return salvarImagem(buffer, {
        nome: req.file.originalname,
        contentType: contentType,
        metadata: { pacienteId: pacienteId, medicoId: medicoId },
    })
  }).then(id => {
    imagemId = id;

    return Exame.create({
        medicoId: medicoId,
        pacienteId: pacienteId,
        data_hora_exame: new Date(`${dataExame}T12:00:00`),
        imagem_exame: {
            arquivoId: imagemId,
            contentType: contentType,
            nomeOriginal: req.file.originalname
        },
    })
  }).then(() => {
    res.redirect("/inicio");
  }).catch(erro => {
    console.log(`Erro ao cadastrar exame: ${erro}`);

    // Desfaz o que já foi criado, para não sobrar imagem ou paciente sem exame
    const limpezas = [];
    if (imagemId) limpezas.push(removerImagem(imagemId));
    if (pacienteId) limpezas.push(Paciente.findByIdAndDelete(pacienteId));

    return Promise.allSettled(limpezas).then(() => {
         if (erro.code === 11000) {
            return error(req, res, 409, "Já existe um paciente cadastrado com este CPF.");
        }
        if (erro.name === "ValidationError") {
            return error(req, res, 400, "Dados inválidos.");
        }
        return error(req, res, 500, "Erro interno ao cadastrar o exame.");
    })
  })
}
