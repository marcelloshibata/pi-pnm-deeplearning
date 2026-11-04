import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const ESCALA = 595.28 / 794;
const px = (valor) => valor * ESCALA;

const AZUL = "#7ED0EE";
const AZUL_OPACIDADE = 0.8;
const FUNDO_ROTULO = "#EAF4FA";
const BORDA = "#B8D0DF";
const TEXTO = "#1F2733";
const LOGO = "#64B9F6";

const ESQUERDA = 40;
const LARGURA = 714;
const TOPO_RODAPE = 1067;
const ESPACO_SECAO = 20;
const LIMITE_CONTEUDO = TOPO_RODAPE - ESPACO_SECAO;

const ALTURA_TRECHO = 142;
const LARGURA_CATEGORIA = 150;
const PADDING_CONTEUDO = 18;
const LINHA_CONTEUDO = 12 * 1.5;

const fonte = (arquivo) =>
  fileURLToPath(new URL(`../assets/fonts/${arquivo}`, import.meta.url));
const FONTES = {
  regular: fonte("DMSans-Regular.ttf"),
  semibold: fonte("DMSans-SemiBold.ttf"),
  bold: fonte("DMSans-Bold.ttf"),
};

const CAMINHOS_LOGO = [
  ...readFileSync(
    fileURLToPath(new URL("../public/imgs/lung-icon-blue.svg", import.meta.url)),
    "utf8",
  ).matchAll(/ d="([^"]+)"/g),
].map((m) => m[1]);

function retangulo(doc, x, y, w, h, cor, opacidade = 1) {
  doc.rect(px(x), px(y), px(w), px(h)).fillColor(cor, opacidade).fill();
}

function linhaH(doc, x1, x2, y) {
  doc.moveTo(px(x1), px(y)).lineTo(px(x2), px(y))
    .lineWidth(px(1)).strokeColor(BORDA, 1).stroke();
}
function linhaV(doc, x, y1, y2) {
  doc.moveTo(px(x), px(y1)).lineTo(px(x), px(y2))
    .lineWidth(px(1)).strokeColor(BORDA, 1).stroke();
}

function configurarTexto(doc, { tamanho, peso = "regular", entrelinha }) {
  doc.font(peso).fontSize(px(tamanho));
  const natural = doc.currentLineHeight();
  const lineGap = entrelinha ? px(tamanho * entrelinha) - natural : 0;
  return { natural, lineGap };
}

function escrever(doc, texto, { x, y, largura, tamanho, peso, entrelinha, cor = TEXTO, opacidade = 1, ...opcoes }) {
  const { lineGap } = configurarTexto(doc, { tamanho, peso, entrelinha });
  doc.fillColor(cor, opacidade);
  doc.text(texto, px(x), px(y) + lineGap / 2, {
    width: largura && px(largura),
    lineGap,
    ...opcoes,
  });
}

function contarLinhas(doc, texto, { largura, tamanho, peso, entrelinha }) {
  const { natural, lineGap } = configurarTexto(doc, { tamanho, peso, entrelinha });
  const altura = doc.heightOfString(texto, { width: px(largura), lineGap });
  return Math.round(altura / (natural + lineGap));
}

