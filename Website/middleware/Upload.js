import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
}).single("imagem");

export default function Upload(req, res, next) {
  upload(req, res, (erro) => {
    if (!erro) {
      return next();
    }
    const msg =
      erro.code === "LIMIT_FILE_SIZE"
        ? "A imagem deve ter até 4 MB"
        : "Não foi posssivel receber a imagem.";
    res.status(400).render("index", { usuario: req.session.user, erro: msg });
  });
}
