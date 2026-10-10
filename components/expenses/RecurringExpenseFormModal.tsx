import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Alert } from '../../lib/alert';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import {
  CATEGORIES,
  CATEGORY_ORDER,
  PERIODS,
  formatEuros,
  monthlyAmount,
  type RecurringCategory,
  type RecurringExpense,
  type RecurringPeriod,
} from '../../lib/recurringExpenses';

type RecurringExpenseFormModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Tras guardar o borrar: la pantalla recarga. */
  onSaved: () => void;
  houseId: string;
  userId: string;
  /** Si se pasa, se edita este gasto fijo; si no, se crea uno nuevo. */
  expense: RecurringExpense | null;
};

/** Un gasto fijo de la casa: qué es, cuánto y cada cuánto. No se reparte. */
export function RecurringExpenseFormModal({ visible, onClose, onSaved, houseId, userId, expense }: RecurringExpenseFormModalProps) {
  const theme = useTheme();

  const [category, setCategory] = useState<RecurringCategory>('rent');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<RecurringPeriod>('monthly');
  const [variable, setVariable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCategory(expense?.category ?? 'rent');
    setTitle(expense?.title ?? '');
    setAmount(expense ? String(expense.amount).replace('.', ',') : '');
    setPeriod(expense?.period ?? 'monthly');
    setVariable(expense?.variable ?? false);
  }, [visible]);

  // El nombre sigue a la categoría mientras nadie lo haya cambiado a mano.
  function pickCategory(next: RecurringCategory) {
    const t = title.trim();
    if (!t || t === CATEGORIES[category].label) setTitle(next === 'other' ? '' : CATEGORIES[next].label);
    if (!expense) setVariable(CATEGORIES[next].variable);
    setCategory(next);
  }

  const parsed = parseFloat(amount.replace(',', '.'));
  const valid = !isNaN(parsed) && parsed > 0;

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) { Alert.alert('Ponle un nombre', 'Por ejemplo: Alquiler, Luz, Netflix…'); return; }
    if (!valid || parsed >= 1000000) { Alert.alert('Importe no válido', 'Escribe un número mayor que 0.'); return; }
    const fields = { title: trimmed, amount: Math.round(parsed * 100) / 100, period, category, variable };
    setSaving(true);
    try {
      const { error } = expense
        ? await supabase.from('recurring_expenses').update(fields).eq('id', expense.id)
        : await supabase.from('recurring_expenses').insert({ ...fields, house_id: houseId, created_by: userId });
      if (error) { Alert.alert('No se pudo guardar', error.message); return; }
      onClose();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!expense) return;
    Alert.alert('Borrar gasto fijo', `¿Borrar «${expense.title}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('recurring_expenses').delete().eq('id', expense.id);
          if (error) { Alert.alert('No se pudo borrar', error.message); return; }
          onClose();
          onSaved();
        },
      },
    ]);
  }

  const chip = (selected: boolean) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
  });

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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text variant="heading">{expense ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</Text>
              <Text variant="caption" color="secondary">Suma al total de la casa; no se reparte.</Text>
            </View>
            {expense ? (
              <Pressable onPress={confirmDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel="Borrar gasto fijo">
                <Trash2 size={22} color={theme.colors.danger} />
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORY_ORDER.map((c) => {
              const { label, Icon } = CATEGORIES[c];
              const on = category === c;
              return (
                <Pressable key={c} onPress={() => pickCategory(c)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <View style={chip(on)}>
                    <Icon size={16} color={on ? theme.colors.textInverse : theme.colors.textSecondary} />
                    <Text variant="label" color={on ? 'inverse' : 'secondary'}>{label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Input label="Nombre" placeholder="Ej. Alquiler, Netflix…" value={title} onChangeText={setTitle} maxLength={60} />
          <Input
            label={variable ? 'Importe aproximado (€)' : 'Importe (€)'}
            placeholder="0,00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <View style={{ gap: 6 }}>
            <Text variant="label" color="secondary">
              Se paga{valid && period !== 'monthly' ? ` · ${formatEuros(monthlyAmount({ amount: parsed, period }))} € al mes` : ''}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(Object.keys(PERIODS) as RecurringPeriod[]).map((p) => {
                const on = period === p;
                return (
                  <Pressable key={p} onPress={() => setPeriod(p)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <View style={chip(on)}>
                      <Text variant="label" color={on ? 'inverse' : 'secondary'}>{PERIODS[p].label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">Cambia cada vez</Text>
              <Text variant="caption" color="secondary">
                {variable ? 'Como la luz o el gas: cuenta como aproximado. Actualízalo cuando llegue la factura.' : 'Siempre el mismo importe.'}
              </Text>
            </View>
            <Switch
              value={variable}
              onValueChange={setVariable}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
              accessibilityLabel="El importe cambia cada vez"
            />
          </View>

          <Button title={expense ? 'Guardar cambios' : 'Añadir'} loading={saving} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
