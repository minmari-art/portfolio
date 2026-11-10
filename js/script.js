/* Carrosséis (empresas e feedbacks)
   - Empresas e feedbacks no desktop (acima de 1000px): deslizam livremente, sem parar
     (o mouse em cima freia; as setas empurram o carrossel um card).
   - Feedbacks em tablet e celular: um card por vez, sempre centralizado e colado no vizinho. */
function createMarquee(root, opts = {}) {
  const track = root.querySelector('.marquee__track');
  const originals = [...track.children];
  const speed = Number(root.dataset.speed) || 40;      // px por segundo
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let setW = 0, x = 0, pending = 0, paused = false, last = performance.now();
  let rate = 1;   // 1 = velocidade normal, 0 = parado; muda aos poucos para frear/acelerar com suavidade

  const wantsSnap = root.classList.contains('marquee--works');
  const mqSnap = matchMedia('(max-width: 1000px)');
  const snapOn = () => wantsSnap && mqSnap.matches;
  let idx = 0, wasSnap = false;

  // Modo um-card-por-vez: largura do card e espaço entre cards. O card ocupa quase a largura da tela e o
  // próximo começa exatamente na borda (sem vazio no meio e sem aparecer pedaço do vizinho).
  // Fora desse modo as variáveis são removidas e valem os tamanhos normais do CSS.
  function size() {
    if (!wantsSnap) return;
    const vars = ['--fb-w', '--fb-gap', '--fb-view'];
    if (!snapOn()) { vars.forEach(v => root.style.removeProperty(v)); return; }
    const rootW = root.clientWidth;
    if (!rootW) return;
    const set = (k, v) => { if (root.style.getPropertyValue(k) !== v) root.style.setProperty(k, v); };
    const m = Math.min(32, Math.max(18, rootW * 0.03));        // margem lateral do card
    const cardW = Math.floor(rootW - 2 * m);
    set('--fb-w', cardW + 'px');
    set('--fb-gap', ((rootW - cardW) / 2).toFixed(2) + 'px');   // gap = margem: o vizinho começa na borda da tela
  }

  // posição (x) em que o card i fica exatamente no centro da área visível
  function cardPos(i) {
    const n = originals.length;
    const el = originals[((i % n) + n) % n];
    const left = el.offsetLeft - originals[0].offsetLeft + Math.floor(i / n) * setW;
    return left - (root.offsetWidth - el.offsetWidth) / 2;
  }

  function go(dir) { idx += dir; }

  function build() {
    size();
    track.querySelectorAll('[data-clone]').forEach(n => n.remove());
    const first = originals[0], lastEl = originals[originals.length - 1];
    const mr = parseFloat(getComputedStyle(lastEl).marginRight) || 0;
    setW = lastEl.offsetLeft + lastEl.offsetWidth + mr - first.offsetLeft;
    if (!setW) return;
    const copies = Math.ceil(root.offsetWidth / setW) + 1;
    for (let c = 0; c < copies; c++) {
      originals.forEach(el => {
        const k = el.cloneNode(true);
        k.setAttribute('data-clone', '');
        k.setAttribute('aria-hidden', 'true');
        k.querySelectorAll('a,button').forEach(a => a.tabIndex = -1);
        track.appendChild(k);
      });
    }
    if (snapOn()) x = cardPos(idx);   // depois de recalcular (ex.: girar o celular), mantém o card centralizado
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (snapOn() && setW) {
      if (!wasSnap) { wasSnap = true; x = cardPos(idx); }                 // entrou no modo celular: centraliza já
      x += (cardPos(idx) - x) * Math.min(1, dt * 6);                      // desliza suave até o centro do próximo card
      const shown = ((x % setW) + setW) % setW;
      track.style.transform = `translate3d(${-shown}px,0,0)`;
      requestAnimationFrame(frame);
      return;
    }
    wasSnap = false;
    rate += ((paused || reduce ? 0 : 1) - rate) * Math.min(1, dt * 4);   // desacelera ao passar o mouse e retoma devagar ao sair
    if (rate < 0.001) rate = 0;
    x += speed * rate * dt;
    const step = pending * 0.12; pending -= step; x += step;
    if (Math.abs(pending) < 0.1) pending = 0;
    if (setW) x = ((x % setW) + setW) % setW;
    track.style.transform = `translate3d(${-x}px,0,0)`;
    requestAnimationFrame(frame);
  }

  build();
  addEventListener('load', build);
  new ResizeObserver(build).observe(wantsSnap ? root.parentElement : root);
  mqSnap.addEventListener('change', build);
  requestAnimationFrame(frame);

  // no celular o "mouse" simulado pelo toque deixaria o carrossel preso; por isso só vale fora do modo celular
  root.addEventListener('mouseenter', () => { if (!snapOn()) paused = true; });
  root.addEventListener('mouseleave', () => { if (!snapOn()) paused = false; });
  root.addEventListener('focusin', () => { if (!snapOn()) paused = true; });
  root.addEventListener('focusout', () => { if (!snapOn()) paused = false; });
  let touchX = null;
  root.addEventListener('touchstart', e => { paused = true; touchX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', e => {
    if (snapOn() && touchX !== null) {                     // arrastar para o lado troca de card
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    }
    touchX = null;
    setTimeout(() => paused = false, 1200);
  }, { passive: true });

  // passa sozinho de um card para o outro (só no modo celular)
  if (wantsSnap && !reduce) {
    setInterval(() => { if (snapOn() && !paused) go(1); }, 4000);
  }

  return {
    nudge(dir) {
      if (snapOn()) { go(dir); return; }
      const card = originals[0];
      const mr = parseFloat(getComputedStyle(card).marginRight) || 0;
      pending += dir * (card.offsetWidth + mr);
    }
  };
}

