// Gera os moldes de camisa vistos DE FRENTE, nas 6 cores, a partir de uma
// única foto (frontshirt.jpg, só preta). Sem isso, os mockups dos atletas
// vinham sendo colados em cima do back-{cor}.png (a camisa vista de trás),
// o que faz a "frente" do produto parecer uma foto de costas -- daí a
// necessidade de um molde de frente de verdade.
//
// Não dá pra simplesmente re-tingir preto -> branco/dourado com um multiply
// (preto não tem luz pra "clarear"). Em vez disso, aprende a fórmula de
// recolorir observando o próprio par que já existe no projeto:
// back-black.png vs back-{cor}.png são a mesma foto, só que recolorida --
// então cada nível de luminância do preto vira uma cor média observada lá.
// Essa tabela (LUT por luminância) é aplicada em cima da luminância da
// frontshirt.jpg.
import sharp from 'sharp';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHIRTS_DIR = path.join(ROOT, 'public/images/shirts');
const CORES = ['white', 'burgundy', 'green', 'gray', 'gold'];

function luma(r, g, b) {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

async function lerRaw(nome) {
  const img = sharp(path.join(SHIRTS_DIR, nome)).ensureAlpha();
  return img.raw().toBuffer({ resolveWithObject: true });
}

/** Soma numa janela de raio R em volta de cada índice (box filter). */
function suavizar(arr, raio) {
  const n = arr.length;
  const saida = new Float64Array(n);
  let acumulado = 0;
  for (let i = -raio; i <= raio; i++) acumulado += arr[Math.min(n - 1, Math.max(0, i))];
  for (let l = 0; l < n; l++) {
    saida[l] = acumulado;
    const sai = l - raio;
    const entra = l + raio + 1;
    acumulado -= arr[Math.min(n - 1, Math.max(0, sai))];
    acumulado += arr[Math.min(n - 1, Math.max(0, entra))];
  }
  return saida;
}

async function construirLUT(corAlvo) {
  const { data: preto, info } = await lerRaw('back-black.png');
  const { data: colorido } = await lerRaw(`back-${corAlvo}.png`);
  const ch = info.channels;
  const somaR = new Float64Array(256), somaG = new Float64Array(256), somaB = new Float64Array(256);
  const conta = new Float64Array(256);

  for (let i = 0; i < info.width * info.height; i++) {
    const o = i * ch;
    if (preto[o + 3] < 10) continue; // fora da camisa (fundo)
    const l = luma(preto[o], preto[o + 1], preto[o + 2]);
    somaR[l] += colorido[o];
    somaG[l] += colorido[o + 1];
    somaB[l] += colorido[o + 2];
    conta[l] += 1;
  }

  // Muitos níveis de luminância têm poucas amostras (às vezes zero) -- a
  // média "crua" por bucket pula de valor e vira um textura granulada
  // quando aplicada pixel a pixel. Suaviza numa janela larga (pesada pela
  // contagem de cada bucket) antes de dividir, em vez de suavizar a média
  // já pronta -- assim buckets quase vazios não pesam igual a um bucket
  // bem amostrado.
  const RAIO = 14;
  const somaRs = suavizar(somaR, RAIO);
  const somaGs = suavizar(somaG, RAIO);
  const somaBs = suavizar(somaB, RAIO);
  const contaS = suavizar(conta, RAIO);

  const lut = new Array(256).fill(null);
  for (let l = 0; l < 256; l++) {
    if (contaS[l] > 0) lut[l] = [somaRs[l] / contaS[l], somaGs[l] / contaS[l], somaBs[l] / contaS[l]];
  }
  // Preenche buckets vazios com o vizinho mais próximo que tem dado.
  let ultimo = lut.findIndex((v) => v !== null);
  if (ultimo === -1) throw new Error(`LUT vazia para ${corAlvo}`);
  for (let l = 0; l < 256; l++) {
    if (lut[l] !== null) ultimo = l;
    else lut[l] = lut[ultimo];
  }
  return lut;
}

async function floodFillRemoveWhiteBg(inputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const isBg = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const THRESH = 225;

  function nearWhite(i) {
    const o = i * channels;
    return data[o] >= THRESH && data[o + 1] >= THRESH && data[o + 2] >= THRESH;
  }

  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, x + (height - 1) * width);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + (width - 1));

  while (stack.length) {
    const i = stack.pop();
    if (visited[i]) continue;
    visited[i] = 1;
    if (!nearWhite(i)) continue;
    isBg[i] = 1;
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0 && !visited[i - 1]) stack.push(i - 1);
    if (x < width - 1 && !visited[i + 1]) stack.push(i + 1);
    if (y > 0 && !visited[i - width]) stack.push(i - width);
    if (y < height - 1 && !visited[i + width]) stack.push(i + width);
  }

  // A borda entre o preto da camisa e o fundo branco tem 1-2px de mistura
  // (JPEG + antialiasing) que o corte acima não pega -- sobra um contorno
  // cinza-claro meio "brilhando" em volta da silhueta. Descasca mais
  // algumas camadas: qualquer pixel opaco vizinho de fundo que ainda for
  // claro demais pra ser tecido também vira fundo, em algumas rodadas.
  const LUMA_TECIDO = 70;
  function luma(i) {
    const o = i * channels;
    return 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
  }
  for (let rodada = 0; rodada < 3; rodada++) {
    const novos = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (isBg[i]) continue;
        if (luma(i) < LUMA_TECIDO) continue;
        const vizinhoDeFundo =
          (x > 0 && isBg[i - 1]) ||
          (x < width - 1 && isBg[i + 1]) ||
          (y > 0 && isBg[i - width]) ||
          (y < height - 1 && isBg[i + width]);
        if (vizinhoDeFundo) novos.push(i);
      }
    }
    if (novos.length === 0) break;
    for (const i of novos) isBg[i] = 1;
  }

  for (let i = 0; i < width * height; i++) {
    if (isBg[i]) data[i * channels + 3] = 0;
  }
  return { data, info };
}

async function main() {
  const { data: frente, info } = await floodFillRemoveWhiteBg(path.join(SHIRTS_DIR, 'frontshirt.jpg'));
  const ch = info.channels;

  // Preta: já é a cor original, só com o fundo removido.
  await sharp(Buffer.from(frente), { raw: { width: info.width, height: info.height, channels: ch } })
    .trim({ threshold: 15 })
    .png()
    .toFile(path.join(SHIRTS_DIR, 'front-black.png'));
  console.log('gerado: front-black.png');

  for (const cor of CORES) {
    const lut = await construirLUT(cor);
    const saida = Buffer.alloc(frente.length);
    for (let i = 0; i < info.width * info.height; i++) {
      const o = i * ch;
      const l = luma(frente[o], frente[o + 1], frente[o + 2]);
      const [r, g, b] = lut[l];
      saida[o] = Math.round(r);
      saida[o + 1] = Math.round(g);
      saida[o + 2] = Math.round(b);
      saida[o + 3] = frente[o + 3];
    }
    await sharp(saida, { raw: { width: info.width, height: info.height, channels: ch } })
      .trim({ threshold: 15 })
      .png()
      .toFile(path.join(SHIRTS_DIR, `front-${cor}.png`));
    console.log('gerado: front-' + cor + '.png');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
