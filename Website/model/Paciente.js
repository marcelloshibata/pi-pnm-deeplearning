import mongoose from "mongoose";

const pacienteSchema = new mongoose.Schema(
  {
    nome_paciente: {
      type: String,
      required: true,
    },
    idade_paciente: Number,
    dataNascimento_paciente: Date,
    tipo_sanguineo: String,
    etnia_paciente: String,
    sexo_biologico: String,
    rg_paciente: String,
    cpf_paciente: String,
    nome_social: String,
    cadastrado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medico",
      required: true,
    },
    contato_paciente: {
      celular_paciente: String,
      email_paciente: String,
    },
    endereco_paciente: {
      cep: String,
      logradouro: String,
      numero_casa: Number,
      bairro: String,
      cidade: String,
      estado: String,
      complemento: String,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Paciente", pacienteSchema);