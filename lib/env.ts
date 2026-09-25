/**
 * Lee variables de entorno expuestas al cliente via `EXPO_PUBLIC_*`.
 * Falla temprano si falta alguna clave imprescindible.
 */
function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `[env] Falta la variable ${name}. Copia .env.example a .env y rellena los valores de Supabase.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;
