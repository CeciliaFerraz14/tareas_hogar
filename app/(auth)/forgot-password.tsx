import { useState } from 'react';
import { View } from 'react-native';
import { Alert } from '../../lib/alert';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Text';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { passwordResetRedirectUrl } from '../../lib/authRedirect';

const schema = z.object({ email: z.string().email('Email no válido') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: passwordResetRedirectUrl(),
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setSent(true);
  }

  return (
    <Screen>
      <View style={{ gap: 8, marginTop: 24 }}>
        <Text variant="title">Recuperar acceso</Text>
        <Text variant="body" color="secondary">
          Te enviaremos un enlace al email para restablecer tu contraseña.
        </Text>
      </View>

      {sent ? (
        <Text variant="body">
          ✉️ Revisa tu bandeja de entrada. Si no lo ves, mira en spam.
        </Text>
      ) : (
        <>
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
          <Button
            title="Enviar enlace"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
          />
        </>
      )}

      <View style={{ alignItems: 'center' }}>
        <Link href="/(auth)/login">
          <Text variant="label" color="accent">
            Volver a iniciar sesión
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
