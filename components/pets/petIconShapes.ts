// Iconos de las mascotas dibujados a mano, al estilo de la casita del logo:
// trazo de tinta redondeado y rellenos de la paleta HOMI. Cada icono es una
// lista de formas en un lienzo de 48×48 que pinta components/pets/PetIcons.tsx.
// Sin imports a propósito: así se pueden previsualizar desde Node.

/** Colores de la marca (lib/theme.ts → brand) y el azul del agua. */
export const ICON_COLORS = {
  ink: '#1A1410',
  white: '#FFFFFF',
  cream: '#FFF9F3',
  peach100: '#FDE6D6',
  peach300: '#F7C4A5',
  orange400: '#EF8A4F',
  orange500: '#E8703A',
  mustard300: '#F8D35E',
  mustard500: '#F2B233',
  lime300: '#D5DA7A',
  lime500: '#BCC34A',
  sand200: '#F1DFD1',
  sand400: '#B89886',
  steel: '#E4DED8',
  water: '#A9D3EC',
} as const;

const C = ICON_COLORS;

type Common = {
  /** Relleno; sin él, 'none'. */
  fill?: string;
  /** Color del trazo (tinta por defecto) o false para no trazar. */
  stroke?: string | false;
  /** Grosor del trazo (2.5 por defecto). */
  sw?: number;
  transform?: string;
};

export type IconShape =
  | (Common & { el: 'path'; d: string })
  | (Common & { el: 'circle'; cx: number; cy: number; r: number })
  | (Common & { el: 'ellipse'; cx: number; cy: number; rx: number; ry: number })
  | (Common & { el: 'rect'; x: number; y: number; w: number; h: number; rx?: number });

const eye = (cx: number, cy: number, r = 1.9): IconShape[] => [
  { el: 'circle', cx, cy, r, fill: C.ink, stroke: false },
  { el: 'circle', cx: cx + r * 0.35, cy: cy - r * 0.4, r: r * 0.32, fill: C.white, stroke: false },
];

const PAW: IconShape[] = [
  { el: 'ellipse', cx: 12, cy: 22, rx: 3.6, ry: 4.4, fill: C.peach300 },
  { el: 'ellipse', cx: 19.5, cy: 13.5, rx: 3.8, ry: 4.8, fill: C.peach300 },
  { el: 'ellipse', cx: 28.5, cy: 13.5, rx: 3.8, ry: 4.8, fill: C.peach300 },
  { el: 'ellipse', cx: 36, cy: 22, rx: 3.6, ry: 4.4, fill: C.peach300 },
  { el: 'path', d: 'M24 24.5 C30.5 24.5 36 31 35 35.5 C34 40 28.5 38.6 24 38.6 C19.5 38.6 14 40 13 35.5 C12 31 17.5 24.5 24 24.5 Z', fill: C.orange400 },
];

