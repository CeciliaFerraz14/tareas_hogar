import { FloatingTabs } from '../../../components/navigation/FloatingTabs';

/**
 * Pestañas de la versión web / PWA: la barra flotante HOMI. En iPhone se usa
 * _layout.tsx (la barra nativa de cristal); en web esa barra solo mostraría texto.
 */
export default function TabsLayoutWeb() {
  return <FloatingTabs />;
}
