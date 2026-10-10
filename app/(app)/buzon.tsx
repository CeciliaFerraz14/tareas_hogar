import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, Bell, Bug, Inbox, Lightbulb } from 'lucide-react-native';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../lib/alert';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import type { Database } from '../../types/database.types';

type FeedbackRow = Database['public']['Functions']['list_inbox']['Returns'][number];
type Status = 'new' | 'seen' | 'done';
type Filter = 'open' | 'done' | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'open', label: 'Por mirar' },
  { value: 'done', label: 'Hechas' },
  { value: 'all', label: 'Todas' },
];

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/** '9 oct · 11:04'. */
function when(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** El userAgent entero no cabe: 'iPhone · Safari', 'Android · Chrome'… Lo nativo ya viene corto. */
function shortDevice(device: string | null): string | null {
  if (!device) return null;
  if (!device.startsWith('Mozilla/')) return device;
  const os = /iPhone|iPad/.test(device) ? (device.match(/iPhone|iPad/)?.[0] ?? 'iOS')
    : /Android/.test(device) ? 'Android'
    : /Macintosh/.test(device) ? 'Mac'
    : /Windows/.test(device) ? 'Windows'
    : 'Otro';
  const browser = /EdgA?\//.test(device) ? 'Edge'
    : /SamsungBrowser/.test(device) ? 'Samsung Internet'
    : /CriOS|Chrome\//.test(device) ? 'Chrome'
    : /FxiOS|Firefox\//.test(device) ? 'Firefox'
    : /Safari\//.test(device) ? 'Safari'
    : 'navegador';
  return `${os} · ${browser}`;
}

/** Buzón: las sugerencias y errores que manda la gente. Solo para private.app_admins. */
export default function InboxScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<FeedbackRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const [refreshing, setRefreshing] = useState(false);
  const [closing, setClosing] = useState<FeedbackRow | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('list_inbox');
    if (error) { Alert.alert('No se pudo cargar el buzón', error.message); return; }
    setItems(data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function setStatus(id: string, status: Status) {
    const previous = items;
    setItems((list) => list?.map((f) => (f.id === id ? { ...f, status } : f)) ?? null);
    const { error } = await supabase.rpc('set_feedback_status', { p_id: id, p_status: status });
    if (error) {
      setItems(previous);
      Alert.alert('No se pudo guardar', error.message);
    }
  }

  /** «Hecha»: si aún no se ha avisado a quien la mandó, primero se pregunta qué se ha hecho. */
  function markDone(item: FeedbackRow) {
    if (item.has_author && !item.done_notified_at) setClosing(item);
    else void setStatus(item.id, 'done');
  }

  async function closeAndNotify(item: FeedbackRow, reply: string) {
    const { error } = await supabase.rpc('close_feedback', { p_id: item.id, p_reply: reply.trim() || undefined });
    if (error) { Alert.alert('No se pudo guardar', error.message); return; }
    setClosing(null);
    void load();
  }

  const all = items ?? [];
  const newCount = all.filter((f) => f.status === 'new').length;
  const shown = all.filter((f) => (filter === 'all' ? true : filter === 'done' ? f.status === 'done' : f.status !== 'done'));

  return (
    <Screen scroll onRefresh={handleRefresh} refreshing={refreshing}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="title">Buzón</Text>
          <Text variant="label">{newCount === 0 ? 'Nada nuevo' : newCount === 1 ? '1 nueva' : `${newCount} nuevas`}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FILTERS.map((f) => {
          const on = filter === f.value;
          return (
            <Pressable key={f.value} onPress={() => setFilter(f.value)} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: theme.radii.pill,
                  borderWidth: theme.borderWidth,
                  borderColor: on ? theme.colors.outline : 'transparent',
                  backgroundColor: on ? theme.colors.peach : theme.colors.surface,
                }}
              >
                <Text variant="label" color={on ? 'onFill' : 'secondary'}>{f.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {items !== null && shown.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 8, paddingVertical: theme.spacing.xl }}>
          <Inbox size={32} color={theme.colors.textSecondary} />
          <Text variant="bodyBold">{filter === 'done' ? 'Aún no has cerrado ninguna' : 'Todo leído'}</Text>
          <Text variant="caption" color="secondary" align="center">
            Cuando alguien mande una sugerencia o un error, te llega un aviso y aparece aquí.
          </Text>
        </Card>
      ) : null}

      {shown.map((f) => (
        <FeedbackCard key={f.id} item={f} onStatus={(s) => (s === 'done' ? markDone(f) : void setStatus(f.id, s))} />
      ))}

      <CloseModal item={closing} onClose={() => setClosing(null)} onConfirm={closeAndNotify} />
    </Screen>
  );
}

