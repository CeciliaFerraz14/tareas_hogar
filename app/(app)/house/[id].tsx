import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Share, TextInput, View } from 'react-native';
import { Alert } from '../../../lib/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  MoreVertical,
  Pencil,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { HouseAvatar } from '../../../components/ui/HouseAvatar';
import { Input } from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';
import { chooseImageSource, pickSquareImage, uploadPublicImage, type ImageSource } from '../../../lib/images';
import { useTheme } from '../../../lib/theme';
import { useAuthStore } from '../../../store/authStore';
import { useHouseStore, useSyncActiveHouse } from '../../../store/houseStore';

type House = { id: string; name: string; avatar_url: string | null };

type Member = {
  role: 'owner' | 'member';
  joined_at: string;
  users: {
    id: string;
    email: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export default function HouseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const forgetHouse = useHouseStore((s) => s.forgetHouse);
  const loadHouses = useHouseStore((s) => s.loadHouses);
  useSyncActiveHouse(id);

  const [house, setHouse] = useState<House | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  // 3-dot menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Rename modal
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const renameInputRef = useRef<TextInput>(null);

  // Members modal
  const [membersOpen, setMembersOpen] = useState(false);

  // House photo
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [houseRes, membersRes] = await Promise.all([
      supabase.from('houses').select('id, name, avatar_url').eq('id', id).maybeSingle(),
      supabase
        .from('house_members')
        .select('role, joined_at, users:user_id (id, email, username, avatar_url)')
        .eq('house_id', id)
        .order('joined_at', { ascending: true }),
    ]);
    setLoading(false);

    if (houseRes.error) {
      Alert.alert('Error al cargar el hogar', houseRes.error.message);
      return;
    }
    if (membersRes.error) {
      Alert.alert('Error al cargar miembros', membersRes.error.message);
      return;
    }
    if (!houseRes.data) {
      // El hogar ya no existe o ya no soy miembro: no mostrar un hogar fantasma.
      forgetHouse(id);
      Alert.alert('Hogar no disponible', 'Este hogar ya no existe o ya no eres miembro.');
      router.replace('/(app)/(tabs)');
      return;
    }
    setHouse(houseRes.data);
    setMembers((membersRes.data ?? []) as unknown as Member[]);
  }, [id, forgetHouse, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createInvitation() {
    if (!id) return;
    setInviting(true);
    const { data, error } = await supabase
      .from('invitations')
      .insert({ house_id: id, invited_email: '' })
      .select('token')
      .single();
    setInviting(false);
    if (error || !data) {
      Alert.alert('No se pudo generar el código', error?.message ?? 'Error desconocido');
      return;
    }
    setInviteToken(data.token);
  }

  async function shareInvite() {
    if (!inviteToken || !house) return;
    await Share.share({
      message:
        `¡Te invito a unirte a "${house.name}" en HogarApp! 🏠\n\n` +
        `Usa este código en la app: ${inviteToken}\n\n` +
        `Si aún no tienes cuenta, descarga HogarApp y regístrate primero.`,
    });
  }

  function openInvite() {
    setMenuOpen(false);
    setInviteToken(null);
    setInviteOpen(true);
    void createInvitation();
  }

  function closeInvite() {
    setInviteOpen(false);
    setInviteToken(null);
  }

  function openRename() {
    setNewName(house?.name ?? '');
    setMenuOpen(false);
    setRenameOpen(true);
    setTimeout(() => renameInputRef.current?.focus(), 100);
  }

  async function saveRename() {
    const trimmed = newName.trim();
    if (!trimmed || !id) return;
    setRenaming(true);
    const { error } = await supabase
      .from('houses')
      .update({ name: trimmed })
      .eq('id', id);
    setRenaming(false);
    if (error) {
      Alert.alert('No se pudo cambiar el nombre', error.message);
      return;
    }
    setHouse((prev) => (prev ? { ...prev, name: trimmed } : prev));
    setRenameOpen(false);
  }

  function promptHousePhoto() {
    const ask = () => chooseImageSource('Foto del hogar', (source) => void changeHousePhoto(source));
    if (!menuOpen) { ask(); return; }
    // En iOS un Alert lanzado mientras el modal se cierra puede no llegar a mostrarse.
    setMenuOpen(false);
    setTimeout(ask, 350);
  }

  async function changeHousePhoto(source: ImageSource) {
    if (!id) return;
    const asset = await pickSquareImage(source);
    if (!asset) return;

    setUploadingPhoto(true);
    try {
      const { url, error: uploadError } = await uploadPublicImage('house-avatars', `${id}.jpg`, asset);
      if (uploadError || !url) { Alert.alert('Error al subir la imagen', uploadError ?? ''); return; }

      const { error } = await supabase.rpc('set_house_avatar', { p_house_id: id, p_avatar_url: url });
      if (error) { Alert.alert('No se pudo cambiar la foto', error.message); return; }

      setHouse((prev) => (prev ? { ...prev, avatar_url: url } : prev));
    } finally {
      setUploadingPhoto(false);
    }
  }

  function openMembers() {
    setMenuOpen(false);
    setMembersOpen(true);
  }

  async function removeMember(userId: string, username: string | null | undefined) {
    Alert.alert(
      'Eliminar miembro',
      `¿Quieres eliminar a ${username ?? 'este miembro'} del hogar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('house_members')
              .delete()
              .eq('house_id', id)
              .eq('user_id', userId);
            if (error) {
              Alert.alert('Error', error.message);
              return;
            }
            setMembers((prev) => prev.filter((m) => m.users?.id !== userId));
          },
        },
      ],
    );
  }

  function confirmDeleteHouse() {
    setMenuOpen(false);
    Alert.alert(
      'Eliminar hogar',
      `¿Seguro que quieres eliminar "${house?.name ?? 'este hogar'}"? Se borrarán todas las tareas, gastos y datos asociados. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void deleteHouse() },
      ],
    );
  }

  async function deleteHouse() {
    if (!id) return;
    const { error } = await supabase.from('houses').delete().eq('id', id);
    if (error) { Alert.alert('No se pudo eliminar el hogar', error.message); return; }
    forgetHouse(id);
    void loadHouses();
    router.replace('/(app)/(tabs)');
  }

  const isOwner = members.some((m) => m.users?.id === currentUserId && m.role === 'owner');

  return (
    <Screen scroll>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text variant="caption" color="secondary" style={{ flex: 1, marginLeft: 8 }}>
          Ajustes del hogar
        </Text>
        <Pressable
          onPress={() => setMenuOpen(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Opciones del hogar"
        >
          <MoreVertical size={24} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable
          onPress={promptHousePhoto}
          disabled={uploadingPhoto}
          accessibilityRole="button"
          accessibilityLabel="Cambiar foto del hogar"
          style={{ opacity: uploadingPhoto ? 0.5 : 1 }}
        >
          <HouseAvatar uri={house?.avatar_url} size={64} />
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: theme.colors.primary,
              borderWidth: 2,
              borderColor: theme.colors.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Camera size={12} color="#fff" />
          </View>
        </Pressable>
        <Text variant="title" style={{ flex: 1 }}>
          {loading ? 'Cargando…' : (house?.name ?? 'Hogar')}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="label" color="secondary">
          Miembros ({members.length})
        </Text>
        <Card>
          <View style={{ gap: 14 }}>
            {members.map((m) => (
              <View
                key={m.users?.id ?? m.joined_at}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <Avatar
                  uri={m.users?.avatar_url}
                  name={m.users?.username ?? m.users?.email}
                  size={40}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold">{m.users?.username ?? m.users?.email ?? '—'}</Text>
                  <Text variant="caption" color="secondary">
                    {m.role === 'owner' ? 'Propietario/a' : 'Miembro'}
                  </Text>
                </View>
              </View>
            ))}
            {!loading && members.length === 0 ? (
              <Text variant="caption" color="secondary">
                Aún no hay miembros.
              </Text>
            ) : null}
          </View>
        </Card>
      </View>

      {/* ── 3-dot menu modal ── */}
      <Modal
        visible={menuOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setMenuOpen(false)}
        >
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
              padding: theme.spacing.lg,
              gap: 4,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.border,
                alignSelf: 'center',
                marginBottom: theme.spacing.sm,
              }}
            />
            <Text variant="label" color="secondary" style={{ marginBottom: 4 }}>
              {house?.name ?? 'Hogar'}
            </Text>

            <MenuOption
              icon={<Camera size={20} color={theme.colors.textPrimary} />}
              label="Cambiar foto"
              onPress={promptHousePhoto}
              theme={theme}
            />
            <MenuOption
              icon={<Pencil size={20} color={theme.colors.textPrimary} />}
              label="Editar nombre"
              onPress={openRename}
              theme={theme}
            />
            <MenuOption
              icon={<Users size={20} color={theme.colors.textPrimary} />}
              label="Gestionar miembros"
              onPress={openMembers}
              theme={theme}
            />
            <MenuOption
              icon={<UserPlus size={20} color={theme.colors.textPrimary} />}
              label="Invitar a alguien"
              onPress={openInvite}
              theme={theme}
            />
            {isOwner ? (
              <MenuOption
                icon={<Trash2 size={20} color={theme.colors.danger} />}
                label="Eliminar hogar"
                labelColor={theme.colors.danger}
                onPress={confirmDeleteHouse}
                theme={theme}
              />
            ) : null}

            <View style={{ height: theme.spacing.md }} />
          </View>
        </Pressable>
      </Modal>

      {/* ── Rename modal ── */}
      <Modal
        visible={renameOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRenameOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.radii.lg,
              padding: theme.spacing.lg,
              gap: theme.spacing.lg,
            }}
          >
            <Text variant="title">Editar nombre</Text>
            <Input
              ref={renameInputRef}
              label="Nombre del hogar"
              value={newName}
              onChangeText={setNewName}
              placeholder="Nombre del hogar"
              returnKeyType="done"
              onSubmitEditing={saveRename}
            />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancelar" variant="ghost" onPress={() => setRenameOpen(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Guardar"
                  onPress={saveRename}
                  loading={renaming}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Members management modal ── */}
      <Modal
        visible={membersOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setMembersOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
              padding: theme.spacing.lg,
              gap: theme.spacing.md,
              maxHeight: '70%',
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.border,
                alignSelf: 'center',
              }}
            />
            <Text variant="title">Miembros ({members.length})</Text>
            {members.map((m) => (
              <View
                key={m.users?.id ?? m.joined_at}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <Avatar
                  uri={m.users?.avatar_url}
                  name={m.users?.username ?? m.users?.email}
                  size={44}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold">{m.users?.username ?? m.users?.email ?? '—'}</Text>
                  <Text variant="caption" color="secondary">
                    {m.role === 'owner' ? 'Propietario/a' : 'Miembro'}
                  </Text>
                </View>
                {isOwner && m.role !== 'owner' && m.users?.id !== currentUserId ? (
                  <Pressable
                    hitSlop={10}
                    onPress={() => removeMember(m.users!.id, m.users?.username ?? m.users?.email)}
                    accessibilityLabel="Eliminar miembro"
                  >
                    <UserMinus size={20} color={theme.colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Button title="Cerrar" variant="ghost" onPress={() => setMembersOpen(false)} />
          </View>
        </View>
      </Modal>

      {/* ── Invite modal ── */}
      <Modal
        visible={inviteOpen}
        animationType="slide"
        transparent
        onRequestClose={closeInvite}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.radii.lg,
              padding: theme.spacing.lg,
              gap: theme.spacing.lg,
            }}
          >
            <View style={{ alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: theme.colors.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserPlus size={28} color={theme.colors.primary} />
              </View>
              <Text variant="title">Invitar al hogar</Text>
              <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
                Comparte el código con quien quieras. Pueden unirse aunque no tengan cuenta aún.
              </Text>
            </View>

            {inviting ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Text variant="body" color="secondary">Generando código…</Text>
              </View>
            ) : inviteToken ? (
              <>
                <Card>
                  <Text variant="bodyBold" style={{ textAlign: 'center', letterSpacing: 3, fontSize: 18 }}>
                    {inviteToken}
                  </Text>
                </Card>
                <Button title="Compartir por mensaje" onPress={shareInvite} />
              </>
            ) : null}

            <Button title="Cerrar" variant="ghost" onPress={closeInvite} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

type MenuOptionProps = {
  icon: React.ReactNode;
  label: string;
  labelColor?: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
};

function MenuOption({ icon, label, labelColor, onPress, theme }: MenuOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radii.md,
        backgroundColor: pressed ? theme.colors.surface : 'transparent',
      })}
    >
      {icon}
      <Text variant="bodyBold" style={{ color: labelColor ?? theme.colors.textPrimary }}>
        {label}
      </Text>
    </Pressable>
  );
}
