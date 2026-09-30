import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Alert } from '../../../lib/alert';
import {
  Bell,
  Camera,
  CheckSquare,
  ChevronRight,
  KeyRound,
  LogOut,
  MessageCircle,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Avatar } from '../../../components/ui/Avatar';
import { useAuthStore } from '../../../store/authStore';
import { useOnboardingStore } from '../../../store/onboardingStore';
import { supabase } from '../../../lib/supabase';
import { passwordResetRedirectUrl } from '../../../lib/authRedirect';
import { requestNotificationPermission } from '../../../lib/notifications';
import { versionLabel } from '../../../lib/appInfo';
import { disableWebPush, enableWebPush, getWebPushState, type WebPushState } from '../../../lib/webPush';
import { isInstalledPwa } from '../../../lib/pwaInstall';
import { chooseImageSource, pickSquareImage, uploadPublicImage, type ImageSource } from '../../../lib/images';
import { useTheme } from '../../../lib/theme';

/** De qué avisar. Se guarda en notification_prefs: lo lee la Edge Function send-push. */
type NotifCategories = { tasks: boolean; chat: boolean; expenses: boolean; shopping: boolean };

const ALL_ON: NotifCategories = { tasks: true, chat: true, expenses: true, shopping: true };

/** En la app nativa, el interruptor general solo se recuerda en el móvil. */
function nativeNotifKey(userId: string) {
  return `notif_enabled_${userId}`;
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const openTutorial = useOnboardingStore((s) => s.open);
  const theme = useTheme();
  const router = useRouter();
  // Web en el navegador (no instalada): fila con la guía para instalarla.
  const showInstall = Platform.OS === 'web' && !isInstalledPwa();

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [notifOn, setNotifOn] = useState(false);
  const [categories, setCategories] = useState<NotifCategories>(ALL_ON);
  const [pushState, setPushState] = useState<WebPushState | null>(null);
  const [sendingReset, setSendingReset] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single();
    if (data?.username) setUsername(data.username);
    if (data?.avatar_url) setAvatarUrl(data.avatar_url);

    const { data: prefsRow } = await supabase
      .from('notification_prefs')
      .select('tasks, chat, expenses, shopping')
      .eq('user_id', user.id)
      .maybeSingle();
    setCategories(prefsRow ?? ALL_ON);

    if (Platform.OS === 'web') {
      const state = await getWebPushState();
      setPushState(state);
      setNotifOn(state === 'on');
    } else {
      setNotifOn((await AsyncStorage.getItem(nativeNotifKey(user.id))) === 'true');
    }
  }, [user]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  // ── profile ───────────────────────────────────────────────────────────────

  function openEdit() {
    setEditName(username);
    setEditOpen(true);
  }

  function promptAvatarSource() {
    chooseImageSource('Foto de perfil', (source) => void pickAvatar(source));
  }

  async function pickAvatar(source: ImageSource) {
    if (!user) return;
    const asset = await pickSquareImage(source);
    if (!asset) return;

    setUploadingAvatar(true);
    try {
      const { url, error: uploadError } = await uploadPublicImage('avatars', `${user.id}.jpg`, asset);
      if (uploadError || !url) { Alert.alert('Error al subir la imagen', uploadError ?? ''); return; }

      const { error: dbError } = await supabase
        .from('users')
        .update({ avatar_url: url })
        .eq('id', user.id);
      if (dbError) { Alert.alert('Error al guardar la foto', dbError.message); return; }

      setAvatarUrl(url);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveName() {
    const trimmed = editName.trim();
    if (!trimmed) { Alert.alert('El nombre no puede estar vacío'); return; }
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase.from('users').update({ username: trimmed }).eq('id', user.id);
    setSavingName(false);
    if (error) { Alert.alert('No se pudo guardar', error.message); return; }
    setUsername(trimmed);
    setEditOpen(false);
  }

  // ── notifications ─────────────────────────────────────────────────────────

  async function toggleMaster(value: boolean) {
    if (Platform.OS === 'web') {
      await toggleWebPush(value);
      return;
    }
    if (value) {
      const permission = await requestNotificationPermission();
      if (permission === 'unavailable') {
        Alert.alert('No disponible en Expo Go', 'En Android, Expo Go no permite notificaciones.');
        return;
      }
      if (permission !== 'granted') {
        Alert.alert('Permisos necesarios', 'Activa las notificaciones de HOMI en los ajustes del sistema.');
        return;
      }
    }
    setNotifOn(value);
    if (user) await AsyncStorage.setItem(nativeNotifKey(user.id), String(value));
  }

  // Web / PWA: pedir permiso y suscribir este navegador (tiene que ser al tocar).
  async function toggleWebPush(value: boolean) {
    try {
      if (!value) {
        await disableWebPush();
        setNotifOn(false);
        setPushState('off');
        return;
      }
      const state = await enableWebPush();
      setPushState(state);
      setNotifOn(state === 'on');
      if (state === 'needs-install') {
        Alert.alert(
          'Instala HOMI primero',
          'En iPhone las notificaciones solo funcionan con la app instalada en la pantalla de inicio.',
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Ver cómo', onPress: () => router.push('/instalar') },
          ],
        );
      } else if (state === 'denied') {
        Alert.alert(
          'Notificaciones bloqueadas',
          'Las bloqueaste para esta web. Actívalas en los ajustes del navegador (o del iPhone → Notificaciones → HOMI).',
        );
      } else if (state === 'unsupported') {
        Alert.alert('No disponible', 'Este navegador no admite notificaciones. Prueba con Chrome o con Safari (app instalada).');
      }
    } catch (e) {
      Alert.alert('No se pudieron activar', e instanceof Error ? e.message : String(e));
    }
  }

  async function toggleCategory(key: keyof NotifCategories, value: boolean) {
    const previous = categories;
    const next = { ...categories, [key]: value };
    setCategories(next);
    const { error } = await supabase.from('notification_prefs').upsert(next, { onConflict: 'user_id' });
    if (error) {
      setCategories(previous);
      Alert.alert('No se pudo guardar', error.message);
    }
  }

  // ── account ───────────────────────────────────────────────────────────────

  async function sendPasswordReset() {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: passwordResetRedirectUrl(),
    });
    setSendingReset(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Correo enviado', `Hemos enviado un enlace a ${user.email} para cambiar tu contraseña.`);
  }

  function confirmSignOut() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es permanente y no se puede deshacer. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Solicitud recibida',
              'Para completar la eliminación de tu cuenta envíanos un email a soporte@hogarapp.es',
            ),
        },
      ],
    );
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  const displayName = username || user?.email?.split('@')[0] || 'Usuario';

  const sw = (
    value: boolean,
    onValueChange: (v: boolean) => void,
  ) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      thumbColor="#fff"
    />
  );

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Screen scroll>
      <View style={{ gap: 4, marginTop: 24 }}>
        <Text variant="title">Ajustes</Text>
      </View>

      {/* ── PERFIL ── */}
      <SectionLabel>Perfil</SectionLabel>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable onPress={promptAvatarSource} disabled={uploadingAvatar}>
            <View>
              <Avatar uri={avatarUrl} name={displayName} size={56} />
              <View style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: theme.colors.primary,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5, borderColor: theme.colors.background,
              }}>
                <Camera size={11} color="#fff" />
              </View>
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="bodyBold">{uploadingAvatar ? 'Subiendo foto…' : displayName}</Text>
            <Text variant="caption" color="secondary">{user?.email}</Text>
          </View>
          <Pressable onPress={openEdit} hitSlop={8}>
            <View style={{
              backgroundColor: theme.colors.primaryMuted,
              borderRadius: theme.radii.pill,
              paddingHorizontal: 12, paddingVertical: 6,
            }}>
              <Text variant="label" color="primary">Editar</Text>
            </View>
          </Pressable>
        </View>
      </Card>

      {/* ── NOTIFICACIONES ── */}
      <SectionLabel>Notificaciones</SectionLabel>
      <Card style={{ padding: 0 }}>
        <SettingsRow
          Icon={Bell}
          label="Activar notificaciones"
          right={sw(notifOn, (v) => void toggleMaster(v))}
          first
          last={!notifOn}
        />
        {notifOn ? (
          <>
            <SettingsRow
              Icon={MessageCircle}
              label="Mensajes del chat"
              right={sw(categories.chat, (v) => void toggleCategory('chat', v))}
              indent
            />
            <SettingsRow
              Icon={CheckSquare}
              label="Tareas nuevas, asignadas y hechas"
              right={sw(categories.tasks, (v) => void toggleCategory('tasks', v))}
              indent
            />
            <SettingsRow
              Icon={ShoppingCart}
              label="Lista de la compra"
              right={sw(categories.shopping, (v) => void toggleCategory('shopping', v))}
              indent
            />
            <SettingsRow
              Icon={Wallet}
              label="Gastos de la hucha"
              right={sw(categories.expenses, (v) => void toggleCategory('expenses', v))}
              indent
              last
            />
          </>
        ) : null}
      </Card>
      {Platform.OS !== 'web' ? (
        <Text variant="caption" color="secondary" style={{ marginTop: -8, paddingHorizontal: 4 }}>
          De momento los avisos llegan a la versión web instalada en la pantalla de inicio.
        </Text>
      ) : pushState === 'needs-install' ? (
        <Pressable onPress={() => router.push('/instalar')} accessibilityRole="link" style={{ marginTop: -8, paddingHorizontal: 4 }}>
          <Text variant="caption" color="secondary">
            En iPhone, los avisos solo llegan con HOMI instalada.{' '}
            <Text variant="caption" color="accent" style={{ textDecorationLine: 'underline' }}>Ver cómo instalarla</Text>
          </Text>
        </Pressable>
      ) : null}

      {/* ── AYUDA ── */}
      <SectionLabel>Ayuda</SectionLabel>
      <Card style={{ padding: 0 }}>
        {showInstall ? (
          <SettingsRow
            Icon={Smartphone}
            label="Instalar HOMI en el móvil"
            right={<ChevronRight size={18} color={theme.colors.textSecondary} />}
            onPress={() => router.push('/instalar')}
            first
          />
        ) : null}
        <SettingsRow
          Icon={Sparkles}
          label="Ver tutorial de HOMI"
          right={<ChevronRight size={18} color={theme.colors.textSecondary} />}
          onPress={openTutorial}
          first={!showInstall}
          last
        />
      </Card>

      {/* ── CUENTA ── */}
      <SectionLabel>Cuenta</SectionLabel>
      <Card style={{ padding: 0 }}>
        <SettingsRow
          Icon={KeyRound}
          label={sendingReset ? 'Enviando…' : 'Cambiar contraseña'}
          right={<ChevronRight size={18} color={theme.colors.textSecondary} />}
          onPress={sendingReset ? undefined : () => void sendPasswordReset()}
          first
        />
        <SettingsRow
          Icon={LogOut}
          label="Cerrar sesión"
          labelColor="danger"
          right={<ChevronRight size={18} color={theme.colors.danger} />}
          onPress={confirmSignOut}
        />
        <SettingsRow
          Icon={Trash2}
          label="Eliminar cuenta"
          labelColor="danger"
          right={<ChevronRight size={18} color={theme.colors.danger} />}
          onPress={confirmDelete}
          last
        />
      </Card>

      {/* Versión: para saber qué tiene instalado cada uno al reportar un fallo. */}
      <Text
        variant="caption"
        color="secondary"
        align="center"
        selectable
        style={{ marginTop: theme.spacing.sm, opacity: 0.8 }}
      >
        {versionLabel()}
      </Text>

      {/* ── edit name modal ── */}
      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setEditOpen(false)} />
          <View
            style={{
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
              padding: theme.spacing.lg,
              gap: theme.spacing.lg,
              paddingBottom: 36,
            }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }} />
            <Text variant="heading">Editar nombre</Text>
            <Input
              label="Nombre visible"
              placeholder="Tu nombre"
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />
            <Button title="Guardar" loading={savingName} onPress={() => void saveName()} />
            <Button title="Cancelar" variant="ghost" onPress={() => setEditOpen(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      variant="label"
      color="secondary"
      style={{ paddingHorizontal: 4, marginBottom: -4 }}
    >
      {children.toUpperCase()}
    </Text>
  );
}

type SettingsRowProps = {
  Icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  labelColor?: 'primary' | 'secondary' | 'danger';
  right: React.ReactNode;
  onPress?: () => void;
  indent?: boolean;
  first?: boolean;
  last?: boolean;
};

function SettingsRow({ Icon, label, labelColor, right, onPress, indent, first, last }: SettingsRowProps) {
  const theme = useTheme();
  const iconColor = labelColor === 'danger' ? theme.colors.danger : theme.colors.textSecondary;
  const textColor = labelColor ?? 'primary';

  const inner = (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      paddingLeft: indent ? theme.spacing.xl + theme.spacing.md : theme.spacing.md,
      borderTopWidth: first ? 0 : 1,
      borderTopColor: theme.colors.border,
    }}>
      {!indent ? <Icon size={20} color={iconColor} /> : null}
      <Text variant="body" color={textColor} style={{ flex: 1 }}>{label}</Text>
      {right}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} android_ripple={{ color: theme.colors.border }}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}