/** Tipos de mascota (los value de PET_TYPES). */
export const PET_TYPE_SHAPES: Record<string, IconShape[]> = {
  perro: [
    // Orejas caídas
    { el: 'path', d: 'M16 13 C10 11 5.5 17 6.5 26 C7 30.5 11.5 31 13 27 L15.5 19 Z', fill: C.orange500 },
    { el: 'path', d: 'M32 13 C38 11 42.5 17 41.5 26 C41 30.5 36.5 31 35 27 L32.5 19 Z', fill: C.orange500 },
    // Cabeza, mancha y hocico
    { el: 'path', d: 'M24 10.5 C31.5 10.5 35.5 15 35.5 22 L35.5 29 C35.5 36 30.5 40.5 24 40.5 C17.5 40.5 12.5 36 12.5 29 L12.5 22 C12.5 15 16.5 10.5 24 10.5 Z', fill: C.peach300 },
    { el: 'ellipse', cx: 29.5, cy: 21.5, rx: 4.2, ry: 3.8, fill: C.orange400, stroke: false },
    { el: 'ellipse', cx: 24, cy: 31.6, rx: 6.8, ry: 5.2, fill: C.cream, sw: 2 },
    ...eye(19, 23),
    ...eye(29.5, 22.5),
    { el: 'path', d: 'M21.8 29.3 C21.8 28.1 26.2 28.1 26.2 29.3 C26.2 30.5 25 31.4 24 31.4 C23 31.4 21.8 30.5 21.8 29.3 Z', fill: C.ink, stroke: false },
    { el: 'path', d: 'M24 31.4 L24 32.8 M21.4 33.6 C22.4 34.7 24 34.5 24 32.8 C24 34.5 25.6 34.7 26.6 33.6', sw: 1.8 },
  ],
  gato: [
    // Orejas
    { el: 'path', d: 'M12.5 21 L11.5 6.5 L22.5 13 Z', fill: C.mustard500 },
    { el: 'path', d: 'M35.5 21 L36.5 6.5 L25.5 13 Z', fill: C.mustard500 },
    { el: 'path', d: 'M14.4 16.5 L14 10.6 L19 13.6 Z', fill: C.peach300, stroke: false },
    { el: 'path', d: 'M33.6 16.5 L34 10.6 L29 13.6 Z', fill: C.peach300, stroke: false },
    // Cabeza
    { el: 'path', d: 'M24 12 C33 12 38.5 18 38.5 26 C38.5 34 32.5 39.5 24 39.5 C15.5 39.5 9.5 34 9.5 26 C9.5 18 15 12 24 12 Z', fill: C.mustard300 },
    { el: 'path', d: 'M24 14.2 L24 18 M20 14.8 L21 17.6 M28 14.8 L27 17.6', sw: 2 },
    { el: 'circle', cx: 15, cy: 30.5, r: 2.3, fill: C.peach300, stroke: false },
    { el: 'circle', cx: 33, cy: 30.5, r: 2.3, fill: C.peach300, stroke: false },
    { el: 'ellipse', cx: 18.5, cy: 25, rx: 2, ry: 2.7, fill: C.ink, stroke: false },
    { el: 'ellipse', cx: 29.5, cy: 25, rx: 2, ry: 2.7, fill: C.ink, stroke: false },
    { el: 'circle', cx: 19.2, cy: 24, r: 0.65, fill: C.white, stroke: false },
    { el: 'circle', cx: 30.2, cy: 24, r: 0.65, fill: C.white, stroke: false },
    { el: 'path', d: 'M22.4 29 L25.6 29 L24 31 Z', fill: C.orange500, sw: 1.5 },
    { el: 'path', d: 'M24 31 C24 33 21.6 34 20.4 32.6 M24 31 C24 33 26.4 34 27.6 32.6', sw: 2 },
    // Bigotes
    { el: 'path', d: 'M5.5 27 L13.5 28.4 M6 32 L13.5 31 M42.5 27 L34.5 28.4 M42 32 L34.5 31', sw: 1.8 },
  ],
  conejo: [
    // Orejas largas
    { el: 'path', d: 'M18.5 20 C14.5 14 14 4.5 17.5 3.2 C21.5 2 23 11 22.5 19.5 Z', fill: C.sand200 },
    { el: 'path', d: 'M29.5 20 C33.5 14 34 4.5 30.5 3.2 C26.5 2 25 11 25.5 19.5 Z', fill: C.sand200 },
    { el: 'path', d: 'M19 16.5 C17 12.5 16.8 7.5 18.2 6.6 C19.8 5.8 20.6 11 20.3 16.5 Z', fill: C.peach300, stroke: false },
    { el: 'path', d: 'M29 16.5 C31 12.5 31.2 7.5 29.8 6.6 C28.2 5.8 27.4 11 27.7 16.5 Z', fill: C.peach300, stroke: false },
    // Cabeza
    { el: 'path', d: 'M24 16.5 C32 16.5 37.5 21.5 37.5 28.5 C37.5 36 31.5 41.5 24 41.5 C16.5 41.5 10.5 36 10.5 28.5 C10.5 21.5 16 16.5 24 16.5 Z', fill: C.cream },
    { el: 'circle', cx: 15.5, cy: 32, r: 2.3, fill: C.peach300, stroke: false },
    { el: 'circle', cx: 32.5, cy: 32, r: 2.3, fill: C.peach300, stroke: false },
    ...eye(19, 27),
    ...eye(29, 27),
    { el: 'path', d: 'M22.4 31 L25.6 31 L24 33 Z', fill: C.orange400, sw: 1.5 },
    { el: 'rect', x: 22.5, y: 35, w: 3, h: 2.8, rx: 0.6, fill: C.white, sw: 1.5 },
    { el: 'path', d: 'M24 33 L24 34.8 M20.8 35 C22 36.2 23.2 36 24 34.8 C24.8 36 26 36.2 27.2 35', sw: 2 },
  ],
  pájaro: [
    // Cola, cuerpo, tripa y ala
    { el: 'path', d: 'M11.5 28.5 L3.5 24.5 L5.5 33.5 Z', fill: C.lime500 },
    { el: 'path', d: 'M26 12 C36 12 41.5 19 41.5 27 C41.5 35.5 34.5 41 25 41 C16 41 10 35.5 10 28 C10 19 16 12 26 12 Z', fill: C.lime300 },
    { el: 'ellipse', cx: 27.5, cy: 33.5, rx: 9, ry: 5.6, fill: C.cream, stroke: false },
    { el: 'path', d: 'M16.5 25 C20 21.5 27 23.5 28.5 29 C26.5 33 19 33 15.8 30 Z', fill: C.lime500 },
    // Copete, ojo, pico y patas
    { el: 'path', d: 'M24.5 12.2 C23.5 8 26.8 6 28 8.4 M27.2 12 C28.2 8.2 31.4 8.4 31.2 10.6', sw: 2 },
    ...eye(32.5, 21, 2.1),
    { el: 'path', d: 'M39.5 21.5 L46 24.5 L39.5 27.5 Z', fill: C.mustard500 },
    { el: 'path', d: 'M22 41 L21 45 M28.5 41 L29.5 45 M18.5 45 L23.5 45 M27 45 L32 45', sw: 2 },
  ],
  pez: [
    // Aletas y cola (detrás del cuerpo)
    { el: 'path', d: 'M22 15.5 C23.5 9 31 8.5 33.5 14.5 Z', fill: C.mustard500 },
    { el: 'path', d: 'M23.5 33 C24.5 38.5 29.5 38.5 31.5 34 Z', fill: C.mustard500 },
    { el: 'path', d: 'M13 24 C9 19 6.5 16 3.5 14.5 C5 20 5 28 3.5 33.5 C6.5 32 9 29 13 24 Z', fill: C.mustard500 },
    // Cuerpo
    { el: 'path', d: 'M11.5 24 C15.5 15.5 26 12 34 14 C40.5 15.8 44.5 20 44.5 24 C44.5 28 40.5 32.2 34 34 C26 36 15.5 32.5 11.5 24 Z', fill: C.orange400 },
    { el: 'path', d: 'M30 18 C27.2 21.8 27.2 26.5 30 30', sw: 2 },
    { el: 'path', d: 'M19.5 21.5 C21 23.5 21 25.5 19.5 27.5 M23.5 20.5 C25 23 25 26 23.5 28.5', sw: 1.6 },
    { el: 'circle', cx: 37, cy: 22, r: 2.8, fill: C.white, sw: 1.8 },
    { el: 'circle', cx: 37.6, cy: 22, r: 1.4, fill: C.ink, stroke: false },
    { el: 'path', d: 'M43.2 26 C42.2 27 41 27.1 40 26.5', sw: 1.8 },
    // Burbujas
    { el: 'circle', cx: 44.5, cy: 10, r: 1.8, fill: C.white, sw: 1.5 },
    { el: 'circle', cx: 41.5, cy: 5, r: 1.2, fill: C.white, sw: 1.5 },
  ],
  otro: PAW,
};

