import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')

const targets = [
  { src: 'pwa-icon.svg', out: 'pwa-icon-192.png', size: 192 },
  { src: 'pwa-icon.svg', out: 'pwa-icon-512.png', size: 512 },
  { src: 'pwa-maskable.svg', out: 'pwa-maskable-512.png', size: 512 },
]

for (const { src, out, size } of targets) {
  await sharp(join(iconsDir, src)).resize(size, size).png().toFile(join(iconsDir, out))
  console.log(`generated ${out}`)
}
