function Auth(req, res, next) {
    // Se a sessão estiver ativa e o usuário existir, continua
    if (req.session.user) {
        return next();
    } else {
        res.render("login")
    }
}

export default Auth;