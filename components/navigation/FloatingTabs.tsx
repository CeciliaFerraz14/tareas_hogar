import { Tabs } from 'expo-router';
import { FloatingTabBar } from './FloatingTabBar';

/** Pestañas con la barra flotante HOMI (web y Android). */
export function FloatingTabs() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoy' }} />
      <Tabs.Screen name="tareas" options={{ title: 'Tareas' }} />
      <Tabs.Screen name="compra" options={{ title: 'Compra' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="mas" options={{ title: 'Más' }} />
    </Tabs>
  );
}
