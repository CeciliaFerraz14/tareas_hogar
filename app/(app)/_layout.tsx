import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useChatDelivery } from '../../hooks/useChatDelivery';

export default function AppLayout() {
  const session = useAuthStore((s) => s.session);
  useChatDelivery(session?.user.id);
  if (!session) return <Redirect href="/(auth)/welcome" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
