import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useHouseStore } from '../../store/houseStore';

type TabName = 'tareas' | 'compra' | 'chat';

/**
 * Para las rutas antiguas /house/[id]/tareas|compra|chat (avisos push, el aviso
 * flotante del chat, enlaces guardados): pone ese hogar como activo y abre su
 * pestaña.
 */
export function OpenInTab({ tab }: { tab: TabName }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const setCurrentHouse = useHouseStore((s) => s.setCurrentHouse);

  useEffect(() => {
    if (id) setCurrentHouse(id);
    router.replace(`/(app)/(tabs)/${tab}`);
  }, [id, tab, router, setCurrentHouse]);

  return null;
}
