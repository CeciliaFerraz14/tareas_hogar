import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { Text } from '../ui/Text';
import { ICON_COLORS, PET_TYPE_SHAPES, ROUTINE_SHAPES, type IconShape } from './petIconShapes';

function Shape({ s }: { s: IconShape }) {
  const paint = {
    fill: s.fill ?? 'none',
    stroke: s.stroke === false ? 'none' : (s.stroke ?? ICON_COLORS.ink),
    strokeWidth: s.sw ?? 2.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    transform: s.transform,
  };
  switch (s.el) {
    case 'path':
      return <Path d={s.d} {...paint} />;
    case 'circle':
      return <Circle cx={s.cx} cy={s.cy} r={s.r} {...paint} />;
    case 'ellipse':
      return <Ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...paint} />;
    case 'rect':
      return <Rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx ?? 0} {...paint} />;
  }
}

function Drawing({ shapes, size }: { shapes: IconShape[]; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {shapes.map((s, i) => <Shape key={i} s={s} />)}
    </Svg>
  );
}

/** Dibujo del tipo de mascota (perro, gato…); la huella si no se conoce. */
export function PetTypeIcon({ type, size = 24 }: { type: string | null; size?: number }) {
  return <Drawing shapes={PET_TYPE_SHAPES[type ?? ''] ?? PET_TYPE_SHAPES.otro} size={size} />;
}

/**
 * Icono de una rutina a partir de su emoji (pet_routines.emoji). Si es uno sin
 * dibujo (de antes), se ve el emoji tal cual.
 */
export function RoutineIcon({ emoji, size = 24 }: { emoji: string; size?: number }) {
  const shapes = ROUTINE_SHAPES[emoji];
  if (shapes) return <Drawing shapes={shapes} size={size} />;
  return <Text style={{ fontSize: size * 0.8, lineHeight: size }}>{emoji}</Text>;
}