document.querySelectorAll('.marquee').forEach(el => {
  const m = createMarquee(el);
  if (el.classList.contains('marquee--works')) {
    document.getElementById('next')?.addEventListener('click', () => m.nudge(1));
    document.getElementById('prev')?.addEventListener('click', () => m.nudge(-1));
  }
});

/* Câmera do topo (tablet e celular): o PNG tem asteriscos de um lado só, então o desenho nunca fica
   exatamente no meio da imagem. Aqui medimos onde está o CORPO da câmera (pixels escuros, ignorando os
   asteriscos coloridos) e deslocamos a imagem para esse corpo ficar no centro da tela, em qualquer largura.
   Precisa de servidor (Live Server); em file:// o CSS usa o valor reserva (--cam-dx). */
(function () {
  const cam = document.querySelector('.hero__camera');
  if (!cam) return;
  let frac;   // posição do centro do corpo da câmera, de 0 a 1 (0.5 = centro da imagem)

  function measure() {
    try {
      const k = Math.min(1, 400 / Math.max(cam.naturalWidth, cam.naturalHeight));
      const W = Math.max(1, Math.round(cam.naturalWidth * k)), H = Math.max(1, Math.round(cam.naturalHeight * k));
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(cam, 0, 0, W, H);
      const d = ctx.getImageData(0, 0, W, H).data;
      const need = Math.max(3, H * 0.03);
      let x0 = -1, x1 = -1;
      for (let x = 0; x < W; x++) {
        let n = 0;
        for (let y = 0; y < H; y++) {
          const i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
          if (d[i + 3] > 200 && r < 110 && g < 110 && b < 110 && Math.max(r, g, b) - Math.min(r, g, b) < 40) n++;
        }
        if (n >= need) { if (x0 < 0) x0 = x; x1 = x; }
      }
      return x0 >= 0 ? (x0 + x1 + 1) / 2 / W : null;
    } catch (e) { return null; }   // file:// ou imagem bloqueada
  }

  function apply() {
    if (!cam.complete || !cam.naturalWidth) return;
    if (frac === undefined) frac = measure();
    if (frac == null) return;
    cam.style.setProperty('--cam-dx', ((0.5 - frac) * cam.offsetWidth).toFixed(1) + 'px');
  }

  if (cam.complete) apply(); else cam.addEventListener('load', apply, { once: true });
  addEventListener('load', apply);
  new ResizeObserver(apply).observe(cam);
})();


/* Destaque do item ativo do menu ao rolar */
/* Só links internos (#...) entram no mapa: o link do WhatsApp (e os links completos do site no ar)
   não são seletores válidos e quebravam o script inteiro nesta linha (por isso o menu lateral nunca aparecia).
   Se o menu só tiver links completos, não há destaque por rolagem e nada é registrado. */
const links = [...document.querySelectorAll('.nav a')];
const map = links.filter(a => (a.getAttribute('href') || '').startsWith('#')).map(a => [a, document.querySelector(a.getAttribute('href'))]);
if (map.length) addEventListener('scroll', () => {
  const y = scrollY + innerHeight * 0.35;
  let active = map[0];
  map.forEach(p => { if (p[1] && p[1].offsetTop <= y) active = p; });
  links.forEach(a => a.classList.toggle('is-active', a === active[0]));
}, { passive: true });


