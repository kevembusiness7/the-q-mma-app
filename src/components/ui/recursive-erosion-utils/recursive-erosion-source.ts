/**
 * Documento completo do efeito, servido dentro do <iframe srcDoc> por
 * RecursiveErosionBackground.tsx.
 *
 * ATENÇÃO: este arquivo foi ESCRITO AQUI, não veio com o componente. O pacote
 * original do "recursive erosion" não incluía o source, e sem ele o iframe
 * nasce vazio. Se um dia o arquivo oficial aparecer, dá pra trocar só este
 * arquivo: o contrato com o componente é o `#stage` (o alvo que ele promove a
 * background), o `#badge` e o `.sr` (que ele esconde).
 *
 * Por que canvas 2D e não three.js: o app roda num WKWebView de celular e
 * carrega o site ao vivo (ver capacitor.config.ts). Puxar three.js de CDN
 * dentro do iframe somaria ~600KB e quebraria a tela sem rede. 1.400 pontos
 * em fillRect seguram 60fps em aparelho modesto e não custam dependência.
 *
 * O efeito: pontos distribuídos numa esfera (espiral de Fibonacci, que
 * espalha melhor que lat/long -- esta não acumula pontos nos polos), girando
 * no eixo Y, com uma onda de "erosão" que apaga e devolve faixas de pontos
 * conforme corre pela esfera.
 */
export const recursiveErosionSource = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Recursive Erosion</title>
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000000; }
  #stage { position: relative; width: 100%; height: 100%; }
  #stage canvas { display: block; width: 100%; height: 100%; }
  #badge { position: absolute; left: 12px; bottom: 10px; font: 11px ui-monospace, monospace; color: #948a81; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
</head>
<body>
<div id="stage"><canvas id="c"></canvas></div>
<div id="badge">recursive erosion</div>
<p class="sr">Animated particle sphere.</p>
<script>
(function () {
  var tela = document.getElementById('c');
  var palco = document.getElementById('stage');
  var ctx = tela && tela.getContext ? tela.getContext('2d') : null;
  if (!ctx) return;

  var TOTAL = 1400;
  var OURO = '#c8a03c';
  var FUNDO = '#000000';
  var pontos = [];
  var i;

  for (i = 0; i < TOTAL; i++) {
    var k = i + 0.5;
    var phi = Math.acos(1 - 2 * k / TOTAL);
    var theta = Math.PI * (1 + Math.sqrt(5)) * k;
    var bruto = Math.sin(k * 12.9898) * 43758.5453;
    pontos.push({
      x: Math.cos(theta) * Math.sin(phi),
      y: Math.sin(theta) * Math.sin(phi),
      z: Math.cos(phi),
      semente: bruto - Math.floor(bruto)
    });
  }

  var w = 0, h = 0;
  function medir() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = palco.clientWidth || window.innerWidth || 1;
    h = palco.clientHeight || window.innerHeight || 1;
    tela.width = Math.max(1, Math.round(w * dpr));
    tela.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function desenhar(tempo) {
    var cx = w / 2;
    var cy = h / 2;
    var raio = Math.min(w, h) * 0.34;
    var cos = Math.cos(tempo);
    var sen = Math.sin(tempo);

    ctx.globalAlpha = 1;
    ctx.fillStyle = FUNDO;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = OURO;

    for (var j = 0; j < TOTAL; j++) {
      var p = pontos[j];
      var x = p.x * cos - p.z * sen;
      var z = p.x * sen + p.z * cos;
      var y = p.y;

      // A erosão: onda que corre no eixo Y apagando faixas inteiras de
      // pontos. A semente por ponto quebra a faixa em algo irregular --
      // sem ela a esfera piscaria em anéis perfeitos, que parecem defeito.
      var vivo = Math.sin(y * 3.2 + tempo * 2.4 + p.semente * 6.283) * 0.5 + 0.5;
      if (vivo < 0.3) continue;

      // Perspectiva de leve: o que dá profundidade aqui é alfa e tamanho,
      // não deformação. Escala forte faria a esfera "respirar" de largura.
      var escala = 1 + z * 0.14;
      var px = cx + x * raio * escala;
      var py = cy + y * raio * escala;
      var tam = z > 0.15 ? 2 : 1.4;

      ctx.globalAlpha = (0.14 + 0.86 * ((z + 1) / 2)) * vivo;
      ctx.fillRect(px, py, tam, tam);
    }

    ctx.globalAlpha = 1;
  }

  var menosMovimento = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pausado = false;
  var quadro = 0;
  var tempo = 0;
  var ultimo = 0;

  function passo(agora) {
    if (!ultimo) ultimo = agora;
    // Teto no delta: voltando de aba em segundo plano o relógio salta vários
    // segundos, e sem o teto a esfera daria um giro brusco ao reaparecer.
    var dt = Math.min((agora - ultimo) / 1000, 0.05);
    ultimo = agora;
    tempo += dt * 0.16;
    desenhar(tempo);
    quadro = requestAnimationFrame(passo);
  }

  function tocar() {
    if (quadro || pausado || menosMovimento) return;
    quadro = requestAnimationFrame(passo);
  }

  function parar() {
    if (quadro) cancelAnimationFrame(quadro);
    quadro = 0;
    ultimo = 0;
  }

  window.addEventListener('resize', function () {
    medir();
    if (!quadro) desenhar(tempo);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) parar();
    else tocar();
  });

  // O pai manda pausar quando o hero sai da tela. Sem allow-same-origin ele
  // não alcança este DOM, então postMessage é o único canal possível.
  window.addEventListener('message', function (evento) {
    var dado = evento.data;
    if (!dado || dado.canal !== 'the-q-bg') return;
    if (dado.acao === 'pause') { pausado = true; parar(); }
    else if (dado.acao === 'resume') { pausado = false; tocar(); }
  });

  medir();
  if (menosMovimento) desenhar(0.9);
  else tocar();
})();
</script>
</body>
</html>`;
