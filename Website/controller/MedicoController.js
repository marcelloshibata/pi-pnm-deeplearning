import bcrypt from "bcryptjs";
import Medico from "../model/Medico.js";

const normalizarCRM = (valor) => valor.toUpperCase().replace(/\s+/g, "");

export function cadastrar(req, res) {
    const nome_medico = req.body.nome;
    const email_medico = req.body.email;
    const crm_medico = req.body.crm;
    const instituicao = req.body.instituicao;
    const especialidade = req.body.especialidade;
    const senha = req.body.senha;
    const confirmar = req.body.confirmarSenha;

    if (!nome_medico || !email_medico || !crm_medico || !instituicao || !senha || !confirmar || !especialidade) {
        return res.status(400).render("cadastro", { erro: "Preencha todos os campos." });
    }

    if (senha.length < 8) {
        return res.status(400).render("cadastro", { erro: "A senha deve possuir pelo menos 8 caracteres." });
    }

    if (senha !== confirmar) {
        return res.status(400).render("cadastro", { erro: "As senhas não conferem." });
    }

    const emailLimpo = email_medico.toLowerCase().trim();
    const crmLimpo = normalizarCRM(crm_medico);

    Medico.findOne({
        $or: [{ email_medico: emailLimpo }, { crm_medico: crmLimpo }],
    }).then((existente) => {
        if (existente) {
            return res.status(409).render("cadastro", {
                erro: "E-mail ou CRM já cadastrado."
            })
        }

        return bcrypt.hash(senha, 10).then((senha_hash) => {
            return Medico.create({
                nome_medico: nome_medico,
                email_medico: emailLimpo,
                crm_medico: crmLimpo,
                senha_hash: senha_hash,
                especialidade_medico: especialidade,
                hospital: { nome: instituicao }
            })
        }).then(() => {
            res.status(201).render("cadastro", { sucesso: "Você foi cadastrado com sucesso." });
        })
    }).catch(error => {
        console.log(`Ocorreu um erro ao cadastrar o usuário. Erro ${error}`);
        res.status(500).render("cadastro", { erro: "Erro interno ao cadastrar. Tente novamente." });
    })
}

export function authenticate(req, res) {
    const identificador = req.body.email?.trim();
    const senha = req.body.senha || "";

    if (!identificador || !senha) {
        return res.render("login", { erro: "Informe e-mail/CRM e senha." });
    }

    Medico.findOne({
        $or: [
            { email_medico: identificador.toLowerCase() },
            { crm_medico: normalizarCRM(identificador) },
        ]
    }).select("+senha_hash").then((medico) => {
        // Se não tiver um médico, já encerra
        if (!medico) return false;

        // Compara a senha, se bate, devolve, se não, devolve false.
        return bcrypt.compare(senha, medico.senha_hash).then((senhaValida) => (senhaValida ? medico : false));
    }).then((medico) => {
        // Pega o false retornado caso a senha não seja válida, e trata.
        if (!medico) {
            return res.status(401).render("login", { erro: "Usuário ou senha inválidos." } );
        }

        return new Promise((resolve, reject) => {
            // Descarta qualquer sessão que tenha sido salva como cookie do navegador e manda um cookie novo.
            req.session.regenerate((erro) => (erro ? reject(erro) : resolve() )); // Se der erro, o resolve() taca o erro pro catch
        }).then(() => {
            // Aqui gravamos o médico na nova sessão
            req.session.user = {
                id: medico._id.toString(),
                nome: medico.nome_medico,
            };

            // Se tudo deu certo, redireciona para o inicio
            res.redirect("/inicio");
        })
    }).catch(error => {
        console.log(`Erro na autenticação: ${error}`);
        res.status(500).render("login", { erro: "Erro interno. Tente novamente" });
    });
}