/* Recorte automático da margem transparente dos PNGs (logo, WhatsApp, Instagram e logos dos selos).
   Mede onde o desenho realmente começa e termina e ajusta --trim/--tx/--ty,
   para o desenho ocupar o tamanho da referência. Precisa que a página rode por servidor
   (ex.: Live Server); abrindo o arquivo direto (file://) o navegador bloqueia e o CSS usa o valor reserva. */
const trimCache = new Map();
const TRIM_SEL = '.brand img, .icon-btn img, .pill img, .drawer__btn img';

function measureTrim(img) {
  const src = img.currentSrc || img.src;
  if (trimCache.has(src)) return trimCache.get(src);
  let r = null;
  try {
    const k = Math.min(1, 300 / Math.max(img.naturalWidth, img.naturalHeight));
    const W = Math.max(1, Math.round(img.naturalWidth * k));
    const H = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (d[(y * W + x) * 4 + 3] > 20) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 >= 0) {
      r = {
        f: W / (x1 - x0 + 1),
        tx: (x0 + x1 + 1) / 2 / W - 0.5,
        ty: (y0 + y1 + 1) / 2 / H - 0.5
      };
    }
  } catch (e) { /* file:// ou imagem bloqueada: usa o valor reserva do CSS */ }
  trimCache.set(src, r);
  return r;
}

function applyTrim(img) {
  if (!img.complete || !img.naturalWidth) return;
  const r = measureTrim(img);
  if (!r) return;
  img.style.setProperty('--trim', r.f.toFixed(4));
  img.style.setProperty('--tx', r.tx.toFixed(4));
  img.style.setProperty('--ty', r.ty.toFixed(4));
}

function trimAll() {
  document.querySelectorAll(TRIM_SEL).forEach(img => {
    if (img.complete) applyTrim(img);
    else img.addEventListener('load', () => applyTrim(img), { once: true });
  });
}

trimAll();
addEventListener('load', trimAll);
/* os clones do carrossel de empresas são criados depois: aplica neles também */
new MutationObserver(trimAll).observe(document.body, { childList: true, subtree: true });


/* Ao dar F5 a home sempre recomeça do topo, para a animação de entrada (cabeçalho, textos, câmera...) ser vista.
   Sem isso o navegador volta para onde você estava rolando e o topo nunca aparece animado.
   Para desligar, apague este bloco. */
(function () {
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav && nav.type === 'reload') {
    history.scrollRestoration = 'manual';
    scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
})();


/* Animação de entrada: os elementos aparecem conforme a página é rolada.
   Cada grupo = [seletor, tipo (up, down, left, right, zoom, fade), atraso entre itens, atraso inicial] em segundos.
   Se o visitante prefere menos movimento, nada é escondido nem animado. */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

  const groups = [
    ['.topbar > *',        'down',  .08, 0],
    ['.hero__text > *',    'up',    .12, .2],
    ['.hero__camera',      'zoom',  0,   .3],
    ['.shark--l',          'left',  0,   .4],
    ['.shark--r',          'right', 0,   .4],
    ['.clients__title',    'up',    0,   0],
    ['.clients .marquee',  'fade',  0,   .15],
    ['.about__notebook',   'left',  0,   0],
    ['.about__text > *',   'right', .14, .1],
    ['.works__title',      'up',    0,   0],
    ['.works .marquee',    'up',    0,   .1],
    ['.works__nav',        'up',    0,   .2],
    ['.cta .tail--l',      'left',  0,   0],
    ['.cta .tail--r',      'right', 0,   0],
    ['.cta h2',            'up',    0,   .1],
    ['.cta .btn',          'up',    0,   .3],
    ['.ast',               'zoom',  0,   .2]
  ];

  const items = [];
  groups.forEach(([sel, type, step, base]) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.setAttribute('data-reveal', type);
      const d = base + i * step;
      el.style.setProperty('--d', d + 's');
      items.push([el, d]);
    });
  });

  // Esconde os elementos SEM transição (senão o navegador anima o "esconder" e a entrada some),
  // confirma o estado escondido e só então religa as transições.
  items.forEach(([el]) => el.style.transition = 'none');
  document.documentElement.classList.add('js-reveal');
  void document.body.offsetHeight;                       // fixa o estado inicial (escondido)
  items.forEach(([el]) => el.style.removeProperty('transition'));
  void document.body.offsetHeight;                       // devolve a transição do CSS já com o estado escondido

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      io.unobserve(el);
      el.classList.add('is-in');
      const d = parseFloat(el.style.getPropertyValue('--d')) || 0;
      // depois que termina, devolve o elemento ao CSS normal (hover, transições próprias)
      setTimeout(() => {
        el.removeAttribute('data-reveal');
        el.classList.remove('is-in');
        el.style.removeProperty('--d');
      }, (d + 1.1) * 1000);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

  items.forEach(([el]) => io.observe(el));
})();


