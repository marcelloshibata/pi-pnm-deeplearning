import { Router } from "express";
import { cadastrar, imagem, analisar } from "../controller/ExameController.js";
import Auth from "../middleware/Auth.js";
import Upload from "../middleware/Upload.js";

const route = Router();

// O formulário é multipart/form-data, então o multer (Upload) precisa preencher req.body e req.file
route.post("/exames/cadastrar", Auth, Upload, cadastrar);

route.get("/exames/:id/imagem", Auth, imagem);

// Recebe os dados do modal de visualização do exame (formulário urlencoded)
route.post("/exames/analisar", Auth, analisar);

export default route;
