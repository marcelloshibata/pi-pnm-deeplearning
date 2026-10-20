import { Router } from "express";
import Auth from "../middleware/Auth.js";

const route = Router();

route.get("/pacientes", Auth, (req, res) => {
  res.render("pacientes");
});

export default route;
