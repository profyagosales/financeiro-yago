// ─── Build raster PNG icons from SVG sources ────────────────────────
// Safari macOS NÃO renderiza SVG no Dock — precisa de PNG.
// Este script gera todas as resoluções necessárias a partir dos SVGs
// de origem em /public.
//
// Rodar: node scripts/build-icons.mjs (ou via npm script `icons`)

import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = join(__dirname, '..', 'public')

// Cada output: { src, out, size, density? }
// density mais alta = render mais nítido em alta resolução.
const TARGETS = [
  // ─── PWA icons ─────────────────────────────────────────────────────
  { src: 'icon-512.svg',          out: 'icon-192.png',         size: 192,  density: 384 },
  { src: 'icon-512.svg',          out: 'icon-256.png',         size: 256,  density: 384 },
  { src: 'icon-512.svg',          out: 'icon-384.png',         size: 384,  density: 384 },
  { src: 'icon-512.svg',          out: 'icon-512.png',         size: 512,  density: 512 },
  { src: 'icon-512.svg',          out: 'icon-1024.png',        size: 1024, density: 1024 },
  // ─── Maskable (Android adaptive icon padding) ──────────────────────
  { src: 'icon-maskable-512.svg', out: 'icon-maskable-512.png', size: 512, density: 512 },
  // ─── Apple touch icon (Safari macOS Dock + iOS Home Screen) ────────
  // Safari requer PNG. Sem rounded corners — Safari aplica máscara dele.
  { src: 'apple-touch-icon.svg',  out: 'apple-touch-icon.png',  size: 180, density: 360 },
  // ─── Favicon (browser tabs) ────────────────────────────────────────
  { src: 'favicon.svg',           out: 'favicon-16.png',        size: 16,  density: 96 },
  { src: 'favicon.svg',           out: 'favicon-32.png',        size: 32,  density: 96 },
  // ─── Notification icon (Safari não renderiza SVG bem em notif) ────
  { src: 'icon-512.svg',          out: 'notification-icon.png', size: 192, density: 384 },
]

async function render({ src, out, size, density }) {
  const svgPath = join(PUBLIC_DIR, src)
  const outPath = join(PUBLIC_DIR, out)
  const svg = await readFile(svgPath)
  const png = await sharp(svg, { density: density ?? size * 2 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 100 })
    .toBuffer()
  await writeFile(outPath, png)
  console.log(`  ✓ ${out.padEnd(28)} ${size}x${size}px  ${(png.length / 1024).toFixed(1)}kB`)
}

console.log('Gerando ícones PNG a partir dos SVGs...\n')
await mkdir(PUBLIC_DIR, { recursive: true })
for (const t of TARGETS) {
  try { await render(t) }
  catch (e) { console.error(`  ✗ ${t.out}: ${e.message}`) }
}
console.log('\nFeito. Lembre de commitar /public/*.png')
