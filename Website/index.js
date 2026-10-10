import "dotenv/config";
import mongoose from "mongoose";
import { connection } from "./config/db.js";
import express from "express";

const app = express();

app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.use(express.static("public"));

connection()
  .then(() => {
    console.log(
      `Banco de dados conectado com sucesso! ${mongoose.connection.name}`,
    );
  })
  .catch((error) => {
    console.log(`Ocorreu um erro ao conectar no banco. Erro: ${error}`);
  });

app.get("/", (req, res) => {
  res.render("login");
});

app.get("/cadastro", (req, res) => {
  res.render("cadastro");
});

const port = 8080;
app.listen(port, (error) => {
  if (error) {
    console.log(`Erro ao iniciar: ${error}`);
  } else {
    console.log(`Servidor iniciado em: http://localhost:${port}`);
  }
});
