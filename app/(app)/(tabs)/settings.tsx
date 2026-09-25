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
import { supabase } from '../../../lib/supabase';
import { passwordResetRedirectUrl } from '../../../lib/authRedirect';
import { requestNotificationPermission } from '../../../lib/notifications';
import { chooseImageSource, pickSquareImage, uploadPublicImage, type ImageSource } from '../../../lib/images';
import { useTheme } from '../../../lib/theme';

type NotifPrefs = {
  enabled: boolean;
  tareas: boolean;
  chat: boolean;
  gastos: boolean;
  compra: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  enabled: false,
  tareas: true,
  chat: true,
  gastos: true,
  compra: true,
};

function notifStorageKey(userId: string) {
  return `notif_prefs_${userId}`;
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const theme = useTheme();

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
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

    const stored = await AsyncStorage.getItem(notifStorageKey(user.id));
    if (stored) {
      try { setPrefs(JSON.parse(stored) as NotifPrefs); } catch { /* ignore corrupt data */ }
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

  async function persistPrefs(next: NotifPrefs) {
    setPrefs(next);
    if (user) await AsyncStorage.setItem(notifStorageKey(user.id), JSON.stringify(next));
  }

  async function toggleMaster(value: boolean) {
    if (value) {
      const permission = await requestNotificationPermission();
      if (permission === 'unavailable') {
        Alert.alert(
          Platform.OS === 'web' ? 'No disponible en la web' : 'No disponible en Expo Go',
          Platform.OS === 'web'
            ? 'Las notificaciones funcionan en la app de iPhone y Android.'
            : 'En Android, Expo Go no permite notificaciones. Funcionarán en la app instalada.',
        );
        return;
      }
      if (permission !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Activa las notificaciones en los ajustes del sistema para recibir avisos de HogarApp.',
        );
        return;
      }
    }
    await persistPrefs({ ...prefs, enabled: value });
  }

  async function toggleSubPref(key: keyof Omit<NotifPrefs, 'enabled'>, value: boolean) {
    await persistPrefs({ ...prefs, [key]: value });
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
          right={sw(prefs.enabled, toggleMaster)}
          first
        />
        {prefs.enabled ? (
          <>
            <SettingsRow
              Icon={CheckSquare}
              label="Tareas asignadas"
              right={sw(prefs.tareas, (v) => void toggleSubPref('tareas', v))}
              indent
            />
            <SettingsRow
              Icon={MessageCircle}
              label="Mensajes del chat"
              right={sw(prefs.chat, (v) => void toggleSubPref('chat', v))}
              indent
            />
            <SettingsRow
              Icon={Wallet}
              label="Nuevos gastos"
              right={sw(prefs.gastos, (v) => void toggleSubPref('gastos', v))}
              indent
            />
            <SettingsRow
              Icon={ShoppingCart}
              label="Lista de la compra"
              right={sw(prefs.compra, (v) => void toggleSubPref('compra', v))}
              indent
              last
            />
          </>
        ) : null}
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
