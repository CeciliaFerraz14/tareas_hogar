import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { brand } from '../../lib/theme';

type HouseIllustrationProps = {
  size?: number;
};

// Casita dibujada a mano del logo HOMI.
export function HouseIllustration({ size = 120 }: HouseIllustrationProps) {
  const stroke = {
    stroke: brand.ink,
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size * 0.95} viewBox="0 0 120 114">
      {/* Chimenea */}
      <Rect x={80} y={18} width={11} height={24} fill={brand.peach300} {...stroke} />
      <Line x1={77} y1={18} x2={94} y2={18} {...stroke} />

      {/* Fachada y tejado */}
      <Path d="M24 54 L24 104 L96 104 L96 54 L60 22 Z" fill="#FAD9C8" {...stroke} />
      <Path d="M12 60 L60 16 L108 60" fill="none" {...stroke} strokeWidth={3.5} />
      <Path d="M18 58 L60 21 L102 58" fill="none" {...stroke} strokeWidth={2} />

      {/* Corazón */}
      <Path
        d="M60 52 C49 44 50 34 56 34.5 C58.5 34.7 60 37 60 38.5 C60 37 61.5 34.7 64 34.5 C70 34 71 44 60 52 Z"
        fill={brand.peach300}
        {...stroke}
        strokeWidth={2.5}
      />

      {/* Ventanas */}
      <Rect x={31} y={70} width={15} height={14} rx={1.5} fill="#FFF3EA" {...stroke} strokeWidth={2.5} />
      <Line x1={38.5} y1={70} x2={38.5} y2={84} {...stroke} strokeWidth={2} />
      <Line x1={31} y1={77} x2={46} y2={77} {...stroke} strokeWidth={2} />
      <Rect x={74} y={70} width={15} height={14} rx={1.5} fill="#FFF3EA" {...stroke} strokeWidth={2.5} />
      <Line x1={81.5} y1={70} x2={81.5} y2={84} {...stroke} strokeWidth={2} />
      <Line x1={74} y1={77} x2={89} y2={77} {...stroke} strokeWidth={2} />

      {/* Puerta */}
      <Path d="M51 104 L51 80 Q60 68 69 80 L69 104" fill="#F4A98A" {...stroke} />
      <Circle cx={64.5} cy={92} r={1.6} fill={brand.ink} />

      {/* Suelo */}
      <Line x1={16} y1={104} x2={104} y2={104} {...stroke} />
    </Svg>
  );
}
