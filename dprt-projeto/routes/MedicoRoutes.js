import { Router } from "express";
import { cadastrar, authenticate, perfil, atualizarFoto, mostrarFoto, logout } from "../controller/MedicoController.js";
import { renderInicio } from "../controller/ExameController.js";
import Auth from '../middleware/Auth.js';
import uploadFoto from "../middleware/UploadFoto.js";

const route = Router();

// Página inicial pública de apresentação da plataforma
route.get("/", (req, res) => {
    res.render("home");
});

route.get("/login", (req, res) => {
    res.render("login");
});

route.get("/cadastro", (req, res) => {
    res.render("cadastro")
})

route.post("/cadastro", cadastrar)

route.post("/authenticate", authenticate)

route.get("/exames", Auth, (req, res) => {
    renderInicio(req, res);
})

route.get("/perfil", Auth, perfil);

route.get("/perfil/foto", Auth, mostrarFoto);

route.post("/perfil/foto", Auth, uploadFoto, atualizarFoto);

route.get("/logout", logout);


export default route;