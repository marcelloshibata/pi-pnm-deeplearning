// Gera um cpf válido e diferente a cada vez
function cpfAleatorio() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (base) => {
    const soma = base.reduce((acc, d, i) => acc + d * (base.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  n.push(dv(n));
  n.push(dv(n));
  const s = n.join("");
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

const DEMO_PACIENTE = () => ({
  "paciente-nome": "Maria Aparecida da Silva",
  "paciente-nascimento": "1968-04-12",
  "paciente-cpf": cpfAleatorio(),
  "paciente-rg": "12.345.678-9",
  "paciente-sexo": "Feminino",
  "paciente-sangue": "O+",
  "paciente-etnia": "Parda",
  "paciente-celular": "(11) 98765-4321",
  "paciente-email": "maria.silva@exemplo.com",
  "paciente-cep": "01310-100",
  "paciente-logradouro": "Avenida Paulista",
  "paciente-numero": "1578",
  "paciente-bairro": "Bela Vista",
  "paciente-cidade": "São Paulo",
  "paciente-uf": "SP",
});

function preencher(modal, dados) {
  for (const [id, valor] of Object.entries(dados)) {
    const campo = modal.querySelector("#" + id);
    if (!campo) continue;
    campo.value = valor;

    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey && e.shiftKey && e.key.toLocaleLowerCase() === "c")) return;

  const modal = document.getElementById("patient-modal");
  if (!modal?.open) return;

  e.preventDefault();
  preencher(modal, DEMO_PACIENTE());
})
