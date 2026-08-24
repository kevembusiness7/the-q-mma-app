/**
 * Gera os ícones do PWA a partir do logo da marca.
 *
 * Rode com `npm run icones` sempre que o logo mudar. Os arquivos gerados
 * ficam em public/icons/ e são commitados: o build não depende deste script,
 * e quem clona o projeto não precisa do sharp instalado para publicar.
 *
 * Por que o fundo é sólido e não transparente: o iOS não respeita alfa em
 * ícone de tela inicial — ele compõe sobre branco, e um logo claro sumiria.
 * Escolher a cor aqui é o que garante o mesmo ícone nos dois sistemas.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const ORIGEM = 'public/images/brand/logo-theq.png'
const DESTINO = 'public/icons'
const FUNDO = { r: 0x0b, g: 0x09, b: 0x08, alpha: 1 } // --q-ink escuro do app

/**
 * `maskable` precisa de margem: Android recorta o ícone em círculo, folha ou
 * quadrado arredondado conforme o aparelho, e o que passa da zona segura
 * (80% central) é cortado. O logo colado na borda perderia pedaço.
 */
const TAMANHOS = [
  { arquivo: 'icone-192.png', lado: 192, ocupacao: 0.8 },
  { arquivo: 'icone-512.png', lado: 512, ocupacao: 0.8 },
  { arquivo: 'icone-maskable-512.png', lado: 512, ocupacao: 0.62 },
  // O iOS lê este pelo <link rel="apple-touch-icon">. 180 é o tamanho que
  // ele pede nos aparelhos atuais.
  { arquivo: 'apple-touch-icon.png', lado: 180, ocupacao: 0.78 },
]

await mkdir(DESTINO, { recursive: true })

for (const { arquivo, lado, ocupacao } of TAMANHOS) {
  const interno = Math.round(lado * ocupacao)
  const margem = Math.round((lado - interno) / 2)

  const logo = await sharp(ORIGEM)
    .resize(interno, interno, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  await sharp({
    create: { width: lado, height: lado, channels: 4, background: FUNDO },
  })
    .composite([{ input: logo, top: margem, left: margem }])
    .png()
    .toFile(`${DESTINO}/${arquivo}`)

  console.log(`✓ ${DESTINO}/${arquivo} (${lado}×${lado})`)
}
