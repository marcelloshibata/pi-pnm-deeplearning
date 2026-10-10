import "dotenv/config";
import mongoose from "mongoose";
import { connection } from "./config/db.js";
import express from "express";
import session from "express-session";
import medicoRoutes from "./routes/MedicoRoutes.js";

const app = express();

app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 2,
    },
  }),
);

connection()
  .then(() => {
    console.log(
      `Banco de dados conectado com sucesso! ${mongoose.connection.name}`,
    );
  })
  .catch((error) => {
    console.log(`Ocorreu um erro ao conectar no banco. Erro: ${error}`);
  });

app.use(medicoRoutes)

const port = 8080;
app.listen(port, (error) => {
  if (error) {
    console.log(`Erro ao iniciar: ${error}`);
  } else {
    console.log(`Servidor iniciado em: http://localhost:${port}`);
  }
});
