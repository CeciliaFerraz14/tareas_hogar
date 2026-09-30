import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { Alert } from '../../../../lib/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react-native';
import { Screen } from '../../../../components/ui/Screen';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Avatar } from '../../../../components/ui/Avatar';
import { useAuthStore } from '../../../../store/authStore';
import { supabase } from '../../../../lib/supabase';
import { useTheme } from '../../../../lib/theme';
import { useSyncActiveHouse } from '../../../../store/houseStore';

type Member = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  email: string;
};

type Split = {
  id: string;
  user_id: string;
  amount_owed: number;
  is_settled: boolean;
  name: string | null;
  avatar_url: string | null;
};

type Expense = {
  id: string;
  title: string;
  amount: number;
  paid_by: string | null;
  payer_name: string | null;
  payer_avatar: string | null;
  created_at: string;
  splits: Split[];
};

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function HuchaScreen() {
  const { id: houseId } = useLocalSearchParams<{ id: string }>();
  useSyncActiveHouse(houseId);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const theme = useTheme();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string>(user?.id ?? '');
  const [splitAmong, setSplitAmong] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!houseId) return;
    const [expRes, memRes] = await Promise.all([
      supabase
        .from('expenses')
        .select(`
          id, title, amount, paid_by, created_at,
          payer:users!expenses_paid_by_fkey (username, avatar_url, email),
          splits:expense_splits (
            id, user_id, amount_owed, is_settled,
            member:user_id (username, avatar_url, email)
          )
        `)
        .eq('house_id', houseId)
        .order('created_at', { ascending: false }),
      supabase
        .from('house_members')
        .select('user_id, users:user_id (email, username, avatar_url)')
        .eq('house_id', houseId),
    ]);

    if (expRes.data) {
      setExpenses(
        expRes.data.map((e) => {
          const p = e.payer as { username: string | null; avatar_url: string | null; email: string } | null;
          return {
            id: e.id,
            title: e.title,
            amount: Number(e.amount),
            paid_by: e.paid_by,
            payer_name: p?.username ?? p?.email ?? null,
            payer_avatar: p?.avatar_url ?? null,
            created_at: e.created_at,
            splits: ((e.splits ?? []) as unknown as Array<{
              id: string; user_id: string; amount_owed: number | string; is_settled: boolean;
              member: { username: string | null; avatar_url: string | null; email: string } | null;
            }>).map((s) => ({
              id: s.id,
              user_id: s.user_id,
              amount_owed: Number(s.amount_owed),
              is_settled: s.is_settled,
              name: s.member?.username ?? s.member?.email ?? null,
              avatar_url: s.member?.avatar_url ?? null,
            })),
          };
        }),
      );
    }

    if (memRes.data) {
      setMembers(
        memRes.data.map((m) => {
          const u = m.users as { email: string; username: string | null; avatar_url: string | null } | null;
          return { user_id: m.user_id, name: u?.username ?? null, email: u?.email ?? '', avatar_url: u?.avatar_url ?? null };
        }),
      );
    }
  }, [houseId]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleRefresh() { setRefreshing(true); await loadData(); setRefreshing(false); }

  // Pre-select all members when modal opens
  function openModal() {
    setPaidBy(user?.id ?? '');
    setSplitAmong(new Set(members.map((m) => m.user_id)));
    setTitle('');
    setAmount('');
    setModalOpen(true);
  }

  function toggleSplit(uid: string) {
    setSplitAmong((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) { next.delete(uid); } else { next.add(uid); }
      return next;
    });
  }

  async function createExpense() {
    const trimmed = title.trim();
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!trimmed) { Alert.alert('Título requerido'); return; }
    if (isNaN(parsed) || parsed <= 0) { Alert.alert('Importe no válido', 'Escribe un número mayor que 0.'); return; }
    if (splitAmong.size === 0) { Alert.alert('Selecciona al menos un miembro'); return; }
    if (!houseId || !user) return;

    setSaving(true);
    try {
      // Gasto + reparto en una sola transacción; el reparto por céntimos lo hace la BBDD.
      const { error } = await supabase.rpc('create_expense', {
        p_house_id: houseId,
        p_title: trimmed,
        p_amount: Math.round(parsed * 100) / 100,
        p_paid_by: paidBy,
        p_split_among: Array.from(splitAmong),
      });
      if (error) { Alert.alert('No se pudo crear el gasto', error.message); return; }

      setModalOpen(false);
      void loadData();
    } finally {
      setSaving(false);
    }
  }

  async function settleSplit(splitId: string) {
    const { error } = await supabase
      .from('expense_splits')
      .update({ is_settled: true })
      .eq('id', splitId);
    if (error) { Alert.alert('Error', error.message); return; }
    setExpenses((prev) =>
      prev.map((e) => ({
        ...e,
        splits: e.splits.map((s) => s.id === splitId ? { ...s, is_settled: true } : s),
      })),
    );
  }

  // Balance calculation: positive = owed to you, negative = you owe
  const myId = user?.id ?? '';
  const memberBalance: Record<string, number> = {};
  for (const exp of expenses) {
    if (!exp.paid_by) continue; // quien pagó borró su cuenta: no hay a quién deber
    for (const split of exp.splits) {
      if (split.is_settled) continue;
      if (exp.paid_by === split.user_id) continue; // skip payer's own share
      // payer is owed amount_owed from split.user_id
      memberBalance[exp.paid_by] = (memberBalance[exp.paid_by] ?? 0) + split.amount_owed;
      memberBalance[split.user_id] = (memberBalance[split.user_id] ?? 0) - split.amount_owed;
    }
  }
  const myBalance = memberBalance[myId] ?? 0;

  return (
    <Screen>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: theme.spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="heading">Hucha</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        {/* my balance */}
        <Card>
          <View style={{ alignItems: 'center', gap: 4, paddingVertical: 8 }}>
            <Text variant="label" color="secondary">Tu balance</Text>
            <Text
              variant="title"
              style={{ color: myBalance >= 0 ? theme.colors.success : theme.colors.danger }}
            >
              {myBalance >= 0 ? '+' : ''}{fmt(myBalance)} €
            </Text>
            <Text variant="caption" color="secondary">
              {myBalance > 0.005
                ? 'Te deben dinero'
                : myBalance < -0.005
                  ? 'Debes dinero'
                  : 'Estás al día'}
            </Text>
          </View>
        </Card>

        {/* member balances */}
        {members.length > 1 ? (
          <View style={{ gap: 8 }}>
            <Text variant="label" color="secondary">Balances del hogar</Text>
            {members.map((m) => {
              const bal = memberBalance[m.user_id] ?? 0;
              const isMe = m.user_id === myId;
              return (
                <Card key={m.user_id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar uri={m.avatar_url} name={m.name ?? m.email} size={36} />
                    <Text variant="bodyBold" style={{ flex: 1 }}>
                      {m.name ?? m.email}{isMe ? ' (tú)' : ''}
                    </Text>
                    <Text
                      variant="bodyBold"
                      style={{ color: bal >= 0 ? theme.colors.success : theme.colors.danger }}
                    >
                      {bal >= 0 ? '+' : ''}{fmt(bal)} €
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : null}

        {/* expenses */}
        <View style={{ gap: 8 }}>
          <Text variant="label" color="secondary">
            Gastos ({expenses.length})
          </Text>
          {expenses.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text variant="body" color="secondary">Aún no hay gastos registrados.</Text>
            </View>
          ) : (
            expenses.map((exp) => {
              const unsettled = exp.splits.filter((s) => !s.is_settled && s.user_id !== exp.paid_by);
              return (
                <Card key={exp.id}>
                  <View style={{ gap: 10 }}>
                    {/* expense header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Avatar uri={exp.payer_avatar} name={exp.payer_name ?? undefined} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyBold">{exp.title}</Text>
                        <Text variant="caption" color="secondary">
                          Pagado por {exp.paid_by === myId ? 'ti' : (exp.payer_name ?? 'alguien')} · {formatDate(exp.created_at)}
                        </Text>
                      </View>
                      <Text variant="bodyBold">{fmt(exp.amount)} €</Text>
                    </View>

                    {/* splits */}
                    {unsettled.length > 0 ? (
                      <View style={{ gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                        {unsettled.map((split) => (
                          <View key={split.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Avatar uri={split.avatar_url} name={split.name ?? undefined} size={28} />
                            <Text variant="body" style={{ flex: 1 }}>
                              {split.user_id === myId ? 'Tú debes' : (split.name ?? 'Alguien')} · {fmt(split.amount_owed)} €
                            </Text>
                            {(split.user_id === myId || exp.paid_by === myId) ? (
                              <Pressable
                                onPress={() => settleSplit(split.id)}
                                style={{
                                  flexDirection: 'row', alignItems: 'center', gap: 4,
                                  backgroundColor: theme.colors.primaryMuted,
                                  paddingHorizontal: 10, paddingVertical: 4,
                                  borderRadius: theme.radii.pill,
                                }}
                              >
                                <CheckCircle2 size={14} color={theme.colors.primary} />
                                <Text variant="caption" color="primary">Liquidar</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                        <CheckCircle2 size={16} color={theme.colors.success} />
                        <Text variant="caption" color="secondary">Todo liquidado</Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <View style={{ padding: theme.spacing.lg }}>
        <Pressable
          onPress={openModal}
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radii.pill,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, paddingVertical: 14, ...theme.shadows.soft, borderWidth: theme.borderWidth, borderColor: theme.colors.outline,
          }}
        >
          <Plus size={20} color="#fff" />
          <Text variant="bodyBold" color="inverse">Añadir gasto</Text>
        </Pressable>
      </View>

      {/* add expense modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setModalOpen(false)} />
          <ScrollView
            style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl }}
            contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: 36 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }} />
            <Text variant="heading">Nuevo gasto</Text>

            <Input label="Concepto" placeholder="Ej. Supermercado, Netflix…" value={title} onChangeText={setTitle} />
            <Input
              label="Importe (€)"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            {/* paid by */}
            <View style={{ gap: 6 }}>
              <Text variant="label" color="secondary">Pagado por</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {members.map((m) => {
                    const active = paidBy === m.user_id;
                    return (
                      <Pressable key={m.user_id} onPress={() => setPaidBy(m.user_id)}>
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radii.pill,
                          backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                        }}>
                          <Avatar uri={m.avatar_url} name={m.name ?? m.email} size={24} />
                          <Text variant="label" color={active ? 'inverse' : 'secondary'}>
                            {m.user_id === user?.id ? 'Yo' : (m.name ?? m.email)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* split among */}
            <View style={{ gap: 6 }}>
              <Text variant="label" color="secondary">
                Dividir entre ({splitAmong.size}){splitAmong.size > 0 && amount ? ` · ${fmt(parseFloat(amount.replace(',', '.')) / splitAmong.size || 0)} € c/u` : ''}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {members.map((m) => {
                  const selected = splitAmong.has(m.user_id);
                  return (
                    <Pressable key={m.user_id} onPress={() => toggleSplit(m.user_id)}>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radii.pill,
                        backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                      }}>
                        <Avatar uri={m.avatar_url} name={m.name ?? m.email} size={24} />
                        <Text variant="label" color={selected ? 'inverse' : 'secondary'}>
                          {m.user_id === user?.id ? 'Yo' : (m.name ?? m.email)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Button title="Crear gasto" loading={saving} onPress={createExpense} />
            <Button title="Cancelar" variant="ghost" onPress={() => setModalOpen(false)} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