function cabecalho(doc) {
  retangulo(doc, ESQUERDA, 40, LARGURA, 106, AZUL, AZUL_OPACIDADE);
  escrever(doc, "Relatório médico", { x: 62, y: 67, tamanho: 25, peso: "bold", cor: "#FFFFFF", lineBreak: false });
  escrever(doc, "Parecer final da consulta", { x: 62, y: 105, tamanho: 11, cor: "#FFFFFF", lineBreak: false });

  doc.roundedRect(px(640), px(75), px(36), px(36), px(8)).fillColor("#FFFFFF", 1).fill();
  doc.save();
  doc.translate(px(640 + 1.5 + 6.613), px(75 + 1.5 + 4.059)).scale(ESCALA);
  for (const caminho of CAMINHOS_LOGO) doc.path(caminho).fillColor(LOGO, 1).fill();
  doc.restore();
  escrever(doc, "DPRT", {
    x: 688, y: 79, tamanho: 18, peso: "semibold", entrelinha: 28 / 18,
    cor: "#FFFFFF", characterSpacing: px(-0.45), lineBreak: false,
  });

  retangulo(doc, ESQUERDA, 146, LARGURA, 31, FUNDO_ROTULO);
  escrever(doc, "DOCUMENTO CLÍNICO", {
    x: 52, y: 155, tamanho: 10, peso: "semibold", cor: AZUL, opacidade: AZUL_OPACIDADE, lineBreak: false,
  });

  return 177 + ESPACO_SECAO;
}

function faixaSecao(doc, titulo, y) {
  retangulo(doc, ESQUERDA, y, LARGURA, 31, AZUL, AZUL_OPACIDADE);
  escrever(doc, titulo, { x: 52, y: y + 7, tamanho: 13, peso: "bold", cor: "#FFFFFF", lineBreak: false });
  return y + 31;
}

function dado(doc, { rotulo, valor, x, y, largura }) {
  const ALTURA = 42;
  retangulo(doc, x, y, 126, ALTURA, FUNDO_ROTULO);
  linhaV(doc, x + 0.5, y, y + ALTURA);
  linhaV(doc, x + 125.5, y, y + ALTURA);
  linhaV(doc, x + largura - 0.5, y, y + ALTURA);
  linhaH(doc, x, x + largura, y + ALTURA - 0.5);

  escrever(doc, rotulo, {
    x: x + 10, y: y + (ALTURA - 11 * 1.3) / 2, largura: 106,
    tamanho: 11, peso: "semibold", entrelinha: 1.3, lineBreak: false, ellipsis: true,
  });
  escrever(doc, valor || "—", {
    x: x + 136, y: y + (ALTURA - 12 * 1.4) / 2, largura: largura - 146,
    tamanho: 12, entrelinha: 1.4, lineBreak: false, ellipsis: true,
  });
}

function trecho(doc, { titulo, texto, y, altura }) {
  const x = ESQUERDA;
  retangulo(doc, x, y, LARGURA_CATEGORIA, altura, FUNDO_ROTULO);
  linhaV(doc, x + 0.5, y, y + altura);
  linhaV(doc, x + LARGURA_CATEGORIA - 0.5, y, y + altura);
  linhaV(doc, x + LARGURA - 0.5, y, y + altura);
  linhaH(doc, x, x + LARGURA, y + altura - 0.5);

  escrever(doc, titulo, {
    x: x + 14, y: y + 14, largura: LARGURA_CATEGORIA - 28, tamanho: 12, peso: "bold", entrelinha: 1.4,
  });
  escrever(doc, texto, {
    x: x + LARGURA_CATEGORIA + PADDING_CONTEUDO, y: y + PADDING_CONTEUDO,
    largura: LARGURA - LARGURA_CATEGORIA - PADDING_CONTEUDO * 2, tamanho: 12, entrelinha: 1.5,
  });
}

const MEDIDA_CONTEUDO = {
  largura: LARGURA - LARGURA_CATEGORIA - PADDING_CONTEUDO * 2,
  tamanho: 12,
  entrelinha: 1.5,
};

function dividirTexto(doc, texto, maxLinhas) {
  const partes = texto.split(/(\s+)/);
  let min = 1;
  let max = partes.length;
  while (min < max) {
    const meio = Math.ceil((min + max) / 2);
    const linhas = contarLinhas(doc, partes.slice(0, meio).join("").trimEnd(), MEDIDA_CONTEUDO);
    if (linhas <= maxLinhas) min = meio;
    else max = meio - 1;
  }
  return [
    partes.slice(0, min).join("").trimEnd(),
    partes.slice(min).join("").replace(/^\s+/, ""),
  ];
}

