import { View } from 'react-native';
import { Image } from 'expo-image';
import { Home } from 'lucide-react-native';
import { useTheme } from '../../lib/theme';

type HouseAvatarProps = {
  uri?: string | null;
  size?: number;
  /** Resalta el icono por defecto (p. ej. hogar principal). */
  highlighted?: boolean;
};

/** Foto del hogar, o la casita de siempre si aún no tiene. */
export function HouseAvatar({ uri, size = 44, highlighted = false }: HouseAvatarProps) {
  const theme = useTheme();
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[dimension, { backgroundColor: theme.colors.surfaceAlt }]}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={[
        dimension,
        {
          backgroundColor: highlighted ? theme.colors.primary : theme.colors.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Home size={size / 2} color={highlighted ? '#fff' : theme.colors.primary} />
    </View>
  );
}
