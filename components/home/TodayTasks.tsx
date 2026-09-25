import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, PartyPopper } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { useTheme } from '../../lib/theme';
import type { TodayTask } from '../../hooks/useHomeSummary';

const COLLAPSED_COUNT = 4;

type TodayTasksProps = {
  tasks: TodayTask[];
  /** Nombre del hogar de cada tarea (solo se muestra si tengo varios). */
  houseNameById: Record<string, string>;
  onToggle: (task: TodayTask) => void;
};

/** "Para hoy": mis tareas de hoy (o de nadie) de todos mis hogares, marcables desde aquí. */
export function TodayTasks({ tasks, houseNameById, onToggle }: TodayTasksProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const showHouse = Object.keys(houseNameById).length > 1;
  const pending = tasks.filter((t) => !t.done).length;

  if (tasks.length === 0) {
    return (
      <Card style={{ ...theme.shadows.small, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <PartyPopper size={22} color={theme.colors.accent} />
        <Text variant="body" color="secondary" style={{ flex: 1 }}>
          No tienes tareas para hoy.
        </Text>
      </Card>
    );
  }

  const visible = expanded ? tasks : tasks.slice(0, COLLAPSED_COUNT);
  const hidden = tasks.length - visible.length;

  return (
    <Card padded={false} style={{ ...theme.shadows.small, paddingVertical: 6 }}>
      {pending === 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: theme.spacing.lg, paddingVertical: 10 }}>
          <PartyPopper size={20} color={theme.colors.accent} />
          <Text variant="bodyBold">¡Todo hecho por hoy!</Text>
        </View>
      ) : null}

      {visible.map((task) => (
        <Pressable
          key={task.id}
          onPress={() => onToggle(task)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.done }}
          accessibilityLabel={task.title}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 10,
            backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
          })}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: theme.borderWidth,
              borderColor: theme.colors.outline,
              backgroundColor: task.done ? theme.colors.lime : theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {task.done ? <Check size={14} color={theme.colors.textOnFill} strokeWidth={3} /> : null}
          </View>
          <Text
            variant="bodyBold"
            numberOfLines={1}
            style={[{ flex: 1 }, task.done ? { textDecorationLine: 'line-through', color: theme.colors.textSecondary } : null]}
          >
            {task.title}
          </Text>
          {showHouse ? (
            <Text variant="caption" color="secondary" numberOfLines={1} style={{ maxWidth: 110 }}>
              {houseNameById[task.house_id]}
            </Text>
          ) : null}
        </Pressable>
      ))}

      {tasks.length > COLLAPSED_COUNT ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          accessibilityRole="button"
          style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: 10 }}
        >
          <Text variant="label" color="accent">
            {expanded ? 'Ver menos' : `Ver ${hidden} más`}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
