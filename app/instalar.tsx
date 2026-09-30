import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppWindow,
  ArrowLeft,
  BellRing,
  Check,
  Download,
  EllipsisVertical,
  Lightbulb,
  Maximize2,
  MonitorDown,
  Share,
  Smartphone,
  SquarePlus,
  WifiOff,
  type LucideIcon,
} from 'lucide-react-native';
import { Screen } from '../components/ui/Screen';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { HouseIllustration } from '../components/brand/HouseIllustration';
import { Alert } from '../lib/alert';
import { getInstallPlatform, useInstallPrompt, type InstallPlatform } from '../lib/pwaInstall';
import { useTheme } from '../lib/theme';

/**
 * Guía para instalar HOMI (la PWA) en el móvil. Es pública, sin iniciar sesión,
 * para poder mandar el enlace (…/instalar) a quien se vaya a unir al piso.
 * Detecta el dispositivo y enseña sus pasos, pero se pueden ver los de los demás.
 */

type Tab = 'iphone' | 'android' | 'desktop';
type Step = { Icon: LucideIcon; title: string; detail: string };

const TABS: { key: Tab; label: string }[] = [
  { key: 'iphone', label: 'iPhone' },
  { key: 'android', label: 'Android' },
  { key: 'desktop', label: 'Ordenador' },
];

const OPEN_STEP: Step = {
  Icon: Smartphone,
  title: 'Abre HOMI desde su icono',
  detail: 'Se abre a pantalla completa, como cualquier otra app.',
};

function iphoneSteps(platform: InstallPlatform): Step[] {
  const inOtherBrowser = platform === 'ios-app';
  return [
    {
      Icon: Share,
      title: 'Toca el botón Compartir',
      detail: inOtherBrowser
        ? 'El cuadrado con una flecha hacia arriba. En Chrome está en la barra de direcciones; en Edge y Firefox, dentro del menú.'
        : 'El cuadrado con una flecha hacia arriba. Según tu versión de iOS está en la barra de abajo o dentro del menú «···».',
    },
    {
      Icon: SquarePlus,
      title: 'Elige «Añadir a pantalla de inicio»',
      detail: 'Si no la ves, desliza la lista de opciones hacia arriba.',
    },
    {
      Icon: AppWindow,
      title: 'Deja activado «Abrir como app web» y pulsa «Añadir»',
      detail: 'En versiones antiguas de iOS esa opción no aparece: pulsa «Añadir» directamente.',
    },
    {
      ...OPEN_STEP,
      detail: 'Puede que tengas que iniciar sesión otra vez: en iPhone, la app instalada no comparte la sesión con el navegador.',
    },
  ];
}

const ANDROID_STEPS: Step[] = [
  { Icon: EllipsisVertical, title: 'Abre el menú ⋮ de Chrome', detail: 'Son los tres puntos de arriba a la derecha.' },
  {
    Icon: SquarePlus,
    title: 'Toca «Añadir a pantalla de inicio»',
    detail: 'En algunas versiones se llama «Instalar aplicación».',
  },
  { Icon: Download, title: 'Pulsa «Instalar»', detail: 'HOMI aparecerá junto al resto de tus apps.' },
  OPEN_STEP,
];

const DESKTOP_STEPS: Step[] = [
  {
    Icon: MonitorDown,
    title: 'Busca el icono de instalar',
    detail: 'En Chrome y Edge está a la derecha de la barra de direcciones (una pantalla con una flecha). En Safari para Mac: Archivo → «Añadir al Dock».',
  },
  { Icon: Download, title: 'Confirma con «Instalar»', detail: 'HOMI se abrirá en su propia ventana.' },
];

const TIPS: Record<Tab, string> = {
  iphone: '¿Has abierto el enlace desde WhatsApp o Instagram? Ábrelo primero en Safari (menú «···» → «Abrir en el navegador»): desde ahí dentro no se puede instalar.',
  android: 'Con Samsung Internet: menú ≡ → «Añadir página a» → «Pantalla de inicio».',
  desktop: 'HOMI está pensada para el móvil. Abre esta misma dirección en tu móvil y sigue los pasos de iPhone o Android.',
};

const BENEFITS: { Icon: LucideIcon; text: string }[] = [
  { Icon: BellRing, text: 'Avisos del chat, las tareas y la compra (en iPhone, solo con la app instalada).' },
  { Icon: Maximize2, text: 'A pantalla completa, sin la barra del navegador.' },
  { Icon: WifiOff, text: 'Abre al momento, aunque tengas mala cobertura.' },
];

function defaultTab(platform: InstallPlatform): Tab {
  if (platform === 'ios' || platform === 'ios-app') return 'iphone';
  return platform;
}