/** Iconos de las rutinas, por el emoji que se guarda en pet_routines.emoji. */
export const ROUTINE_SHAPES: Record<string, IconShape[]> = {
  // Comida: cuenco con pienso
  '🍖': [
    { el: 'path', d: 'M10.5 26 C11.5 18.5 17.5 15.5 24 15.5 C30.5 15.5 36.5 18.5 37.5 26 Z', fill: C.sand400 },
    { el: 'circle', cx: 18.5, cy: 21.5, r: 1.1, fill: C.ink, stroke: false },
    { el: 'circle', cx: 24, cy: 19.3, r: 1.1, fill: C.ink, stroke: false },
    { el: 'circle', cx: 29.5, cy: 21.8, r: 1.1, fill: C.ink, stroke: false },
    { el: 'circle', cx: 21.5, cy: 24, r: 1.1, fill: C.ink, stroke: false },
    { el: 'circle', cx: 27, cy: 24.2, r: 1.1, fill: C.ink, stroke: false },
    { el: 'path', d: 'M6.5 26 L41.5 26 C40.5 34.5 35 39.5 24 39.5 C13 39.5 7.5 34.5 6.5 26 Z', fill: C.orange400 },
    { el: 'path', d: 'M9.8 31.5 L38.2 31.5', sw: 2 },
    { el: 'path', d: 'M5 26 L43 26', sw: 3 },
  ],
  // Agua: gota
  '💧': [
    { el: 'path', d: 'M24 5.5 C24 5.5 37.5 20.5 37.5 29 C37.5 36.5 31.5 42.5 24 42.5 C16.5 42.5 10.5 36.5 10.5 29 C10.5 20.5 24 5.5 24 5.5 Z', fill: C.water },
    { el: 'path', d: 'M16.8 29.5 C16.8 25.5 18.8 22.2 21 19.5', stroke: C.white, sw: 3 },
  ],
  // Limpiar (arena, jaula…): escoba
  '🧹': [
    { el: 'path', d: 'M31.5 4 L35.3 6.2 L24.8 26 L21 23.8 Z', fill: C.sand400 },
    { el: 'path', d: 'M17.8 21.8 L28 27.6 L26.2 31 L16 25.2 Z', fill: C.orange500 },
    { el: 'path', d: 'M16 25.2 L26.2 31 C25.2 35.5 22.2 40.5 19 43.5 C14 41.5 9 38.5 5.5 34.2 C9.8 33 13.8 30 16 25.2 Z', fill: C.mustard300 },
    { el: 'path', d: 'M12 33.5 L9.8 37.6 M16.2 35.4 L14.2 40 M20.4 36.4 L18.8 41.4', sw: 1.8 },
  ],
  // Pastillas: cápsula y pastilla
  '💊': [
    { el: 'rect', x: 6, y: 17, w: 30, h: 13, rx: 6.5, fill: C.white, transform: 'rotate(-38 21 23.5)' },
    { el: 'path', d: 'M21 17 L29.5 17 C33.1 17 36 19.9 36 23.5 C36 27.1 33.1 30 29.5 30 L21 30 Z', fill: C.orange400, transform: 'rotate(-38 21 23.5)' },
    { el: 'path', d: 'M10.5 21 C11.3 20 12.5 19.6 13.8 19.6', stroke: C.ink, sw: 1.6, transform: 'rotate(-38 21 23.5)' },
    { el: 'circle', cx: 36, cy: 36, r: 6, fill: C.mustard300 },
    { el: 'path', d: 'M32 40 L40 32', sw: 2 },
  ],
  // Baño: bañera con espuma
  '🛁': [
    { el: 'path', d: 'M8 22 C7.5 18 12 16.8 14 19 C15 15.8 20 15.6 21.2 18.5 C23 15.2 28.5 15.6 28.8 19 C30.5 16.8 35.5 17 36 20.2 C38 18.6 41.5 19.8 40.5 22 Z', fill: C.white },
    { el: 'circle', cx: 34, cy: 10.5, r: 2.6, fill: C.white, sw: 2 },
    { el: 'circle', cx: 40, cy: 6.5, r: 1.7, fill: C.white, sw: 1.8 },
    { el: 'path', d: 'M6 22 L42 22 L42 25 C42 33 36 37.5 28 37.5 L20 37.5 C12 37.5 6 33 6 25 Z', fill: C.peach300 },
    { el: 'path', d: 'M4 22 L44 22', sw: 3 },
    { el: 'path', d: 'M13.5 37 L11.8 41.5 M34.5 37 L36.2 41.5', sw: 2.5 },
  ],
  // Cepillar: cepillo
  '🪮': [
    { el: 'path', d: 'M10 20 L10 14.5 M14 20 L14 13.5 M18 20 L18 13.5 M22 20 L22 13.5 M26 20 L26 14.5', sw: 2 },
    { el: 'path', d: 'M28 24 L41.5 24 C44.5 24 44.5 30 41.5 30 L28 30 Z', fill: C.sand400 },
    { el: 'rect', x: 6, y: 20, w: 24, h: 14, rx: 5, fill: C.orange400 },
    { el: 'circle', cx: 12, cy: 27, r: 1.2, fill: C.ink, stroke: false },
    { el: 'circle', cx: 18, cy: 27, r: 1.2, fill: C.ink, stroke: false },
    { el: 'circle', cx: 24, cy: 27, r: 1.2, fill: C.ink, stroke: false },
  ],
  // Uñas / pelo: tijeras
  '✂️': [
    { el: 'path', d: 'M13 4.5 C15.5 4.5 25 19.5 28.5 27 L25.2 29 C21 22 11.5 8 13 4.5 Z', fill: C.steel },
    { el: 'path', d: 'M35 4.5 C32.5 4.5 23 19.5 19.5 27 L22.8 29 C27 22 36.5 8 35 4.5 Z', fill: C.steel },
    { el: 'circle', cx: 31, cy: 35.5, r: 6.5, fill: C.orange400 },
    { el: 'circle', cx: 17, cy: 35.5, r: 6.5, fill: C.orange400 },
    { el: 'circle', cx: 31, cy: 35.5, r: 2.8, fill: C.cream },
    { el: 'circle', cx: 17, cy: 35.5, r: 2.8, fill: C.cream },
    { el: 'circle', cx: 24, cy: 23.7, r: 1.7, fill: C.ink, stroke: false },
  ],
  // Jugar: pelota
  '🎾': [
    { el: 'circle', cx: 24, cy: 24, r: 16.5, fill: C.lime300 },
    { el: 'path', d: 'M10.2 15.5 C17 19 17 29 10.2 32.5 M37.8 15.5 C31 19 31 29 37.8 32.5', sw: 2.2 },
    { el: 'path', d: 'M15 13.5 C17 11.5 19.5 10.6 22 10.4', stroke: C.white, sw: 2.5 },
  ],
  '🐾': PAW,
};
