import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Alert } from '../../../lib/alert';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, MessageCircle } from 'lucide-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { useAuthStore } from '../../../store/authStore';
import { useHouseStore } from '../../../store/houseStore';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../lib/theme';

type HouseChat = {
  id: string;
  name: string;
  lastMessage: string | null;
  lastTime: string | null;
};

function formatPreviewTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function ChatTabScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setCurrentHouse = useHouseStore((s) => s.setCurrentHouse);
  const userId = useAuthStore((s) => s.user?.id);

  const [chats, setChats] = useState<HouseChat[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = useCallback(async () => {
    if (!userId) return;
    // 1. Mis hogares, en el mismo orden que en la pestaña Hogares
    const { data: memberRows, error: memberErr } = await supabase
      .from('house_members')
      .select('houses:house_id (id, name)')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true, nullsFirst: true })
      .order('joined_at', { ascending: false });

    if (memberErr) {
      Alert.alert('Error al cargar chats', memberErr.message);
      return;
    }

    const houses = (memberRows ?? []).flatMap((r) => (r.houses ? [r.houses] : []));

    if (houses.length === 0) { setChats([]); return; }

    const houseIds = houses.map((h) => h.id);

    // 2. Load latest message per house
    const { data: messages } = await supabase
      .from('house_messages')
      .select('house_id, content, created_at')
      .in('house_id', houseIds)
      .order('created_at', { ascending: false });

    // Keep only the first (latest) message per house
    const latestByHouse = new Map<string, { content: string; created_at: string }>();
    for (const m of messages ?? []) {
      if (!latestByHouse.has(m.house_id)) {
        latestByHouse.set(m.house_id, { content: m.content, created_at: m.created_at });
      }
    }

    setChats(
      houses.map((h) => {
        const last = latestByHouse.get(h.id);
        return {
          id: h.id,
          name: h.name,
          lastMessage: last?.content ?? null,
          lastTime: last?.created_at ?? null,
        };
      }),
    );
  }, [userId]);

  // Al volver a la pestaña: orden de hogares y últimos mensajes al día.
  useFocusEffect(useCallback(() => { void loadChats(); }, [loadChats]));

  async function handleRefresh() {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }

  function openChat(houseId: string) {
    setCurrentHouse(houseId);
    router.push(`/(app)/house/${houseId}/chat`);
  }

  return (
    <Screen scroll onRefresh={handleRefresh} refreshing={refreshing}>
      <View style={{ gap: 4, marginTop: 24 }}>
        <Text variant="title">Chat</Text>
      </View>

      {chats.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: theme.colors.primaryMuted,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageCircle size={36} color={theme.colors.primary} />
          </View>
          <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
            Únete a un hogar para empezar a chatear con tus compañeros.
          </Text>
        </View>
      ) : (
        chats.map((chat) => (
          <Pressable key={chat.id} onPress={() => openChat(chat.id)}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: theme.colors.primaryMuted,
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <MessageCircle size={24} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text variant="bodyBold">{chat.name}</Text>
                    {chat.lastTime ? (
                      <Text variant="caption" color="secondary">
                        {formatPreviewTime(chat.lastTime)}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    variant="caption"
                    color="secondary"
                    style={{ opacity: chat.lastMessage ? 1 : 0.5 }}
                    numberOfLines={1}
                  >
                    {chat.lastMessage ?? 'Sin mensajes aún'}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
