import multer from "multer";
import { renderPerfil } from "../controller/MedicoController.js";

const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp"];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (TIPOS_ACEITOS.includes(file.mimetype)) return cb(null, true);
        cb(Object.assign(new Error("Tipo de arquivo inválido"), { code: "TIPO_INVALIDO" }));
    },
}).single("foto");

export default function uploadFoto(req, res, next) {
    upload(req, res, (erro) => {
        if (!erro) return next();

        const mensagens = {
            LIMIT_FILE_SIZE: "A foto deve ter até 2 MB.",
            TIPO_INVALIDO: "Formato não suportado. Envie uma imagem PNG, JPG ou WebP.",
        };
        const msg = mensagens[erro.code] || "Não foi possível receber a imagem.";

        renderPerfil(req, res, 400, { erro: msg }).catch(() => res.sendStatus(500));
    });
}
