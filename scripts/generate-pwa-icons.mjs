// Genera los iconos de la PWA a partir de la casita del logo HOMI
// (el mismo dibujo que components/brand/HouseIllustration.tsx).
//
//   node scripts/generate-pwa-icons.mjs
//
// Salida en public/icons/. Los PNG se suben a git: este script solo hace falta
// si cambia el logo.
import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const OUT = new URL('../public/icons/', import.meta.url);

// Colores de la marca (lib/theme.ts → brand)
const INK = '#1A1410';
const PEACH_300 = '#F7C4A5';
const GRADIENT = ['#FCEFE6', '#F2B79A', '#EC8A5C', '#E46A36'];

// La casita en su viewBox original de 120×114.
const HOUSE = `
  <g stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <rect x="80" y="18" width="11" height="24" fill="${PEACH_300}"/>
    <line x1="77" y1="18" x2="94" y2="18"/>
    <path d="M24 54 L24 104 L96 104 L96 54 L60 22 Z" fill="#FAD9C8"/>
    <path d="M12 60 L60 16 L108 60" fill="none" stroke-width="3.5"/>
    <path d="M18 58 L60 21 L102 58" fill="none" stroke-width="2"/>
    <path d="M60 52 C49 44 50 34 56 34.5 C58.5 34.7 60 37 60 38.5 C60 37 61.5 34.7 64 34.5 C70 34 71 44 60 52 Z"
          fill="${PEACH_300}" stroke-width="2.5"/>
    <rect x="31" y="70" width="15" height="14" rx="1.5" fill="#FFF3EA" stroke-width="2.5"/>
    <line x1="38.5" y1="70" x2="38.5" y2="84" stroke-width="2"/>
    <line x1="31" y1="77" x2="46" y2="77" stroke-width="2"/>
    <rect x="74" y="70" width="15" height="14" rx="1.5" fill="#FFF3EA" stroke-width="2.5"/>
    <line x1="81.5" y1="70" x2="81.5" y2="84" stroke-width="2"/>
    <line x1="74" y1="77" x2="89" y2="77" stroke-width="2"/>
    <path d="M51 104 L51 80 Q60 68 69 80 L69 104" fill="#F4A98A"/>
    <line x1="16" y1="104" x2="104" y2="104"/>
  </g>
  <circle cx="64.5" cy="92" r="1.6" fill="${INK}"/>`;

/**
 * Icono cuadrado de 1024×1024 con el degradado de fondo y la casita centrada.
 * @param houseRatio ancho de la casita respecto al icono (maskable: más pequeña,
 *   para que quepa en la zona segura, el círculo central del 80 %).
 */
function iconSvg(houseRatio) {
  const size = 1024;
  const houseWidth = size * houseRatio;
  const scale = houseWidth / 120;
  const x = (size - houseWidth) / 2;
  const y = (size - 114 * scale) / 2 - size * 0.015; // un pelín hacia arriba: compensa el suelo
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${GRADIENT[0]}"/>
        <stop offset="0.45" stop-color="${GRADIENT[1]}"/>
        <stop offset="0.8" stop-color="${GRADIENT[2]}"/>
        <stop offset="1" stop-color="${GRADIENT[3]}"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#bg)"/>
    <g transform="translate(${x} ${y}) scale(${scale})">${HOUSE}</g>
  </svg>`;
}

function png(svg, width) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
}

mkdirSync(OUT, { recursive: true });

const regular = iconSvg(0.66);
const maskable = iconSvg(0.5);

const files = {
  'icon-192.png': png(regular, 192),
  'icon-512.png': png(regular, 512),
  'icon-maskable-512.png': png(maskable, 512),
  // iOS: 180×180 y sin transparencia (Safari redondea las esquinas él solo).
  'apple-touch-icon.png': png(regular, 180),
  'favicon-48.png': png(regular, 48),
};

for (const [name, data] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), data);
  console.log(`✔ public/icons/${name}`);
}
