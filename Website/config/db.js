import mongoose from "mongoose";

// Na Vercel cada instância da função reaproveita o módulo carregado,
// então guardamos a promise para não abrir uma conexão nova a cada requisição.
let cached = null;

export const connection = () => {
  if (!cached) {
    cached = mongoose
      .connect(process.env.MONGO_URI)
      .then((instance) => {
        console.log("MongoDB conectado!");
        return instance;
      })
      .catch((error) => {
        // Limpa o cache para a próxima requisição tentar conectar de novo
        cached = null;
        console.log(`Erro ao conectar o banco de dados. Erro: ${error}`);
        throw error;
      });
  }
  return cached;
};
