import mongoose from "mongoose";

const medicoSchema = new mongoose.Schema(
  {
    nome_medico: { type: String, required: true, trim: true },
    email_medico: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    crm_medico: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    senha_hash: {
      type: String,
      required: true,
      select: false,
    },
    especialidade_medico: {
      type: String,
      trim: true,
    },
    hospital: {
      nome: { type: String, required: true, trim: true },
    },
  },
  { timestamps: true },
);

export default mongoose.model("Medico", medicoSchema);