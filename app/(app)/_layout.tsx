import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useChatActivity } from '../../hooks/useChatActivity';
import { useWebPushBridge } from '../../hooks/useWebPushBridge';
import { ChatToast } from '../../components/chat/ChatToast';
import { Onboarding } from '../../components/onboarding/Onboarding';

export default function AppLayout() {
  const session = useAuthStore((s) => s.session);
  useChatActivity(session?.user.id);
  useWebPushBridge(session?.user.id);
  if (!session) return <Redirect href="/(auth)/welcome" />;
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <ChatToast />
      {/* Tutorial: la primera vez que entra cada usuario (y desde Ajustes). */}
      <Onboarding />
    </>
  );
}
