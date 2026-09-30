import { Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { HouseIllustration } from '../../components/brand/HouseIllustration';
import { WatercolorTape } from '../../components/brand/WatercolorTape';
import { brand } from '../../lib/theme';
import { isInstalledPwa } from '../../lib/pwaInstall';

export default function WelcomeScreen() {
  const router = useRouter();
  // Web en el navegador (no instalada): enlace a la guía para instalarla.
  const showInstall = Platform.OS === 'web' && !isInstalledPwa();

  return (
    <LinearGradient
      colors={brand.gradient}
      locations={[0, 0.35, 0.7, 1]}
      style={{ flex: 1 }}
    >
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', alignItems: 'center', marginVertical: 24 }}>
          <View style={{ position: 'absolute', top: 0, bottom: 0, width: '56%' }}>
            <WatercolorTape />
          </View>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingTop: 40 }}>
            <HouseIllustration size={124} />
            <Text variant="display" style={{ color: brand.ink, letterSpacing: 2 }}>
              HOMI
            </Text>
          </View>

          <View style={{ width: '82%', gap: 18, paddingBottom: '22%' }}>
            <Button
              title="Iniciar Sesión"
              variant="primary"
              onPress={() => router.push('/(auth)/login')}
            />
            <Button
              title="Crear Cuenta"
              variant="secondary"
              onPress={() => router.push('/(auth)/register')}
            />
            {showInstall ? (
              <Pressable
                onPress={() => router.push('/instalar')}
                accessibilityRole="link"
                hitSlop={8}
                style={{ alignSelf: 'center' }}
              >
                <Text variant="label" style={{ color: brand.ink, textDecorationLine: 'underline' }}>
                  ¿Cómo la instalo en el móvil?
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
