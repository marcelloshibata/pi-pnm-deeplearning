import mongoose from "mongoose";

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
    tipo_exame: { type: String, default: "RX de tórax" },
    data_hora_exame: { type: Date, default: Date.now },
    imagem_exame: {
      arquivoId: { type: mongoose.Schema.Types.ObjectId, required: true }, // id do GridFs
      contentType: { type: String, required: true },
      nomeOriginal: String,
    },
    status_exame: {
      type: String,
      enum: ["PENDENTE_TRIAGEM", "CONCLUIDO"],
      default: "PENDENTE_TRIAGEM",
    },
    probabilidade_pnm: Number,
    relatorio: {
      diagnostico_confirmado: Boolean,
      parecer_final: String,
      data_relatorio: Date
    },
  },
  { timestamps: true },
);

export default mongoose.model("Exame", exameSchema)