function FeedbackCard({ item, onStatus }: { item: FeedbackRow; onStatus: (status: Status) => void }) {
  const theme = useTheme();
  const isBug = item.kind === 'bug';
  const KindIcon = isBug ? Bug : Lightbulb;
  const author = item.author_name ?? item.author_email?.split('@')[0] ?? 'Cuenta borrada';
  const meta = [item.app_version, shortDevice(item.device)].filter(Boolean).join(' · ');

  return (
    <Card style={{ gap: 10, opacity: item.status === 'done' ? 0.7 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: theme.radii.pill,
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.outline,
            backgroundColor: isBug ? theme.colors.peach : theme.colors.lime,
          }}
        >
          <KindIcon size={14} color={theme.colors.textOnFill} />
          <Text variant="label" color="onFill" style={{ fontSize: 12 }}>{isBug ? 'Error' : 'Sugerencia'}</Text>
        </View>
        {item.status === 'new' ? (
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary }} accessibilityLabel="Nueva" />
        ) : null}
        <Text variant="caption" color="secondary" style={{ marginLeft: 'auto' }}>{when(item.created_at)}</Text>
      </View>

      <Text variant="body" selectable>{item.message}</Text>

      <View style={{ gap: 2 }}>
        <Text variant="caption" color="secondary" selectable>
          {author}{item.author_email ? ` · ${item.author_email}` : ''}
        </Text>
        {meta ? <Text variant="caption" color="secondary" selectable>{meta}</Text> : null}
      </View>

      {item.done_notified_at || item.reply ? (
        <View style={{ gap: 2, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
          {item.done_notified_at ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Bell size={14} color={theme.colors.textSecondary} />
              <Text variant="caption" color="secondary">Avisado el {when(item.done_notified_at)}</Text>
            </View>
          ) : null}
          {item.reply ? <Text variant="caption" color="secondary" selectable>«{item.reply}»</Text> : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
        {item.status === 'new' ? <StatusButton label="Vista" onPress={() => onStatus('seen')} /> : null}
        {item.status !== 'done' ? (
          <StatusButton label="Hecha" filled onPress={() => onStatus('done')} />
        ) : (
          <StatusButton label="Reabrir" onPress={() => onStatus('seen')} />
        )}
      </View>
    </Card>
  );
}

function StatusButton({ label, filled = false, onPress }: { label: string; filled?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={6}>
      {({ pressed }) => (
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: theme.radii.pill,
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.outline,
            backgroundColor: filled ? theme.colors.peach : theme.colors.surface,
            ...(pressed ? theme.shadows.none : theme.shadows.small),
            ...(pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : null),
          }}
        >
          <Text variant="label" color={filled ? 'onFill' : 'primary'}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Antes de cerrar una sugerencia: qué se ha hecho, para el aviso a quien la mandó. */
function CloseModal({ item, onClose, onConfirm }: {
  item: FeedbackRow | null;
  onClose: () => void;
  onConfirm: (item: FeedbackRow, reply: string) => Promise<void>;
}) {
  const theme = useTheme();
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [shown, setShown] = useState<FeedbackRow | null>(null);
  // Se queda con la última para que no se vacíe mientras se cierra.
  if (item && item !== shown) { setShown(item); setReply(''); }
  const f = item ?? shown;
  if (!f) return null;

  const isBug = f.kind === 'bug';
  const author = f.author_name ?? f.author_email?.split('@')[0] ?? 'quien la mandó';
  const title = isBug ? '🛠️ Arreglado lo que nos contaste' : '💡 Tu sugerencia ya está en HOMI';
  const message = f.message.length > 90 ? `${f.message.slice(0, 89)}…` : f.message;
  const body = `${reply.trim() || `«${message}»`} · ¡Gracias por contárnoslo!`;

  async function confirm() {
    if (!f) return;
    setSaving(true);
    try { await onConfirm(f, reply); } finally { setSaving(false); }
  }

  return (
    <Modal visible={item !== null} animationType="slide" transparent onRequestClose={onClose}>
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
            <Text variant="heading">{isBug ? 'Error arreglado' : 'Sugerencia hecha'}</Text>
            <Text variant="caption" color="secondary">
              A {author} le llega este aviso, si tiene las notificaciones de HOMI activadas.
            </Text>
          </View>

          <Input
            label="Qué se ha hecho (opcional)"
            placeholder={isBug ? 'Ej. Ya se guardan bien las fotos' : 'Ej. Ya puedes apuntar los gastos fijos en la Hucha'}
            value={reply}
            onChangeText={setReply}
            maxLength={300}
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />

          <Card style={{ gap: 4 }}>
            <Text variant="caption" color="secondary">Así le llegará</Text>
            <Text variant="bodyBold">{title}</Text>
            <Text variant="body">{body}</Text>
          </Card>

          <Button title="Marcar como hecha y avisar" loading={saving} onPress={confirm} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
