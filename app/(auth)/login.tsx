import { useState } from 'react';
import { View } from 'react-native';
import { Alert } from '../../lib/alert';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { HouseIllustration } from '../../components/brand/HouseIllustration';
import { supabase } from '../../lib/supabase';

const schema = z.object({
  email: z.string().email('Email no válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setLoading(false);
    if (error) {
      Alert.alert('No se pudo iniciar sesión', error.message);
      return;
    }
    router.replace('/(app)');
  }

  return (
    <Screen scroll>
      <View style={{ gap: 8, marginTop: 24 }}>
        <HouseIllustration size={72} />
        <Text variant="title">¡Hola de nuevo! 👋</Text>
        <Text variant="body" color="secondary">
          Inicia sesión para volver a tu hogar.
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Email"
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Contraseña"
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
          )}
        />
      </View>

      <Button title="Entrar" loading={loading} onPress={handleSubmit(onSubmit)} />

      <View style={{ alignItems: 'center', gap: 12 }}>
        <Link href="/(auth)/forgot-password">
          <Text variant="label" color="accent">
            ¿Has olvidado la contraseña?
          </Text>
        </Link>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text variant="body" color="secondary">
            ¿No tienes cuenta?
          </Text>
          <Link href="/(auth)/register">
            <Text variant="bodyBold" color="accent">
              Regístrate
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
