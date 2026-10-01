import { View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '../ui/Text';
import { useTheme } from '../../lib/theme';
import { petEmoji } from '../../lib/pets';

type PetAvatarProps = {
  /** Foto (pets.photo_url) o, si no tiene, el emoji de su tipo. */
  photoUrl: string | null;
  type: string | null;
  size?: number;
};

/** Foto redonda de la mascota con borde de tinta, o su emoji sobre mostaza. */
export function PetAvatar({ photoUrl, type, size = 52 }: PetAvatarProps) {
  const theme = useTheme();
  const frame = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.outline,
  };
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[frame, { backgroundColor: theme.colors.surfaceAlt }]} contentFit="cover" />;
  }
  return (
    <View style={[frame, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.mustard }]}>
      <Text style={{ fontSize: size * 0.54, lineHeight: size * 0.66 }}>{petEmoji(type)}</Text>
    </View>
  );
}

/** La manada: las fotos de las mascotas montadas unas sobre otras (hasta 3). */
export function PackAvatar({ pets, size = 52 }: { pets: { id: string; photo_url: string | null; type: string | null }[]; size?: number }) {
  const shown = pets.slice(0, 3);
  if (shown.length <= 1) return <PetAvatar photoUrl={shown[0]?.photo_url ?? null} type={shown[0]?.type ?? null} size={size} />;
  const small = Math.round(size * 0.72);
  const step = (size - small) / (shown.length - 1);
  return (
    <View style={{ width: size, height: size }}>
      {shown.map((p, i) => (
        <View key={p.id} style={{ position: 'absolute', left: i * step, top: i % 2 === 0 ? 0 : size - small }}>
          <PetAvatar photoUrl={p.photo_url} type={p.type} size={small} />
        </View>
      ))}
    </View>
  );
}
