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

const schema = z
  .object({
    username: z.string().min(2, 'Dinos cómo te llamas'),
    email: z.string().email('Email no válido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });
type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '', confirm: '' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { username: values.username } },
    });
    setLoading(false);

    if (error) {
      Alert.alert('No se pudo crear la cuenta', error.message);
      return;
    }
    if (data.user && !data.session) {
      Alert.alert(
        'Confirma tu email',
        'Te hemos enviado un enlace. Confírmalo y vuelve a iniciar sesión.',
      );
      router.replace('/(auth)/login');
      return;
    }
    router.replace('/(app)');
  }

  return (
    <Screen scroll>
      <View style={{ gap: 8, marginTop: 24 }}>
        <HouseIllustration size={72} />
        <Text variant="title">Bienvenida 🏡</Text>
        <Text variant="body" color="secondary">
          Crea tu cuenta para empezar a organizar tu hogar.
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <Controller
          control={control}
          name="username"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Nombre"
              placeholder="Cecilia"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.username?.message}
            />
          )}
        />
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
        <Controller
          control={control}
          name="confirm"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Confirmar contraseña"
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirm?.message}
            />
          )}
        />
      </View>

      <Button title="Crear cuenta" loading={loading} onPress={handleSubmit(onSubmit)} />

      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <Text variant="body" color="secondary">
          ¿Ya tienes cuenta?
        </Text>
        <Link href="/(auth)/login">
          <Text variant="bodyBold" color="accent">
            Inicia sesión
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
