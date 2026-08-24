// Gera os mockups de boné dos atletas (Ozzy, Hollywood, JP) colando a arte
// (public/images/caps/{ozzy,hollywood,jp}cap.png, já sem fundo) em cima do
// molde de boné em branco (public/images/caps/capmockup.png).
//
// O molde tem fundo cinza-claro de estúdio (não é branco puro, nem
// transparente) -- por isso o flood-fill compara contra a cor do fundo
// amostrada nos cantos, em vez de um limiar fixo de "quase branco".
import sharp from 'sharp';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CAPS_DIR = path.join(ROOT, 'public/images/caps');

async function amostraCorDeFundo(data, info) {
  const { width, height, channels } = info;
  const cantos = [0, width - 1, (height - 1) * width, (height - 1) * width + width - 1];
  let r = 0, g = 0, b = 0;
  for (const i of cantos) {
    r += data[i * channels];
    g += data[i * channels + 1];
    b += data[i * channels + 2];
  }
  return [r / cantos.length, g / cantos.length, b / cantos.length];
}

async function floodFillRemoveBg(inputPath, distThresh = 90) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const [br, bg, bb] = await amostraCorDeFundo(data, info);

  function distToBg(i) {
    const o = i * channels;
    const dr = data[o] - br, dg = data[o + 1] - bg, db = data[o + 2] - bb;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  const isBg = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, x + (height - 1) * width);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + (width - 1));

  while (stack.length) {
    const i = stack.pop();
    if (visited[i]) continue;
    visited[i] = 1;
    if (distToBg(i) >= distThresh) continue;
    isBg[i] = 1;
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0 && !visited[i - 1]) stack.push(i - 1);
    if (x < width - 1 && !visited[i + 1]) stack.push(i + 1);
    if (y > 0 && !visited[i - width]) stack.push(i - width);
    if (y < height - 1 && !visited[i + width]) stack.push(i + width);
  }

  for (let i = 0; i < width * height; i++) {
    if (isBg[i]) data[i * channels + 3] = 0;
  }

  return sharp(data, { raw: { width, height, channels } }).png();
}

async function compositarNoBone(logoPath, prefixo) {
  const baseLimpa = await floodFillRemoveBg(path.join(CAPS_DIR, 'capmockup.png'));
  const baseTrim = await baseLimpa.trim({ threshold: 15 }).toBuffer();
  const baseMeta = await sharp(baseTrim).metadata();

  const logoTrim = await sharp(path.join(CAPS_DIR, logoPath)).trim({ threshold: 15 }).toBuffer();
  const logoMeta = await sharp(logoTrim).metadata();

  // Painel frontal do boné: faixa central-superior da coroa, antes da aba.
  const larguraAlvo = Math.round(baseMeta.width * 0.38);
  const alturaAlvo = Math.round((larguraAlvo / logoMeta.width) * logoMeta.height);
  const logoResized = await sharp(logoTrim).resize({ width: larguraAlvo }).toBuffer();

  const left = Math.round((baseMeta.width - larguraAlvo) / 2);
  // A aba (brim) começa por volta de 70% da altura do molde -- a logo deve
  // terminar um pouco acima dela, não ficar centralizada perto do botão.
  const baseDaLogo = Math.round(baseMeta.height * 0.66);
  const top = baseDaLogo - alturaAlvo;

  const outPath = path.join(CAPS_DIR, `${prefixo}-black.png`);
  await sharp(baseTrim)
    .composite([{ input: logoResized, top, left }])
    .png()
    .toFile(outPath);
  console.log('gerado:', outPath, `base ${baseMeta.width}x${baseMeta.height}, logo ${larguraAlvo}x${alturaAlvo} @ ${left},${top}`);
}

async function main() {
  await compositarNoBone('ozzycap.png', 'ozzy');
  await compositarNoBone('hollywoodcap.png', 'hollywood');
  await compositarNoBone('jplcap.png', 'jp');
  await compositarNoBone('dionecap.png', 'dione');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
