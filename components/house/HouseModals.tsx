import { useState, type ReactNode } from 'react';
import { Modal, View } from 'react-native';
import { Alert } from '../../lib/alert';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import { useHouseStore } from '../../store/houseStore';

type HouseModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Tras crear o unirse: ese hogar ya es el activo. */
  onDone?: (houseId: string) => void;
};

/** Crea un hogar (RPC create_house) y lo deja como hogar activo. */
export function CreateHouseModal({ visible, onClose, onDone }: HouseModalProps) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  function close() {
    setName('');
    onClose();
  }

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nombre requerido', 'Escribe un nombre para el hogar.');
      return;
    }
    setCreating(true);
    const { data: houseId, error } = await supabase.rpc('create_house', { p_name: trimmed });
    setCreating(false);
    if (error || !houseId) {
      Alert.alert('No se pudo crear el hogar', error?.message ?? 'Error desconocido');
      return;
    }
    await enter(houseId);
    close();
    onDone?.(houseId);
  }

  return (
    <CenteredModal visible={visible} onClose={close}>
      <Text variant="title">Nuevo hogar</Text>
      <Input label="Nombre" placeholder="Mi piso" value={name} onChangeText={setName} autoFocus maxLength={60} />
      <Button title="Crear" loading={creating} onPress={create} />
      <Button title="Cancelar" variant="ghost" onPress={close} />
    </CenteredModal>
  );
}

/** Se une a un hogar con un código de invitación (RPC accept_invitation). */
export function JoinHouseModal({ visible, onClose, onDone }: HouseModalProps) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  function close() {
    setCode('');
    onClose();
  }

  async function join() {
    const token = code.trim();
    if (!token) {
      Alert.alert('Código requerido', 'Pega el código que te han compartido.');
      return;
    }
    setJoining(true);
    const { data: houseId, error } = await supabase.rpc('accept_invitation', { p_token: token });
    setJoining(false);
    if (error || !houseId) {
      Alert.alert('No se pudo unir al hogar', error?.message ?? 'Código no válido.');
      return;
    }
    await enter(houseId);
    close();
    onDone?.(houseId);
  }

  return (
    <CenteredModal visible={visible} onClose={close}>
      <Text variant="title">Unirse a un hogar</Text>
      <Text variant="body" color="secondary">Pega el código de acceso que te han compartido.</Text>
      <Input
        label="Código"
        placeholder="abc123..."
        autoCapitalize="none"
        autoCorrect={false}
        value={code}
        onChangeText={setCode}
        autoFocus
      />
      <Button title="Unirse" loading={joining} onPress={join} />
      <Button title="Cancelar" variant="ghost" onPress={close} />
    </CenteredModal>
  );
}

/** El hogar nuevo entra en la lista y pasa a ser el activo. */
async function enter(houseId: string) {
  const { loadHouses, setCurrentHouse } = useHouseStore.getState();
  await loadHouses();
  setCurrentHouse(houseId);
}

function CenteredModal({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const theme = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: theme.spacing.lg }}>
        <View style={{ backgroundColor: theme.colors.background, borderRadius: theme.radii.lg, padding: theme.spacing.lg, gap: theme.spacing.lg }}>
          {children}
        </View>
      </View>
    </Modal>
  );
}
