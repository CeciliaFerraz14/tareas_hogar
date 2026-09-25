import { useState } from 'react';
import { View } from 'react-native';
import { Alert } from '../lib/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '../components/ui/Screen';
import { Text } from '../components/ui/Text';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [exchanged, setExchanged] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      // Exchange the PKCE code for a session the first time
      if (!exchanged && code) {
        const { error: exchError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchError) {
          Alert.alert('Enlace inválido', 'El enlace ya fue usado o ha caducado. Solicita uno nuevo.');
          return;
        }
        setExchanged(true);
      }

      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.', [
        { text: 'Aceptar', onPress: () => router.replace('/(auth)/login') },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!code) {
    return (
      <Screen>
        <View style={{ gap: 12, marginTop: 24 }}>
          <Text variant="title">Enlace inválido</Text>
          <Text variant="body" color="secondary">
            Este enlace no es válido. Solicita un nuevo correo de recuperación desde la pantalla de inicio de sesión.
          </Text>
          <Button title="Volver al inicio" onPress={() => router.replace('/(auth)/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 8, marginTop: 24 }}>
        <Text variant="title">Nueva contraseña</Text>
        <Text variant="body" color="secondary">
          Elige una contraseña segura de al menos 8 caracteres.
        </Text>
      </View>

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label="Nueva contraseña"
            placeholder="••••••••"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            autoFocus
          />
        )}
      />
      <Controller
        control={control}
        name="confirm"
        render={({ field: { value, onChange, onBlur } }) => (
          <Input
            label="Confirmar contraseña"
            placeholder="••••••••"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirm?.message}
          />
        )}
      />
      <Button title="Guardar contraseña" loading={loading} onPress={handleSubmit(onSubmit)} />
    </Screen>
  );
}
