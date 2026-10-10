import express from "express";
import nodemon from "nodemon";

const app = express();

app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.use(express.static("public"));

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