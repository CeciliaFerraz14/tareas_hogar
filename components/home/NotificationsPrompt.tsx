import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Bell, Smartphone, X } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { Alert } from '../../lib/alert';
import { useTheme } from '../../lib/theme';
import { enableWebPush, getWebPushState, type WebPushState } from '../../lib/webPush';

const DISMISSED_KEY = 'notif_prompt_dismissed';

/**
 * Tarjeta de Inicio (solo web) que invita a activar las notificaciones, o a
 * instalar la app en el iPhone, que es lo que hace falta para recibirlas.
 */
export function NotificationsPrompt() {
  const theme = useTheme();
  const router = useRouter();
  const [state, setState] = useState<WebPushState | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    void (async () => {
      setDismissed((await AsyncStorage.getItem(DISMISSED_KEY)) === 'true');
      setState(await getWebPushState());
    })();
  }, []);

  if (Platform.OS !== 'web' || dismissed || (state !== 'off' && state !== 'needs-install')) return null;

  function dismiss() {
    setDismissed(true);
    void AsyncStorage.setItem(DISMISSED_KEY, 'true');
  }

  async function activate() {
    setBusy(true);
    try {
      const next = await enableWebPush();
      setState(next);
      if (next === 'denied') {
        Alert.alert('Notificaciones bloqueadas', 'Puedes activarlas más tarde en los ajustes del navegador.');
      }
    } catch (e) {
      Alert.alert('No se pudieron activar', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const needsInstall = state === 'needs-install';
  const Icon = needsInstall ? Smartphone : Bell;

  return (
    <Card style={{ ...theme.shadows.small, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.peach,
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.outline,
          }}
        >
          <Icon size={20} color={theme.colors.textOnFill} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyBold">{needsInstall ? 'Instala HOMI para recibir avisos' : 'Entérate al momento'}</Text>
          <Text variant="caption" color="secondary">
            {needsInstall
              ? 'En iPhone, los avisos solo llegan a la app instalada en la pantalla de inicio.'
              : 'Te avisamos cuando te escriban, te asignen una tarea o añadan algo a la compra.'}
          </Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="No mostrar más">
          <X size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
      {needsInstall ? (
        <Button title="Ver cómo instalarla" onPress={() => router.push('/instalar')} />
      ) : (
        <Button title="Activar notificaciones" loading={busy} onPress={() => void activate()} />
      )}
    </Card>
  );
}
