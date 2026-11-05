// Animações da página inicial: digitação do título da hero e aparecimento suave na rolagem.
(() => {
  const root = document.documentElement;
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Digitação do título ---------- */
  // Tempo de digitação de cada parte do título (as partes são digitadas uma após a outra)
  const DURACAO_POR_GRUPO = 2000;
  const titulo = document.querySelector('[data-typing]');

  function iniciarDigitacao() {
    if (!titulo) return;

    if (reduzirMovimento) {
      titulo.classList.add('is-typing-ready');
      return;
    }

    titulo.setAttribute('aria-label', titulo.textContent.replace(/\s+/g, ' ').trim());

    // Os grupos são digitados na ordem do HTML, cada um em DURACAO_POR_GRUPO;
    // as linhas de um mesmo grupo são digitadas em sequência dentro desse tempo
    const grupos = new Map();
    titulo.querySelectorAll('[data-typing-group]').forEach((linha) => {
      const texto = linha.textContent.trim();
      const digitado = document.createElement('span');
      const restante = document.createElement('span');
      restante.className = 'home-typing__ghost';
      restante.textContent = texto;
      linha.setAttribute('aria-hidden', 'true');
      linha.replaceChildren(digitado, restante);

      const id = linha.dataset.typingGroup;
      if (!grupos.has(id)) grupos.set(id, { linhas: [], total: 0 });
      const grupo = grupos.get(id);
      grupo.linhas.push({ elemento: linha, texto, digitado, restante });
      grupo.total += texto.length;
    });

    const listaGrupos = [...grupos.values()];
    const duracaoTotal = DURACAO_POR_GRUPO * listaGrupos.length;

    // Um único cursor acompanha o grupo que está sendo digitado
    const cursor = document.createElement('span');
    cursor.className = 'home-typing__caret';

    titulo.classList.add('is-typing-ready');

    function desenhar(decorrido) {
      const indiceAtivo = Math.min(Math.floor(decorrido / DURACAO_POR_GRUPO), listaGrupos.length - 1);

      listaGrupos.forEach((grupo, indice) => {
        const progresso = Math.min(Math.max((decorrido - indice * DURACAO_POR_GRUPO) / DURACAO_POR_GRUPO, 0), 1);
        let restantes = Math.ceil(grupo.total * progresso);
        let cursorPosicionado = indice !== indiceAtivo;

        grupo.linhas.forEach((linha) => {
          const quantidade = Math.max(0, Math.min(linha.texto.length, restantes));
          restantes -= quantidade;
          linha.digitado.textContent = linha.texto.slice(0, quantidade);
          linha.restante.textContent = linha.texto.slice(quantidade);

          // O cursor fica na linha que está sendo digitada (ou na última, ao terminar)
          const linhaAtiva = quantidade < linha.texto.length || linha === grupo.linhas.at(-1);
          if (!cursorPosicionado && linhaAtiva) {
            linha.digitado.after(cursor);
            cursorPosicionado = true;
          }
        });
      });
    }

    let inicio = null;
    function passo(agora) {
      if (inicio === null) inicio = agora;
      const decorrido = Math.min(agora - inicio, duracaoTotal);
      desenhar(decorrido);

      if (decorrido < duracaoTotal) {
        requestAnimationFrame(passo);
      } else {
        titulo.classList.add('is-typed');
      }
    }

    desenhar(0);
    requestAnimationFrame(passo);
  }

  /* ---------- Aparecimento suave na rolagem ---------- */
  function iniciarRevelacao() {
    const elementos = document.querySelectorAll('[data-reveal]');

    if (reduzirMovimento || !('IntersectionObserver' in window)) {
      elementos.forEach((elemento) => elemento.classList.add('is-revealed'));
      return;
    }

    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('is-revealed');
        observador.unobserve(entrada.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    elementos.forEach((elemento) => observador.observe(elemento));
  }

  iniciarDigitacao();
  iniciarRevelacao();
  root.classList.add('home-motion-ready');
})();
