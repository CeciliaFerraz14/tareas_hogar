import { memo, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { G, Line, Path, Rect } from 'react-native-svg';

// Suelo de tablones horizontales dibujado encima del degradado de fondo.
// Solo usa negro/blanco translúcido, así hereda el tono del tema que tenga debajo.

const PLANK_HEIGHT = 58;
const SEAM = 2;

// Pseudoaleatorio con semilla: el dibujo es siempre el mismo entre renders.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function grainPath(rand: () => number, width: number, y: number): string {
  const segments = 6;
  const step = width / segments;
  let d = `M0 ${y.toFixed(1)}`;
  for (let i = 1; i <= segments; i++) {
    const x = i * step;
    const cy = y + (rand() - 0.5) * 6;
    const ey = y + (rand() - 0.5) * 3;
    d += ` Q${(x - step / 2).toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${ey.toFixed(1)}`;
  }
  return d;
}

function knotPath(cx: number, cy: number, rx: number, ry: number): string {
  // Elipse abierta, con las vetas rodeándola.
  return `M${cx - rx} ${cy} Q${cx} ${cy - ry * 2} ${cx + rx} ${cy} Q${cx} ${cy + ry * 2} ${cx - rx} ${cy}`;
}

export const WoodPlanks = memo(function WoodPlanks() {
  const { width, height } = useWindowDimensions();

  const planks = useMemo(() => {
    const rand = seeded(42);
    const rows = Math.ceil(height / PLANK_HEIGHT) + 1;
    return Array.from({ length: rows }, (_, row) => {
      const y = row * PLANK_HEIGHT;
      // Cada tabla un poco más clara u oscura que la anterior.
      const shade = rand() - 0.5;
      // Juntas escalonadas: la unión de tablas cae en un sitio distinto en cada fila.
      const joint = width * (0.25 + rand() * 0.5);
      const grains = Array.from({ length: 4 }, (_, g) =>
        grainPath(rand, width, y + 8 + g * ((PLANK_HEIGHT - 16) / 3) + (rand() - 0.5) * 4),
      );
      const knot =
        rand() < 0.35
          ? { cx: 30 + rand() * (width - 60), cy: y + PLANK_HEIGHT / 2, rx: 8 + rand() * 6, ry: 3 + rand() * 2 }
          : null;
      return { y, shade, joint, grains, knot };
    });
  }, [width, height]);

  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      {planks.map(({ y, shade, joint, grains, knot }, i) => (
        <G key={i}>
          <Rect
            x={0}
            y={y}
            width={width}
            height={PLANK_HEIGHT}
            fill={shade > 0 ? '#FFFFFF' : '#000000'}
            opacity={Math.abs(shade) * 0.12}
          />
          {grains.map((d, g) => (
            <Path key={g} d={d} stroke="#000000" strokeOpacity={0.14} strokeWidth={1} fill="none" />
          ))}
          {knot && (
            <Path
              d={knotPath(knot.cx, knot.cy, knot.rx, knot.ry)}
              stroke="#000000"
              strokeOpacity={0.22}
              strokeWidth={1.5}
              fill="#000000"
              fillOpacity={0.08}
            />
          )}
          {/* Junta entre tablas: línea oscura con un brillo fino debajo. */}
          <Rect x={0} y={y + PLANK_HEIGHT - SEAM} width={width} height={SEAM} fill="#000000" opacity={0.35} />
          <Rect x={0} y={y + PLANK_HEIGHT} width={width} height={1} fill="#FFFFFF" opacity={0.06} />
          <Line
            x1={joint}
            y1={y}
            x2={joint}
            y2={y + PLANK_HEIGHT - SEAM}
            stroke="#000000"
            strokeOpacity={0.3}
            strokeWidth={SEAM}
          />
        </G>
      ))}
    </Svg>
  );
});
