import { Router } from "express";
import { cadastrar, authenticate } from "../controller/MedicoController.js";
import Auth from '../middleware/Auth.js';

const route = Router();

route.get("/", (req, res) => {
    res.redirect("/login");
});

route.get("/login", (req, res) => {
    res.render("login");
});

route.get("/cadastro", (req, res) => {
    res.render("cadastro")
})

route.post("/cadastro", cadastrar)

route.post("/authenticate", authenticate)

route.get("/inicio", Auth, (req, res) => {
    res.render("index", { usuario: req.session.user });
})

export default route;