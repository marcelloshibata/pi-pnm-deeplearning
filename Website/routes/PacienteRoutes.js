import { Router } from "express";
import Auth from "../middleware/Auth.js";
import { buscar, cadastrar, renderPacientes } from "../controller/PacienteController.js";

const route = Router();

route.get("/pacientes", Auth, (req, res) => renderPacientes(req, res));

route.get("/pacientes/buscar", Auth, buscar);

route.post("/pacientes/cadastrar", Auth, cadastrar);

export default route;
