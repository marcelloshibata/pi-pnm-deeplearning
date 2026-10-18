import mongoose from "mongoose";

const pacienteSchema = new mongoose.Schema(
  {
    nome_paciente: {
      type: String,
      required: true,
    },
    idade_paciente: Number,
    tipo_sanguineo: String,
    etnia_paciente: String,
    sexo_biologico: String,
    rg_paciente: String,
    cpf_paciente: String,
    cadastrado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medico",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Paciente", pacienteSchema);