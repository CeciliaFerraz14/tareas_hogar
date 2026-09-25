import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../lib/theme';
import { Text } from './Text';

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const chars = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return chars.toUpperCase() || '?';
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
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
          backgroundColor: theme.colors.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Text variant="bodyBold" color="primary">
        {initials(name)}
      </Text>
    </View>
  );
}
