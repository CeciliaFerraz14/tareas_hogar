import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Alert } from '../../../lib/alert';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Check, Plus, ShoppingCart, Trash2, X } from 'lucide-react-native';
import { Screen } from '../../../components/ui/Screen';
import { Text } from '../../../components/ui/Text';
import { SectionTitle } from '../../../components/ui/Labels';
import { Card } from '../../../components/ui/Card';
import { ComposerBar } from '../../../components/ui/ComposerBar';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { subscribeToHouseTables } from '../../../lib/realtime';
import { useTheme } from '../../../lib/theme';
import { useActiveHouse, type MyHouse } from '../../../store/houseStore';
import { HouseGate } from '../../../components/house/HouseGate';
import { TabHeader } from '../../../components/house/HouseSwitcher';
import { useTabBarSpace } from '../../../hooks/useTabBarSpace';

type ShoppingItem = {
  id: string;
  title: string;
  is_purchased: boolean;
};

export default function CompraTab() {
  const active = useActiveHouse();
  if (active.status !== 'ready') return <HouseGate state={active} />;
  // key: al cambiar de hogar, la lista empieza de cero.
  return <CompraScreen key={active.house.id} house={active.house} />;
}

function CompraScreen({ house }: { house: MyHouse }) {
  const houseId = house.id;
  const user = useAuthStore((s) => s.user);
  const theme = useTheme();
  const bottomSpace = useTabBarSpace();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    if (!houseId) return;
    const { data, error } = await supabase
      .from('shopping_items')
      .select('id, title, is_purchased')
      .eq('house_id', houseId)
      .order('created_at', { ascending: true });
    if (error) { Alert.alert('Error al cargar la lista', error.message); return; }
    setItems(data ?? []);
  }, [houseId]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  async function handleRefresh() { setRefreshing(true); await loadItems(); setRefreshing(false); }

  // Realtime por Broadcast: llegan también los borrados de otros miembros.
  useEffect(() => {
    if (!houseId) return;
    return subscribeToHouseTables(houseId, ['shopping_items'], () => { void loadItems(); });
  }, [houseId, loadItems]);

  const pending = items.filter((i) => !i.is_purchased);
  const purchased = items.filter((i) => i.is_purchased);

  async function toggleItem(item: ShoppingItem) {
    const next = !item.is_purchased;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_purchased: next } : i)));
    const { error } = await supabase
      .from('shopping_items')
      .update({ is_purchased: next, purchased_by: next ? (user?.id ?? null) : null })
      .eq('id', item.id);
    if (error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_purchased: item.is_purchased } : i)));
      Alert.alert('Error al actualizar', error.message);
    }
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase.from('shopping_items').delete().eq('id', id);
    if (error) {
      Alert.alert('Error al eliminar', error.message);
      void loadItems();
    }
  }

  // El teclado se queda abierto para ir añadiendo artículos seguidos.
  async function addItem() {
    const title = draft.trim();
    if (!title || !houseId || !user) return;
    setAdding(true);
    setDraft('');
    try {
      const { error } = await supabase.from('shopping_items').insert({ house_id: houseId, title, added_by: user.id });
      if (error) { setDraft(title); Alert.alert('No se pudo añadir', error.message); return; }
      void loadItems();
    } finally {
      setAdding(false);
    }
  }

  function clearPurchased() {
    if (purchased.length === 0) return;
    Alert.alert(
      'Vaciar comprados',
      `¿Quitar de la lista ${purchased.length === 1 ? 'el artículo comprado' : `los ${purchased.length} artículos comprados`}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            const ids = purchased.map((i) => i.id);
            setItems((prev) => prev.filter((i) => !i.is_purchased));
            const { error } = await supabase.from('shopping_items').delete().in('id', ids);
            if (error) { Alert.alert('Error', error.message); void loadItems(); }
          },
        },
      ],
    );
  }

  function renderItem(item: ShoppingItem) {
    const done = item.is_purchased;
    return (
      <Card
        key={item.id}
        padded={false}
        style={done ? { ...theme.shadows.none, borderColor: theme.colors.border, opacity: 0.75 } : theme.shadows.small}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => toggleItem(item)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={item.title}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingLeft: theme.spacing.lg }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: theme.borderWidth,
                borderColor: theme.colors.outline,
                backgroundColor: done ? theme.colors.lime : theme.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {done ? <Check size={16} color={theme.colors.textOnFill} strokeWidth={3} /> : null}
            </View>
            <Text
              variant="bodyBold"
              style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through', color: theme.colors.textSecondary } : null]}
            >
              {item.title}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => deleteItem(item.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${item.title}`}
            style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: 14 }}
          >
            <X size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <Screen contentStyle={{ padding: 0, gap: 0 }} avoidKeyboard={false} bottomEdge={false}>
      <View style={{ paddingHorizontal: theme.spacing.md }}>
        <TabHeader
          house={house}
          title="Compra"
          subtitle={pending.length === 0 ? 'Nada pendiente' : `${pending.length} por comprar`}
        />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" automaticOffset>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: 10, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
        >
          {items.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: theme.colors.peach,
                  borderWidth: theme.borderWidth,
                  borderColor: theme.colors.outline,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...theme.shadows.small,
                }}
              >
                <ShoppingCart size={32} color={theme.colors.textOnFill} />
              </View>
              <Text variant="heading">La lista está vacía</Text>
              <Text variant="body" align="center">
                Apunta abajo lo que falte en casa.
              </Text>
            </View>
          ) : (
            <>
              {pending.length === 0 ? (
                <Text variant="bodyBold" align="center" style={{ paddingVertical: 16 }}>
                  ¡Todo comprado! 🎉
                </Text>
              ) : (
                pending.map(renderItem)
              )}

              {purchased.length > 0 ? (
                <View style={{ gap: 10, marginTop: theme.spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <SectionTitle>{`En el carro · ${purchased.length}`}</SectionTitle>
                    </View>
                    <Pressable
                      onPress={clearPurchased}
                      accessibilityRole="button"
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: theme.radii.pill,
                        borderWidth: theme.borderWidth,
                        borderColor: theme.colors.outline,
                        backgroundColor: theme.colors.surface,
                        ...(pressed ? theme.shadows.none : theme.shadows.small),
                        ...(pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : null),
                      })}
                    >
                      <Trash2 size={14} color={theme.colors.textPrimary} />
                      <Text variant="label">Vaciar</Text>
                    </Pressable>
                  </View>
                  {purchased.map(renderItem)}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        <ComposerBar
          value={draft}
          onChangeText={setDraft}
          onSubmit={addItem}
          busy={adding}
          placeholder="Añadir a la lista…"
          icon={Plus}
          accessibilityLabel="Añadir artículo"
          maxLength={120} // límite de shopping_items.title
          bottomSpace={bottomSpace}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
