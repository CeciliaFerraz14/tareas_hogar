import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  Pressable,
  View,
} from 'react-native';
import { Alert } from '../../../../lib/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { ArrowLeft, Check, CheckCheck, SendHorizontal } from 'lucide-react-native';
import { Screen } from '../../../../components/ui/Screen';
import { Text } from '../../../../components/ui/Text';
import { Avatar } from '../../../../components/ui/Avatar';
import { ComposerBar } from '../../../../components/ui/ComposerBar';
import { useAuthStore } from '../../../../store/authStore';
import { supabase } from '../../../../lib/supabase';
import { subscribeToHouseTables } from '../../../../lib/realtime';
import { messageStatus, type ChatMember, type ChatReceipt, type MessageStatus } from '../../../../lib/chatReceipts';
import { useTheme } from '../../../../lib/theme';

type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  sender_name: string | null;
  sender_avatar: string | null;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

export default function ChatScreen() {
  const { id: houseId } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const theme = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [receipts, setReceipts] = useState<ChatReceipt[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (!houseId) return;
    const { data, error } = await supabase
      .from('house_messages')
      .select('id, user_id, content, created_at, users:user_id (username, avatar_url)')
      .eq('house_id', houseId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) { Alert.alert('Error al cargar mensajes', error.message); return; }
    setMessages(
      (data ?? []).map((m) => {
        const u = m.users as { username: string | null; avatar_url: string | null } | null;
        return {
          id: m.id,
          user_id: m.user_id,
          content: m.content,
          created_at: m.created_at,
          sender_name: u?.username ?? null,
          sender_avatar: u?.avatar_url ?? null,
        };
      }),
    );
  }, [houseId]);

  // Hasta dónde le ha llegado / ha leído cada miembro (para los checks).
  const loadReceipts = useCallback(async () => {
    if (!houseId) return;
    const [membersRes, receiptsRes] = await Promise.all([
      supabase.from('house_members').select('user_id, joined_at').eq('house_id', houseId),
      supabase.from('house_chat_reads').select('user_id, delivered_at, read_at').eq('house_id', houseId),
    ]);
    if (membersRes.data) setMembers(membersRes.data);
    if (receiptsRes.data) setReceipts(receiptsRes.data);
  }, [houseId]);

  useEffect(() => { void loadMessages(); void loadReceipts(); }, [loadMessages, loadReceipts]);

  // Realtime por Broadcast: mensajes (nuevos y borrados) y checks de los demás.
  useEffect(() => {
    if (!houseId) return;
    const offMessages = subscribeToHouseTables(houseId, ['house_messages'], () => { void loadMessages(); });
    const offReceipts = subscribeToHouseTables(houseId, ['house_chat_reads'], () => { void loadReceipts(); });
    return () => { offMessages(); offReceipts(); };
  }, [houseId, loadMessages, loadReceipts]);

  // Check de "leído": con el chat en pantalla y la app en primer plano, marca
  // como leído hasta el último mensaje de los demás.
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  const lastMarkedRead = useRef<string | null>(null);
  useEffect(() => {
    if (!houseId || !appActive) return;
    const lastFromOthers = [...messages].reverse().find((m) => m.user_id !== user?.id);
    if (!lastFromOthers || lastMarkedRead.current === lastFromOthers.created_at) return;
    lastMarkedRead.current = lastFromOthers.created_at;
    void supabase.rpc('mark_chat_read', { p_house_id: houseId, p_up_to: lastFromOthers.created_at });
  }, [houseId, messages, appActive, user?.id]);

  // scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  // Al abrir el teclado, que los últimos mensajes sigan a la vista.
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  useEffect(() => {
    if (keyboardVisible) listRef.current?.scrollToEnd({ animated: true });
  }, [keyboardVisible]);

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !houseId || !user) return;
    setSending(true);
    setDraft('');
    try {
      const { error } = await supabase.from('house_messages').insert({
        house_id: houseId,
        user_id: user.id,
        content: text,
      });
      if (error) {
        setDraft(text);
        Alert.alert('No se pudo enviar', error.message);
      }
    } finally {
      setSending(false);
    }
  }

  // group messages: inject date separators
  type ListItem = { type: 'date'; label: string; key: string } | { type: 'msg'; msg: Message };
  const listData: ListItem[] = [];
  let lastDate = '';
  for (const msg of messages) {
    const d = new Date(msg.created_at).toDateString();
    if (d !== lastDate) {
      lastDate = d;
      listData.push({ type: 'date', label: formatDate(msg.created_at), key: `date-${d}` });
    }
    listData.push({ type: 'msg', msg });
  }

  const myId = user?.id;

  const statusById = useMemo(() => {
    const map = new Map<string, MessageStatus>();
    for (const m of messages) {
      if (m.user_id === myId) map.set(m.id, messageStatus(m, members, receipts));
    }
    return map;
  }, [messages, members, receipts, myId]);

  return (
    <Screen contentStyle={{ padding: 0, gap: 0 }} avoidKeyboard={false}>
      {/* header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginTop: 16, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="heading">Chat</Text>
        </View>
      </View>

      {/* keyboard-controller: el mismo comportamiento en iOS y en Android (edge-to-edge),
          midiendo su posición bajo la cabecera. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" automaticOffset>
        {/* messages */}
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(item) => item.type === 'date' ? item.key : item.msg.id}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: 4, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <Text variant="body" color="secondary">Sé el primero en escribir algo.</Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'date') {
              return (
                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                  <View style={{ backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: theme.radii.pill }}>
                    <Text variant="caption" color="secondary">{item.label}</Text>
                  </View>
                </View>
              );
            }
            const { msg } = item;
            const isMe = msg.user_id === myId;
            return (
              <View style={{ flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                {!isMe ? (
                  <Avatar uri={msg.sender_avatar} name={msg.sender_name ?? undefined} size={32} />
                ) : null}
                <View style={{ maxWidth: '75%', gap: 2 }}>
                  {!isMe && msg.sender_name ? (
                    <Text variant="caption" color="secondary" style={{ marginLeft: 4 }}>{msg.sender_name}</Text>
                  ) : null}
                  <View style={{
                    backgroundColor: isMe ? theme.colors.primary : theme.colors.surface,
                    borderRadius: theme.radii.lg,
                    borderBottomRightRadius: isMe ? 4 : theme.radii.lg,
                    borderBottomLeftRadius: isMe ? theme.radii.lg : 4,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}>
                    <Text variant="body" color={isMe ? 'inverse' : 'primary'}>{msg.content}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: isMe ? 'flex-end' : 'flex-start', marginHorizontal: 4 }}>
                    <Text variant="caption" color="secondary">{formatTime(msg.created_at)}</Text>
                    {isMe ? <ReceiptTicks status={statusById.get(msg.id) ?? 'sent'} /> : null}
                  </View>
                </View>
              </View>
            );
          }}
        />

        <ComposerBar
          value={draft}
          onChangeText={setDraft}
          onSubmit={sendMessage}
          busy={sending}
          placeholder="Escribe un mensaje…"
          icon={SendHorizontal}
          accessibilityLabel="Enviar mensaje"
          multiline
          maxLength={2000} // límite de house_messages.content
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const RECEIPT_LABELS: Record<MessageStatus, string> = {
  sent: 'Enviado',
  delivered: 'Entregado',
  read: 'Leído',
};

/** ✓ enviado · ✓✓ entregado · ✓✓ azul leído. */
function ReceiptTicks({ status }: { status: MessageStatus }) {
  const theme = useTheme();
  const Icon = status === 'sent' ? Check : CheckCheck;
  return (
    <View accessible accessibilityLabel={RECEIPT_LABELS[status]}>
      <Icon
        size={15}
        strokeWidth={2.6}
        color={status === 'read' ? theme.colors.read : theme.colors.textSecondary}
      />
    </View>
  );
}
