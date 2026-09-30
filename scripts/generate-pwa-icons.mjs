// Genera los iconos de la PWA a partir de la casita del logo HOMI
// (el mismo dibujo que components/brand/HouseIllustration.tsx).
//
//   node scripts/generate-pwa-icons.mjs
//
// Salida en public/icons/ (y las pantallas de arranque de iOS en
// public/icons/splash/). Los PNG se suben a git: este script solo hace falta si
// cambia el logo.
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

/**
 * Icono pequeño de la barra de estado de Android ("badge"): Android solo usa la
 * forma (lo pinta en blanco), así que es el contorno de la casita sin rellenos.
 */
function badgeSvg() {
  const outline = HOUSE.replace(/fill="[^"]*"/g, 'fill="none"').replaceAll(INK, '#FFFFFF');
  const size = 96;
  const scale = (size * 0.86) / 120;
  const x = (size - 120 * scale) / 2;
  const y = (size - 114 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <g transform="translate(${x} ${y}) scale(${scale})" stroke-width="5">${outline.replace(/stroke-width="[^"]*"/g, 'stroke-width="6"')}</g>
  </svg>`;
}

/**
 * Pantalla de arranque de iOS (apple-touch-startup-image): el primer fotograma
 * de la animación de inicio. Degradado vertical y la casita a 124 pt, un poco
 * por encima del centro, igual que #homi-boot en public/index.html.
 * @param width,height tamaño en píxeles reales; @param ratio píxeles por punto.
 */
function splashSvg(width, height, ratio) {
  const houseWidth = 124 * ratio;
  const scale = houseWidth / 120;
  const x = (width - houseWidth) / 2;
  const y = (height - 114 * scale) / 2 - 41 * ratio;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${GRADIENT[0]}"/>
        <stop offset="0.35" stop-color="${GRADIENT[1]}"/>
        <stop offset="0.7" stop-color="${GRADIENT[2]}"/>
        <stop offset="1" stop-color="${GRADIENT[3]}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <g transform="translate(${x} ${y}) scale(${scale})">${HOUSE}</g>
  </svg>`;
}

// iPhones en vertical: [ancho, alto] en puntos y píxeles por punto. Cada uno
// tiene su <link rel="apple-touch-startup-image"> en public/index.html.
const IPHONES = [
  [440, 956, 3], // 16/17 Pro Max
  [430, 932, 3], // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [420, 912, 3], // Air
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 6/7/8 Plus
  [402, 874, 3], // 16/17 Pro, 17
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [390, 844, 3], // 12, 13, 14, 12/13 Pro
  [375, 812, 3], // X, XS, 11 Pro, 12/13 mini
  [375, 667, 2], // SE 2.ª/3.ª gen., 6/7/8
];

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
  'badge-96.png': png(badgeSvg(), 96),
};

mkdirSync(new URL('splash/', OUT), { recursive: true });
for (const [w, h, ratio] of IPHONES) {
  const [width, height] = [w * ratio, h * ratio];
  files[`splash/splash-${width}x${height}.png`] = png(splashSvg(width, height, ratio), width);
}

for (const [name, data] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), data);
  console.log(`✔ public/icons/${name}`);
}
