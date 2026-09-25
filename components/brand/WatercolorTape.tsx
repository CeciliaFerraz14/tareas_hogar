import { StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { brand } from '../../lib/theme';

type WatercolorTapeProps = {
  style?: ViewStyle;
};

// Bordes rasgados fijos (no aleatorios) para que la cinta no cambie entre renders.
const TOP_EDGE = [0, 9, 3, 12, 5, 14, 2, 10, 4, 13, 1, 8, 6, 11, 2];
const BOTTOM_EDGE = [4, 12, 2, 14, 7, 1, 11, 5, 13, 3, 9, 0, 12, 6, 10];
const SIDE_WOBBLE = [0, 1.5, -1, 2, 0.5, -1.5, 1, -0.5, 2, 0];

function tapePath(): string {
  const w = 100;
  const h = 400;
  const step = w / (TOP_EDGE.length - 1);
  const top = TOP_EDGE.map((d, i) => `L${(i * step).toFixed(1)} ${d}`).join(' ');
  const rightStep = h / (SIDE_WOBBLE.length - 1);
  const right = SIDE_WOBBLE.map((d, i) => `L${w - 2 + d} ${(i * rightStep).toFixed(1)}`).join(' ');
  const bottom = [...BOTTOM_EDGE]
    .reverse()
    .map((d, i) => `L${(w - i * step).toFixed(1)} ${h - d}`)
    .join(' ');
  const left = [...SIDE_WOBBLE]
    .reverse()
    .map((d, i) => `L${2 + d} ${(h - i * rightStep).toFixed(1)}`)
    .join(' ');
  return `M0 ${TOP_EDGE[0]} ${top} ${right} ${bottom} ${left} Z`;
}

const PATH = tapePath();

// Tira de cinta mostaza con textura de acuarela, como en la pantalla de bienvenida.
export function WatercolorTape({ style }: WatercolorTapeProps) {
  return (
    <Svg
      viewBox="0 0 100 400"
      preserveAspectRatio="none"
      style={[StyleSheet.absoluteFill, style]}
    >
      <Defs>
        <LinearGradient id="tape" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={brand.tape[0]} />
          <Stop offset="0.5" stopColor={brand.tape[1]} />
          <Stop offset="1" stopColor={brand.tape[2]} />
        </LinearGradient>
      </Defs>
      <Path d={PATH} fill="url(#tape)" />
      {/* Manchas de acuarela */}
      <Ellipse cx={30} cy={60} rx={22} ry={30} fill="#FFE9A0" opacity={0.35} />
      <Ellipse cx={72} cy={150} rx={18} ry={40} fill="#FFE08A" opacity={0.25} />
      <Ellipse cx={40} cy={250} rx={26} ry={36} fill="#E9971F" opacity={0.18} />
      <Ellipse cx={70} cy={340} rx={20} ry={28} fill="#FFE39A" opacity={0.25} />
    </Svg>
  );
}
