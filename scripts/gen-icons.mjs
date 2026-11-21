import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true })

// 5-point star path, centered at (cx, cy), with outer radius r (inner radius auto-derived).
function starPath(cx, cy, r, rotationDeg = -90) {
  const inner = r * 0.45
  const points = []
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : inner
    const angle = ((rotationDeg + i * 36) * Math.PI) / 180
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)])
  }
  return `M${points.map((p) => p.join(',')).join(' L')} Z`
}

function cardGroup({ fill, lineColor, opacity = 1 }) {
  return `
  <g transform="translate(256,268) rotate(-7)" opacity="${opacity}">
    <rect x="-132" y="-92" width="264" height="184" rx="26" fill="${fill}"/>
    <rect x="-88" y="-34" width="176" height="14" rx="7" fill="${lineColor}"/>
    <rect x="-88" y="2" width="176" height="14" rx="7" fill="${lineColor}"/>
    <rect x="-88" y="38" width="108" height="14" rx="7" fill="${lineColor}"/>
  </g>`
}

const bgGradient = `
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#818cf8"/>
      <stop offset="1" stop-color="#6366f1"/>
    </linearGradient>`

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>${bgGradient}</defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  ${cardGroup({ fill: '#ffffff', lineColor: '#c7d2fe' })}
  <path d="${starPath(372, 150, 46)}" fill="#fbbf24" stroke="#6366f1" stroke-width="10" stroke-linejoin="round"/>
</svg>
`

const sizes = [192, 512]
for (const size of sizes) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/icon-${size}.png`)
}
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png')

// Maskable: keep content within the safe circle (scale + center within a padded viewport).
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>${bgGradient}</defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256,256) scale(0.72) translate(-256,-256)">
    ${cardGroup({ fill: '#ffffff', lineColor: '#c7d2fe' })}
    <path d="${starPath(372, 150, 46)}" fill="#fbbf24" stroke="#6366f1" stroke-width="10" stroke-linejoin="round"/>
  </g>
</svg>
`
await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile('public/icons/icon-maskable-512.png')

console.log('Icons generated.')
