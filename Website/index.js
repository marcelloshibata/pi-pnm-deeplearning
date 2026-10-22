import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { connection } from "./config/db.js";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import medicoRoutes from "./routes/MedicoRoutes.js";
import exameRoutes from "./routes/ExameRoutes.js";
import pacienteRoutes from "./routes/PacienteRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

const app = express();

// Necessário para o cookie "secure" funcionar atrás do proxy HTTPS da Vercel
app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Na Vercel os arquivos de public/ são servidos pela CDN; isto vale só para rodar localmente
app.use(express.static(path.join(__dirname, "public")));

const db = connection();

db.then(() => {
  console.log(
    `Banco de dados conectado com sucesso! ${mongoose.connection.name}`,
  );
}).catch((error) => {
  console.log(`Ocorreu um erro ao conectar no banco. Erro: ${error}`);
});

// Garante a conexão com o banco antes das rotas, assim os controllers usam os models direto
app.use(async (req, res, next) => {
  try {
    await connection();
    next();
  } catch (error) {
    next(error);
  }
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // Sessões ficam no MongoDB, pois em serverless a memória não é compartilhada entre instâncias
    store: MongoStore.create({
      clientPromise: db.then((instance) => instance.connection.getClient()),
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 2,
    },
  }),
);

app.use(medicoRoutes)
app.use(exameRoutes)
app.use(pacienteRoutes)

// Na Vercel o app é exportado e a plataforma cuida do servidor
if (!process.env.VERCEL) {
  const port = process.env.PORT || 8080;
  app.listen(port, (error) => {
    if (error) {
      console.log(`Erro ao iniciar: ${error}`);
    } else {
      console.log(`Servidor iniciado em: http://localhost:${port}`);
    }
  });
}

export default app;
