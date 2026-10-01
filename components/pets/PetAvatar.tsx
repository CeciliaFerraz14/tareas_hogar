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