function rodape(doc, pagina, total) {
  linhaH(doc, ESQUERDA, ESQUERDA + LARGURA, TOPO_RODAPE + 0.5);
  escrever(doc, "Hospital • Acesso restrito à equipe assistencial", {
    x: ESQUERDA, y: TOPO_RODAPE + 11, tamanho: 10, cor: "#000000", lineBreak: false,
  });
  escrever(doc, `Página ${pagina} de ${total}`, {
    x: ESQUERDA, y: TOPO_RODAPE + 11, largura: LARGURA, tamanho: 10, peso: "bold",
    cor: AZUL, opacidade: AZUL_OPACIDADE, align: "right", lineBreak: false,
  });
}

export function gerarRelatorioPdf(saida, { paciente, nascimento, cpf, dataExame, dataRelatorio, parecer, diagnostico }) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    bufferPages: true,
    info: { Title: `Relatório médico — ${paciente || "Paciente"}`, Author: "DPRT" },
  });
  for (const [nome, arquivo] of Object.entries(FONTES)) doc.registerFont(nome, arquivo);
  doc.pipe(saida);

  let y = faixaSecao(doc, "Identificação do paciente e do exame", cabecalho(doc));
  dado(doc, { rotulo: "Nome completo", valor: paciente, x: ESQUERDA, y, largura: LARGURA });
  y += 42;
  dado(doc, { rotulo: "Nascimento", valor: nascimento, x: ESQUERDA, y, largura: LARGURA / 2 });
  dado(doc, { rotulo: "CPF", valor: cpf, x: ESQUERDA + LARGURA / 2, y, largura: LARGURA / 2 });
  y += 42;
  dado(doc, { rotulo: "Exame vinculado", valor: `RX de tórax • ${dataExame}`, x: ESQUERDA, y, largura: LARGURA });
  y += 42;
  dado(doc, { rotulo: "Data do relatório", valor: dataRelatorio, x: ESQUERDA, y, largura: LARGURA });
  y += 42 + ESPACO_SECAO;

  const TITULO_PARECER = "Parecer final da consulta";
  y = faixaSecao(doc, TITULO_PARECER, y);

  const novaPagina = () => {
    doc.addPage();
    return faixaSecao(doc, `${TITULO_PARECER} (continuação)`, cabecalho(doc));
  };

  const trechos = [
    { titulo: "Parecer final", texto: parecer },
    { titulo: "Conclusão diagnóstica", texto: diagnostico ? "Positivo para pneumonia." : "Negativo para pneumonia." },
  ];

  for (const { titulo, texto } of trechos) {
    let resto = texto.trim();
    let continuacao = false;

    while (resto) {
      if (LIMITE_CONTEUDO - y < ALTURA_TRECHO) y = novaPagina();

      const tituloAtual = continuacao ? `${titulo} (continuação)` : titulo;
      const linhas = contarLinhas(doc, resto, MEDIDA_CONTEUDO);
      const altura = Math.max(ALTURA_TRECHO, PADDING_CONTEUDO * 2 + linhas * LINHA_CONTEUDO);

      if (y + altura <= LIMITE_CONTEUDO) {
        trecho(doc, { titulo: tituloAtual, texto: resto, y, altura });
        y += altura;
        resto = "";
      } else {
        const disponivel = LIMITE_CONTEUDO - y;
        const maxLinhas = Math.floor((disponivel - PADDING_CONTEUDO * 2) / LINHA_CONTEUDO);
        const [parte, sobra] = dividirTexto(doc, resto, maxLinhas);
        trecho(doc, { titulo: tituloAtual, texto: parte, y, altura: disponivel });
        y = LIMITE_CONTEUDO;
        resto = sobra;
        continuacao = true;
      }
    }
  }

  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    rodape(doc, i - start + 1, count);
  }
  doc.end();
}
