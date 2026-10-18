import mongoose, { mongo } from "mongoose";

const relatorioSchema = new mongoose.Schema(
  {
    diagnostico_confirmado: Boolean,
    parecer_final: String,
    data_relatorio: Date,
  },
  { _id: false },
);

const exameSchema = new mongoose.Schema(
  {
    medicoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medico",
      required: true,
      index: true,
    },
    pacienteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Paciente",
      required: true,
      index: true,
    },
    data_hora_exame: { type: Date, default: Date.now },
    imagem_exameUrl: String,
    status_exame: {
      type: String,
      enum: ["PENDENTE_TRIAGEM", "CONCLUIDO"],
      default: "PENDENTE_TRIAGEM",
    },
    probabilidade_pnm: Number,
    relatorio: relatorioSchema,
  },
  { timestamps: true },
);

export default mongoose.model("Exame", exameSchema)
