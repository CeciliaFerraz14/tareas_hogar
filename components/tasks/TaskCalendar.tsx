import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../lib/theme';
import { DAY_NAMES, shortDate, dateKey, weekDayOf } from '../../lib/tasks';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;
const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

export type CalendarView = 'day' | 'week' | 'month';

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

const SWIPE_DISTANCE = 50;
const layout = LinearTransition.springify().damping(18).stiffness(180);

// ─── Fechas ───────────────────────────────────────────────────────────────────
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
function startOfWeek(date: Date): Date {
  return addDays(date, -weekDayOf(date));
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type TaskCalendarProps = {
  /** null = "Todas". */
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  /** Qué punto lleva cada día: ninguno, pendientes o todo hecho. */
  dayStatus: (date: Date) => 'none' | 'pending' | 'done';
};

/**
 * Calendario de tareas con tres vistas: Hoy (recogido en una línea), Semana (una
 * fila) y Mes (cuadrícula). Se despliega de semana a mes con el tirador de abajo
 * (tocándolo o arrastrándolo) y se desliza a los lados para cambiar de periodo.
 */
export function TaskCalendar({ selectedDate, onSelectDate, dayStatus }: TaskCalendarProps) {
  const theme = useTheme();
  const today = new Date();
  const [view, setView] = useState<CalendarView>('week');
  // Fecha de referencia de lo que se ve (el día, la semana o el mes).
  const [anchor, setAnchor] = useState<Date>(() => selectedDate ?? today);

  const showAll = selectedDate === null;

  function changeView(next: CalendarView) {
    if (next === view && next !== 'day') return;
    void Haptics.selectionAsync();
    if (next === 'day') {
      // "Hoy" siempre lleva al día de hoy.
      setAnchor(today);
      onSelectDate(today);
    } else {
      setAnchor(selectedDate ?? anchor);
    }
    setView(next);
  }

  // Flechas y deslizar: un día, una semana o un mes.
  function shift(direction: -1 | 1) {
    if (view === 'day') {
      const next = addDays(selectedDate ?? anchor, direction);
      setAnchor(next);
      onSelectDate(next);
    } else if (view === 'week') {
      setAnchor((a) => addDays(a, direction * 7));
      // La selección acompaña a la semana que se ve.
      if (selectedDate) onSelectDate(addDays(selectedDate, direction * 7));
    } else {
      setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + direction, 1));
    }
  }

  function selectDay(date: Date) {
    setAnchor(date);
    onSelectDate(selectedDate && sameDay(date, selectedDate) ? null : date);
  }

  function toggleExpanded() {
    void Haptics.selectionAsync();
    changeView(view === 'month' ? 'week' : 'month');
  }

  // Deslizar a los lados sobre el calendario (no interfiere con el scroll vertical).
  // runOnJS: los callbacks cambian estado de React, no hace falta el hilo de UI.
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (e.translationX <= -SWIPE_DISTANCE) shift(1);
      else if (e.translationX >= SWIPE_DISTANCE) shift(-1);
    });

  // Arrastrar el tirador: hacia abajo despliega el mes, hacia arriba lo recoge.
  const handleDrag = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY([-10, 10])
    .onEnd((e) => {
      if (e.translationY >= 30 && view !== 'month') changeView('month');
      else if (e.translationY <= -30 && view === 'month') changeView('week');
    });

  // ─── Título según la vista ─────────────────────────────────────────────────
  let title: string;
  if (view === 'day') {
    const day = selectedDate ?? anchor;
    const name = capitalize(DAY_NAMES[weekDayOf(day)]);
    title = sameDay(day, today) ? `Hoy, ${DAY_NAMES[weekDayOf(day)]} ${shortDate(dateKey(day))}` : `${name}, ${shortDate(dateKey(day))}`;
  } else if (view === 'week') {
    const start = startOfWeek(anchor);
    title = `${shortDate(dateKey(start))} – ${shortDate(dateKey(addDays(start, 6)))}`;
  } else {
    title = `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }

  // ─── Días a pintar ─────────────────────────────────────────────────────────
  let weeks: (Date | null)[][] = [];
  if (view === 'week') {
    const start = startOfWeek(anchor);
    weeks = [Array.from({ length: 7 }, (_, i) => addDays(start, i))];
  } else if (view === 'month') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [
      ...Array.from({ length: weekDayOf(first) }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(anchor.getFullYear(), anchor.getMonth(), i + 1)),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  }

  const dayViewStatus = view === 'day' ? dayStatus(selectedDate ?? anchor) : 'none';

  return (
    <Animated.View
      layout={layout}
      style={{
        gap: 12,
        padding: theme.spacing.lg,
        paddingBottom: view === 'day' ? theme.spacing.lg : theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.outline,
        ...theme.shadows.soft,
      }}
    >
      {/* vistas + "Todas" */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          accessibilityRole="tablist"
          style={{
            flex: 1,
            flexDirection: 'row',
            padding: 3,
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.surfaceAlt,
          }}
        >
          {VIEWS.map(({ value, label }) => {
            const active = view === value;
            return (
              <Pressable
                key={value}
                onPress={() => changeView(value)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 6,
                  borderRadius: theme.radii.pill,
                  backgroundColor: active ? theme.colors.peach : 'transparent',
                  borderWidth: theme.borderWidth,
                  borderColor: active ? theme.colors.outline : 'transparent',
                }}
              >
                <Text variant="label" color={active ? 'onFill' : 'secondary'}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => onSelectDate(showAll ? (view === 'day' ? anchor : today) : null)}
          accessibilityRole="button"
          accessibilityState={{ selected: showAll }}
          accessibilityLabel="Ver todas las tareas"
          style={{
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: theme.radii.pill,
            backgroundColor: showAll ? theme.colors.peach : theme.colors.surfaceAlt,
            borderWidth: theme.borderWidth,
            borderColor: showAll ? theme.colors.outline : 'transparent',
          }}
        >
          <Text variant="label" color={showAll ? 'onFill' : 'secondary'}>Todas</Text>
        </Pressable>
      </View>

      <GestureDetector gesture={swipe}>
        <View style={{ gap: 10 }}>
          {/* flechas + título */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Anterior">
              <ChevronLeft size={22} color={theme.colors.textPrimary} />
            </Pressable>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Text variant="bodyBold" align="center">{title}</Text>
              {view === 'day' && dayViewStatus !== 'none' ? (
                <StatusDot status={dayViewStatus} />
              ) : null}
            </View>
            <Pressable onPress={() => shift(1)} hitSlop={10} accessibilityLabel="Siguiente">
              <ChevronRight size={22} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          {view !== 'day' ? (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row' }}>
                {WEEKDAY_INITIALS.map((d) => (
                  <Text key={d} variant="caption" color="secondary" align="center" style={{ flex: 1 }}>
                    {d}
                  </Text>
                ))}
              </View>
              {weeks.map((week, w) => (
                <View key={`${view}-${w}`} style={{ flexDirection: 'row' }}>
                  {week.map((date, i) =>
                    date ? (
                      <DayCell
                        key={i}
                        date={date}
                        isToday={sameDay(date, today)}
                        active={selectedDate !== null && sameDay(date, selectedDate)}
                        status={dayStatus(date)}
                        onPress={() => selectDay(date)}
                      />
                    ) : (
                      <View key={i} style={{ flex: 1 }} />
                    ),
                  )}
                </View>
              ))}
            </Animated.View>
          ) : null}
        </View>
      </GestureDetector>

      {/* tirador: despliega el mes o lo recoge */}
      {view !== 'day' ? (
        <GestureDetector gesture={handleDrag}>
          <Pressable
            onPress={toggleExpanded}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={view === 'month' ? 'Recoger a la semana' : 'Desplegar el mes'}
            style={{ alignItems: 'center', paddingVertical: 6 }}
          >
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.border }} />
          </Pressable>
        </GestureDetector>
      ) : null}
    </Animated.View>
  );
}

function StatusDot({ status }: { status: 'pending' | 'done' }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: status === 'pending' ? theme.colors.primary : theme.colors.success,
      }}
    />
  );
}

type DayCellProps = {
  date: Date;
  isToday: boolean;
  active: boolean;
  status: 'none' | 'pending' | 'done';
  onPress: () => void;
};

function DayCell({ date, isToday, active, status, onPress }: DayCellProps) {
  const theme = useTheme();
  const dotColor =
    status === 'pending' ? theme.colors.primary : status === 'done' ? theme.colors.success : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', gap: 3 }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${DAY_NAMES[weekDayOf(date)]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? theme.colors.peach : isToday ? theme.colors.surfaceAlt : 'transparent',
          borderWidth: theme.borderWidth,
          borderColor: active ? theme.colors.outline : 'transparent',
        }}
      >
        <Text
          variant={isToday || active ? 'bodyBold' : 'body'}
          style={{ fontSize: 15, color: isToday && !active ? theme.colors.accent : theme.colors.textPrimary }}
        >
          {date.getDate()}
        </Text>
      </View>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: active ? 'transparent' : dotColor }} />
    </Pressable>
  );
}
