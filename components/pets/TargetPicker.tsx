import { Pressable, View } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../lib/theme';
import { PetTypeIcon } from './PetIcons';
import type { Pet, PetTarget } from '../../lib/pets';

type TargetPickerProps = {
  pets: Pet[];
  value: PetTarget;
  onChange: (target: PetTarget) => void;
};

/** «Para quién»: la manada (todas las mascotas) o una de ellas. */
export function TargetPicker({ pets, value, onChange }: TargetPickerProps) {
  const theme = useTheme();
  // La manada lleva la huella (PetTypeIcon sin tipo).
  const options: { target: PetTarget; type: string | null; label: string }[] = [
    { target: null, type: null, label: 'La manada' },
    ...pets.map((p) => ({ target: p.id, type: p.type, label: p.name })),
  ];
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" color="secondary">Para</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = value === o.target;
          return (
            <Pressable key={o.target ?? 'pack'} onPress={() => onChange(o.target)} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: theme.radii.pill,
                  borderWidth: theme.borderWidth,
                  borderColor: on ? theme.colors.outline : 'transparent',
                  backgroundColor: on ? theme.colors.peach : theme.colors.surface,
                }}
              >
                <PetTypeIcon type={o.type} size={22} />
                <Text variant="label" color={on ? 'onFill' : 'secondary'}>{o.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
