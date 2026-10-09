import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import * as Device from 'expo-device';
import { Bug, Lightbulb, type LucideIcon } from 'lucide-react-native';
import { Alert } from '../../lib/alert';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { versionLabel } from '../../lib/appInfo';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../lib/theme';

export type FeedbackKind = 'suggestion' | 'bug';

const KINDS: Record<FeedbackKind, { label: string; Icon: LucideIcon; placeholder: string }> = {
  suggestion: { label: 'Sugerencia', Icon: Lightbulb, placeholder: 'Ej. Me gustaría poder repetir la compra de la semana pasada…' },
  bug: { label: 'Algo falla', Icon: Bug, placeholder: 'Qué hacías, qué pasó y qué esperabas que pasara…' },
};

const MESSAGE_MAX = 2000;

/** Móvil y navegador, para poder reproducir un fallo. */
function deviceLabel(): string {
  if (Platform.OS === 'web') return typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : 'web';
  return [Device.manufacturer, Device.modelName, Device.osName, Device.osVersion].filter(Boolean).join(' ').slice(0, 300);
}

type FeedbackModalProps = {
  visible: boolean;
  onClose: () => void;
};

/** Mandar una sugerencia o reportar un fallo. Va con la versión de la app y el dispositivo. */
export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const [kind, setKind] = useState<FeedbackKind>('suggestion');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setKind('suggestion');
    setMessage('');
  }, [visible]);

  async function send() {
    const trimmed = message.trim();
    if (!trimmed || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        kind,
        message: trimmed,
        app_version: versionLabel(),
        device: deviceLabel(),
      });
      if (error) {
        // La RLS solo deja 10 por hora: si salta, es eso.
        const tooMany = error.code === '42501';
        Alert.alert('No se pudo enviar', tooMany ? 'Has enviado muchas seguidas. Prueba otra vez dentro de un rato.' : error.message);
        return;
      }
      onClose();
      Alert.alert('¡Gracias!', kind === 'bug' ? 'Lo miramos para arreglarlo cuanto antes.' : 'Nos ayuda mucho a mejorar HOMI.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={{ flex: 1, minHeight: 60, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
        <ScrollView
          style={{ flexGrow: 0, maxHeight: '88%', backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl }}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 36 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }} />
          <View>
            <Text variant="heading">Sugerencias y errores</Text>
            <Text variant="caption" color="secondary">Cuéntanos qué mejorarías o qué no funciona.</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(Object.keys(KINDS) as FeedbackKind[]).map((k) => {
              const on = kind === k;
              const { label, Icon } = KINDS[k];
              return (
                <Pressable key={k} onPress={() => setKind(k)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: theme.radii.pill,
                      borderWidth: theme.borderWidth,
                      borderColor: on ? theme.colors.outline : 'transparent',
                      backgroundColor: on ? theme.colors.peach : theme.colors.surface,
                    }}
                  >
                    <Icon size={18} color={on ? theme.colors.textOnFill : theme.colors.textSecondary} />
                    <Text variant="label" color={on ? 'onFill' : 'secondary'}>{label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Input
            placeholder={KINDS[kind].placeholder}
            value={message}
            onChangeText={setMessage}
            autoFocus
            maxLength={MESSAGE_MAX}
            multiline
            style={{ minHeight: 140, textAlignVertical: 'top' }}
          />
          <Text variant="caption" color="secondary" style={{ marginTop: -8 }}>
            Se envía con tu versión de HOMI ({versionLabel()}) y el modelo de tu móvil, para encontrar el fallo antes.
          </Text>
          <Button title="Enviar" loading={sending} disabled={!message.trim()} onPress={() => void send()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