/* ==========================================================
   Menu lateral (sidebar) para tablet e celular
   Montado a partir do próprio menu do cabeçalho: se você mudar os links
   no HTML, o menu lateral acompanha sozinho. Funciona em todas as páginas.
   Abaixo de 1000px o menu normal some e aparece o botão de 3 risquinhas.
   ========================================================== */
(function () {
  const topbar = document.querySelector('.topbar');
  const nav = topbar && topbar.querySelector('.nav');
  if (!topbar || !nav) return;

  const mq = matchMedia('(min-width: 1001px)');

  /* botão (3 risquinhas) no cabeçalho */
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'menu-toggle';
  toggle.setAttribute('aria-label', 'Abrir menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'drawer');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  topbar.appendChild(toggle);

  /* painel lateral */
  const drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.id = 'drawer';
  drawer.setAttribute('inert', '');
  drawer.innerHTML = `
    <div class="drawer__backdrop" data-close></div>
    <aside class="drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" class="drawer__close" data-close aria-label="Fechar menu">×</button>
      <nav class="drawer__nav" aria-label="Menu lateral"></nav>
      <div class="drawer__social"></div>
    </aside>`;
  document.body.appendChild(drawer);

  const drawerNav = drawer.querySelector('.drawer__nav');
  const social = drawer.querySelector('.drawer__social');

  nav.querySelectorAll('a').forEach((a, i) => {
    const l = document.createElement('a');
    l.href = a.getAttribute('href');
    l.textContent = a.textContent.trim();
    l.style.setProperty('--i', i);
    l.dataset.href = a.getAttribute('href');
    drawerNav.appendChild(l);
  });

  topbar.querySelectorAll('.icon-btn').forEach(a => {
    const b = document.createElement('a');
    b.className = 'drawer__btn';
    b.href = a.getAttribute('href');
    b.setAttribute('aria-label', a.getAttribute('aria-label') || '');
    const img = a.querySelector('img');
    if (img) { const c = document.createElement('img'); c.src = img.getAttribute('src'); c.alt = ''; b.appendChild(c); }
    const nome = document.createElement('span');          // nome ao lado do ícone (WhatsApp, Instagram)
    nome.textContent = a.getAttribute('aria-label') || '';
    b.appendChild(nome);
    social.appendChild(b);
  });

  /* copia o item ativo do menu do cabeçalho (na home ele muda ao rolar) */
  function syncActive() {
    const act = nav.querySelector('a.is-active');
    drawerNav.querySelectorAll('a').forEach(l => {
      const on = !!act && l.dataset.href === act.getAttribute('href');
      l.classList.toggle('is-active', on);
      if (on) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
    });
  }

  function abrir() {
    syncActive();
    drawer.removeAttribute('inert');
    drawer.classList.add('is-open');
    document.documentElement.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    drawer.querySelector('.drawer__close').focus({ preventScroll: true });
  }

  function fechar(devolverFoco = true) {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('inert', '');
    document.documentElement.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (devolverFoco) toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', abrir);
  drawer.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) fechar();
    else if (e.target.closest('.drawer__nav a')) fechar(false);   // o link continua e rola até a seção
  });

  addEventListener('keydown', e => {
    if (!drawer.classList.contains('is-open')) return;
    if (e.key === 'Escape') { fechar(); return; }
    if (e.key === 'Tab') {                  // mantém o foco dentro do painel
      const f = [...drawer.querySelectorAll('button, a[href]')];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* se a tela crescer até o desktop, fecha o painel */
  mq.addEventListener('change', e => { if (e.matches) fechar(false); });
})();


const msg = "Olá Min, vim pelo seu portfólio! Gostaria de mais informações.";
const zap = document.getElementById("zap");
if (zap) zap.href = "https://wa.me/5511965270351?text=" + encodeURIComponent(msg);