export default function InstallScreen() {
  const router = useRouter();
  const theme = useTheme();
  const platform = getInstallPlatform();
  const [tab, setTab] = useState<Tab>(() => defaultTab(platform));
  const { installed, canPrompt, promptInstall } = useInstallPrompt();
  const [prompting, setPrompting] = useState(false);

  const steps = tab === 'iphone' ? iphoneSteps(platform) : tab === 'android' ? ANDROID_STEPS : DESKTOP_STEPS;
  // La ventana "Instalar" del navegador solo sirve para el dispositivo en el que se está.
  const showQuickInstall = canPrompt && tab === defaultTab(platform);
  const origin = Platform.OS === 'web' ? window.location.host : '';

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function install() {
    setPrompting(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'unavailable') {
        Alert.alert('No se puede instalar desde aquí', 'Sigue los pasos de abajo.');
      }
    } finally {
      setPrompting(false);
    }
  }

  return (
    <Screen scroll>
      <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver" style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={24} color={theme.colors.textPrimary} />
      </Pressable>

      <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
        <HouseIllustration size={84} />
        <Text variant="title" align="center">Instala HOMI</Text>
        <Text variant="body" color="secondary" align="center" style={{ maxWidth: 340 }}>
          Sin tiendas de apps: se instala desde el navegador en un minuto y tendrás su icono en el móvil.
        </Text>
      </View>

      {installed ? (
        <Card style={{ gap: theme.spacing.md, alignItems: 'center' }}>
          <NumberBubble color={theme.colors.lime}>
            <Check size={20} color={theme.colors.textOnFill} strokeWidth={3} />
          </NumberBubble>
          <Text variant="heading" align="center">¡Ya la tienes instalada!</Text>
          <Button title="Entrar en HOMI" onPress={() => router.replace('/')} />
        </Card>
      ) : (
        <>
          <PlatformTabs value={tab} onChange={setTab} />

          {showQuickInstall ? (
            <View style={{ gap: theme.spacing.sm }}>
              <Button title="Instalar HOMI" loading={prompting} onPress={() => void install()} />
              <Text variant="caption" color="secondary" align="center">
                O, si no te sale, a mano:
              </Text>
            </View>
          ) : null}

          <View style={{ gap: theme.spacing.md }}>
            {steps.map((step, index) => (
              <StepCard key={step.title} number={index + 1} step={step} />
            ))}
          </View>

          <Card style={{ flexDirection: 'row', gap: theme.spacing.md, backgroundColor: theme.colors.surfaceAlt, ...theme.shadows.small }}>
            <Lightbulb size={20} color={theme.colors.accent} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="caption">{TIPS[tab]}</Text>
              {tab === 'desktop' && origin ? (
                <Text variant="bodyBold" selectable>{origin}</Text>
              ) : null}
            </View>
          </Card>
        </>
      )}

      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
        <Text variant="label" color="secondary" style={{ paddingHorizontal: 4 }}>
          QUÉ GANAS AL INSTALARLA
        </Text>
        <Card style={{ gap: theme.spacing.md }}>
          {BENEFITS.map(({ Icon, text }) => (
            <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <Icon size={20} color={theme.colors.primary} />
              <Text variant="body" style={{ flex: 1 }}>{text}</Text>
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

/** Selector iPhone / Android / Ordenador: píldoras, la elegida en melocotón. */
function PlatformTabs({ value, onChange }: { value: Tab; onChange: (tab: Tab) => void }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: 4,
        gap: 4,
        borderRadius: theme.radii.pill,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.outline,
        backgroundColor: theme.colors.surface,
      }}
    >
      {TABS.map(({ key, label }) => {
        const selected = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              borderRadius: theme.radii.pill,
              borderWidth: theme.borderWidth,
              borderColor: selected ? theme.colors.outline : 'transparent',
              backgroundColor: selected ? theme.colors.peach : 'transparent',
            }}
          >
            <Text variant="label" color={selected ? 'onFill' : 'secondary'}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StepCard({ number, step }: { number: number; step: Step }) {
  const theme = useTheme();
  const { Icon } = step;
  return (
    <Card style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' }}>
      <NumberBubble color={theme.colors.mustard}>
        <Text variant="heading" color="onFill" style={{ fontSize: 18, lineHeight: 22 }}>{number}</Text>
      </NumberBubble>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="bodyBold">{step.title}</Text>
        <Text variant="caption" color="secondary">{step.detail}</Text>
      </View>
      <Icon size={22} color={theme.colors.textSecondary} />
    </Card>
  );
}

/** Círculo de color con borde de tinta: el número de cada paso (o el check final). */
function NumberBubble({ color, children }: { color: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.outline,
      }}
    >
      {children}
    </View>
  );
}
