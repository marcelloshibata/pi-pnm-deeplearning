import mongoose from "mongoose";

export const connection = () => {
  return mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("MongoDB conectado!");
    })
    .catch((error) => {
      console.log(`Erro ao conectar o banco de dados. Erro: ${error}`);
      throw error;
    });
};
