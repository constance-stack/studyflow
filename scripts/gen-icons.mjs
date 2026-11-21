import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true })

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="110" fill="#6366f1"/>
  <path d="M130 170 L256 120 L382 170 L382 230 L256 280 L130 230 Z" fill="#fff"/>
  <path d="M130 230 L256 280 L382 230 L382 360 L256 410 L130 360 Z" fill="#c7d2fe"/>
  <circle cx="382" cy="195" r="10" fill="#fff"/>
  <rect x="378" y="195" width="8" height="70" fill="#fff"/>
</svg>
`

const sizes = [192, 512]
for (const size of sizes) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/icon-${size}.png`)
}
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png')
// maskable: add safe padding
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#6366f1"/>
  <g transform="translate(64,64) scale(0.75)">
    <path d="M130 170 L256 120 L382 170 L382 230 L256 280 L130 230 Z" fill="#fff"/>
    <path d="M130 230 L256 280 L382 230 L382 360 L256 410 L130 360 Z" fill="#c7d2fe"/>
  </g>
</svg>
`
await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile('public/icons/icon-maskable-512.png')

console.log('Icons generated.')
