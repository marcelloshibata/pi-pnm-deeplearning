import { Router } from "express";
import { cadastrar, authenticate } from "../controller/MedicoController.js";
import Auth from '../middleware/Auth.js';

const route = Router();

route.get("/login", (req, res) => {
    res.render("login");
});

route.get("/cadastro", (req, res) => {
    res.render("cadastro")
})

route.post("/cadastro", cadastrar)

route.post("/authenticate", authenticate)

route.get("/inicio", Auth, (req, res) => {
    res.send(`Olá, ${req.session.user.nome}, você está logado!`);
})

export default route;