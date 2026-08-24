// Gera os mockups de camisa dos atletas (Ozzy, Hollywood, JP) a partir das
// artes soltas em public/images/shirts/{ozzy,hollywood,jp}shirt.png, coladas
// em cima do molde de FRENTE (front-{cor}.png, gerado por
// gerar-moldes-frente.mjs) -- não o back-{cor}.png, que é a camisa vista de
// trás e deixa a "frente" do produto parecendo foto de costas.
//
// A ozzyshirt.png não tem canal alpha (fundo branco sólido) -- as outras
// duas já vêm recortadas. Por isso o flood-fill: começa das bordas da
// imagem e só apaga o branco que está *conectado* à borda, preservando
// texto branco que fica no meio da arte (ex.: as letras "OZZY").
import sharp from 'sharp';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHIRTS_DIR = path.join(ROOT, 'public/images/shirts');

const COLORS = ['black', 'white', 'burgundy', 'green', 'gray', 'gold'];

async function floodFillRemoveWhiteBg(inputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const isBg = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const THRESH = 235;

  function nearWhite(i) {
    const o = i * channels;
    return data[o] >= THRESH && data[o + 1] >= THRESH && data[o + 2] >= THRESH;
  }

  const stack = [];
  for (let x = 0; x < width; x++) {
    stack.push(x, x + (height - 1) * width);
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width, y * width + (width - 1));
  }

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

  for (let i = 0; i < width * height; i++) {
    if (isBg[i]) data[i * channels + 3] = 0;
  }

  return sharp(data, { raw: { width, height, channels } }).png();
}

async function limparArte(nomeArquivo, precisaRemoverFundo) {
  const inputPath = path.join(SHIRTS_DIR, nomeArquivo);
  const pipeline = precisaRemoverFundo
    ? await floodFillRemoveWhiteBg(inputPath)
    : sharp(inputPath);
  return pipeline.trim({ threshold: 15 }).toBuffer();
}

async function compositarNaCamisa(logoBuffer, corSlug, prefixo) {
  const basePath = path.join(SHIRTS_DIR, `front-${corSlug}.png`);
  const base = sharp(basePath);
  const baseMeta = await base.metadata();

  const larguraAlvo = Math.round(baseMeta.width * 0.42);
  const logo = sharp(logoBuffer);
  const logoMeta = await logo.metadata();
  const alturaAlvo = Math.round((larguraAlvo / logoMeta.width) * logoMeta.height);
  const logoResized = await logo.resize({ width: larguraAlvo }).toBuffer();

  const top = Math.round(baseMeta.height * 0.12);
  const left = Math.round((baseMeta.width - larguraAlvo) / 2);

  const outPath = path.join(SHIRTS_DIR, `${prefixo}-${corSlug}.png`);
  await base
    .composite([{ input: logoResized, top, left }])
    .png()
    .toFile(outPath);
  console.log('gerado:', outPath, `(logo ${larguraAlvo}x${alturaAlvo} @ ${left},${top})`);
}

async function main() {
  const artes = [
    { arquivo: 'ozzyshirt.png', prefixo: 'ozzy', removerFundo: true },
    { arquivo: 'hollywoodshirt.png', prefixo: 'hollywood', removerFundo: false },
    { arquivo: 'jplshirt.png', prefixo: 'jp', removerFundo: false },
    { arquivo: 'dioneshirt.png', prefixo: 'witch', removerFundo: true },
  ];

  for (const arte of artes) {
    const logoBuffer = await limparArte(arte.arquivo, arte.removerFundo);
    const debugPath = path.join(SHIRTS_DIR, `_debug-${arte.prefixo}-logo.png`);
    await sharp(logoBuffer).toFile(debugPath);
    console.log('logo limpo salvo em', debugPath);

    for (const cor of COLORS) {
      await compositarNaCamisa(logoBuffer, cor, arte.prefixo);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
