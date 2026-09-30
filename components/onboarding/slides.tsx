import type { ComponentType, ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  Bell,
  Check,
  CheckCheck,
  CheckSquare,
  Home,
  MessageCircle,
  PawPrint,
  Plus,
  Share2,
  ShoppingCart,
  Wallet,
} from 'lucide-react-native';
import { brand } from '../../lib/theme';
import { Text } from '../ui/Text';
import { HouseIllustration } from '../brand/HouseIllustration';
import {
  Appear,
  Face,
  IconBubble,
  kf,
  MiniRow,
  showBetween,
  Stage,
  StoryToast,
  StrikeText,
  Tick,
  useStoryClock,
  type Frame,
  type StoryProps,
} from './storyKit';

const ink = brand.ink;

// Compañeros de piso de ejemplo.
const ANA = { letter: 'A', color: brand.peach300 };
const LEO = { letter: 'L', color: brand.lime300 };
const MARTA = { letter: 'M', color: brand.mustard300 };
const YO = { letter: 'Tú', color: brand.orange400 };

// ── 1. Bienvenida ───────────────────────────────────────────────────────────

const WELCOME_CYCLE = 4800;
const WELCOME_BUBBLES = [
  { Icon: CheckSquare, color: brand.lime300, left: '6%', top: '8%' },
  { Icon: ShoppingCart, color: brand.peach300, left: '76%', top: '6%' },
  { Icon: MessageCircle, color: brand.mustard300, left: '2%', top: '56%' },
  { Icon: Wallet, color: brand.lime300, left: '80%', top: '54%' },
  { Icon: PawPrint, color: brand.peach300, left: '44%', top: '80%' },
] as const;
// Dos latidos, como en la pantalla de inicio, y otros dos antes de repetir.
const HEART: Frame[] = [
  [0, 1], [900, 1], [1030, 1.08], [1160, 1], [1280, 1.06], [1440, 1],
  [3200, 1], [3330, 1.08], [3460, 1], [3580, 1.06], [3740, 1],
];
const BOB: Frame[] = [[0, 0], [2400, -7], [WELCOME_CYCLE, 0]];

function WelcomeStory({ active, reduced }: StoryProps) {
  const t = useStoryClock(active, reduced, WELCOME_CYCLE, 2000);
  const house = useAnimatedStyle(() => ({
    transform: [{ translateY: kf(t.value, BOB) }, { scale: kf(t.value, HEART) }],
  }));
  return (
    <Stage style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={house}>
        <HouseIllustration size={128} />
      </Animated.View>
      {WELCOME_BUBBLES.map(({ Icon, color, left, top }, i) => (
        <Appear
          key={i}
          t={t}
          frames={showBetween(250 + i * 160, 4300)}
          from="grow"
          style={{ position: 'absolute', left, top }}
        >
          <IconBubble Icon={Icon} color={color} />
        </Appear>
      ))}
    </Stage>
  );
}

// ── 2. Hogares ──────────────────────────────────────────────────────────────

function HousesStory({ active, reduced }: StoryProps) {
  const t = useStoryClock(active, reduced, 5200, 3000);
  const out = 4700;
  return (
    <Stage style={{ alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <Appear t={t} frames={showBetween(100, out)} from="grow" style={{ alignSelf: 'stretch' }}>
        <MiniRow style={{ paddingVertical: 10 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: ink,
              backgroundColor: brand.peach300,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Home size={22} color={ink} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading" style={{ fontSize: 18, lineHeight: 22, color: ink }}>
              Piso de Lavapiés
            </Text>
            <Text variant="caption" style={{ color: brand.sand600 }}>
              Tu hogar
            </Text>
          </View>
        </MiniRow>
      </Appear>

      <Appear t={t} frames={showBetween(700, out)}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: ink,
            borderStyle: 'dashed',
            backgroundColor: brand.mustard300,
          }}
        >
          <Share2 size={16} color={ink} strokeWidth={2.4} />
          <Text variant="label" style={{ color: ink, letterSpacing: 1.5 }}>
            Código: HM4K2P
          </Text>
        </View>
      </Appear>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Appear t={t} frames={showBetween(1300, out)} from="left" distance={80}>
          <Face {...ANA} size={40} />
        </Appear>
        <Appear t={t} frames={showBetween(1550, out)} from="below" distance={60}>
          <Face {...LEO} size={40} />
        </Appear>
        <Appear t={t} frames={showBetween(1800, out)} from="right" distance={80}>
          <Face {...MARTA} size={40} />
        </Appear>
        <Appear t={t} frames={showBetween(2300, out)} from="grow">
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: ink,
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={20} color={ink} />
          </View>
        </Appear>
      </View>
    </Stage>
  );
}

// ── 3. Inicio: "Para hoy" ───────────────────────────────────────────────────

function Counter({ Icon, n }: { Icon: typeof CheckSquare; n: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: ink,
        backgroundColor: brand.peach100,
      }}
    >
      <Icon size={13} color={ink} strokeWidth={2.4} />
      <Text variant="caption" style={{ color: ink, fontFamily: 'Quicksand_700Bold' }}>
        {n}
      </Text>
    </View>
  );
}

const BADGE_BUMP: Frame[] = [[0, 1], [2200, 1], [2330, 1.35, 'pop'], [2500, 1]];

function TodayStory({ active, reduced }: StoryProps) {
  const t = useStoryClock(active, reduced, 5600, 3200);
  const out = 5000;
  const bump = useAnimatedStyle(() => ({ transform: [{ scale: kf(t.value, BADGE_BUMP) }] }));
  return (
    <Stage>
      <Appear t={t} frames={showBetween(50, out, 'smooth')}>
        <Text variant="heading" style={{ fontSize: 20, lineHeight: 24, color: ink }}>
          ¡Hola, Ana! ☀️
        </Text>
        <Text variant="caption" style={{ color: brand.sand600 }}>
          Para hoy
        </Text>
      </Appear>
      {[
        { title: 'Fregar los platos', at: 300, done: 2700 },
        { title: 'Regar las plantas', at: 480, done: null },
      ].map(({ title, at, done }) => (
        <Appear key={title} t={t} frames={showBetween(at, out)} from="left">
          <MiniRow>
            <Tick t={t} at={done} outAt={out} />
            <View style={{ flex: 1 }}>
              <StrikeText t={t} at={done} outAt={out}>
                {title}
              </StrikeText>
            </View>
            <Face {...ANA} size={24} />
          </MiniRow>
        </Appear>
      ))}
      <Appear t={t} frames={showBetween(1000, out)} style={{ marginTop: 6 }}>
        <MiniRow style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, backgroundColor: brand.peach50 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Home size={18} color={ink} strokeWidth={2.4} />
            <Text variant="label" style={{ flex: 1, color: ink }}>
              Piso de Lavapiés
            </Text>
            <View style={{ flexDirection: 'row' }}>
              {[ANA, LEO, MARTA].map((f, i) => (
                <View key={f.letter} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                  <Face {...f} size={22} />
                </View>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Counter Icon={CheckSquare} n={2} />
            <Counter Icon={ShoppingCart} n={5} />
            <Animated.View style={bump}>
              <Counter Icon={MessageCircle} n={3} />
            </Animated.View>
          </View>
        </MiniRow>
      </Appear>
    </Stage>
  );
}

// ── 4. Tareas ───────────────────────────────────────────────────────────────

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_STEP = 34;
const DAY_SLIDE: Frame[] = [[0, 0], [300, 0], [800, 2], [5200, 2], [5500, 0]];

function TasksStory({ active, reduced }: StoryProps) {
  const t = useStoryClock(active, reduced, 6000, 3600);
  const out = 5300;
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: kf(t.value, DAY_SLIDE) * DAY_STEP }] }));
  return (
    <Stage>
      <View style={{ flexDirection: 'row', gap: DAY_STEP - 28, alignSelf: 'center', marginBottom: 4 }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: ink,
              backgroundColor: brand.peach300,
            },
            pill,
          ]}
        />
        {DAYS.map((d) => (
          <View key={d} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="label" style={{ color: ink }}>
              {d}
            </Text>
          </View>
        ))}
      </View>
      {[
        { title: 'Fregar los platos', room: 'Cocina', face: ANA, at: 300, done: 1500 },
        { title: 'Sacar la basura', room: 'Entrada', face: LEO, at: 450, done: 2300 },
        { title: 'Limpiar el baño', room: 'Baño', face: MARTA, at: 600, done: null },
      ].map(({ title, room, face, at, done }) => (
        <Appear key={title} t={t} frames={showBetween(at, out)} from="right">
          <MiniRow>
            <Tick t={t} at={done} outAt={out} />
            <View style={{ flex: 1 }}>
              <StrikeText t={t} at={done} outAt={out}>
                {title}
              </StrikeText>
              <Text variant="caption" style={{ color: brand.sand600, fontSize: 12, lineHeight: 15 }}>
                {room}
              </Text>
            </View>
            <Face {...face} size={26} />
          </MiniRow>
        </Appear>
      ))}
      <StoryToast
        t={t}
        frames={showBetween(2700, 4400, 'smooth')}
        Icon={CheckSquare}
        text="Leo ha hecho «Sacar la basura»"
      />
    </Stage>
  );
}

// ── 5. Lista de la compra ───────────────────────────────────────────────────

function ShoppingStory({ active, reduced }: StoryProps) {
  const t = useStoryClock(active, reduced, 6600, 4200);
  const out = 6100;
  const items = [
    { name: 'Leche', at: 150, done: 1900 },
    { name: 'Huevos', at: 280, done: 2500 },
    { name: 'Pan', at: 410, done: 3000 },
    { name: 'Café', at: 1100, done: 3500 },
  ];
  return (
    <Stage style={{ gap: 6 }}>
      {items.map(({ name, at, done }) => (
        <Appear key={name} t={t} frames={showBetween(at, out)} from={name === 'Café' ? 'below' : 'left'}>
          <MiniRow style={{ paddingVertical: 5 }}>
            <Tick t={t} at={done} outAt={out} round />
            <StrikeText t={t} at={done} outAt={out}>
              {name}
            </StrikeText>
          </MiniRow>
        </Appear>
      ))}
      <View style={{ flex: 1 }} />
      <MiniRow style={{ backgroundColor: brand.peach50, boxShadow: 'none', paddingVertical: 6 }}>
        <Text variant="caption" style={{ flex: 1, color: brand.sand600 }}>
          Añadir a la lista…
        </Text>
        <Plus size={18} color={ink} strokeWidth={2.4} />
      </MiniRow>
      <StoryToast
        t={t}
        frames={showBetween(2000, 3300, 'smooth')}
        Icon={ShoppingCart}
        text="¡Marta está haciendo la compra!"
      />
      <StoryToast
        t={t}
        frames={showBetween(3700, 5700, 'smooth')}
        Icon={Check}
        text="¡Compra hecha!"
        color={brand.lime300}
      />
    </Stage>
  );
}

// ── 6. Chat ─────────────────────────────────────────────────────────────────

function Bubble({ text, mine = false, children }: { text: string; mine?: boolean; children?: ReactNode }) {
  return (
    <View
      style={{
        maxWidth: '78%',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
        borderBottomRightRadius: mine ? 4 : 16,
        borderBottomLeftRadius: mine ? 16 : 4,
        borderWidth: 2,
        borderColor: ink,
        backgroundColor: mine ? brand.peach300 : brand.white,
        boxShadow: `2px 2px 0px 0px ${ink}`,
      }}
    >
      <Text variant="caption" style={{ color: ink, fontFamily: 'Quicksand_600SemiBold' }}>
        {text}
      </Text>
      {children}
    </View>
  );
}

function ChatStory({ active, reduced }: StoryProps) {
  const t = useStoryClock(active, reduced, 6000, 4200);
  const out = 5400;
  const sentAt = 1100;
  // Un check (enviado) → dos grises (entregado) → dos azules (leído).
  const one: Frame[] = [[sentAt, 1], [1700, 1], [1760, 0], [out + 240, 0], [out + 250, 1]];
  const two: Frame[] = [[1700, 0], [1760, 1], [2500, 1], [2560, 0]];
  const read: Frame[] = [[2500, 0], [2560, 1, 'pop'], [out, 1], [out + 240, 0]];
  const oneStyle = useAnimatedStyle(() => ({ opacity: kf(t.value, one) }));
  const twoStyle = useAnimatedStyle(() => ({ opacity: kf(t.value, two) }));
  const readStyle = useAnimatedStyle(() => ({ opacity: kf(t.value, read) }));

  return (
    <Stage style={{ gap: 10, justifyContent: 'center' }}>
      <Appear t={t} frames={showBetween(300, out)} from="left" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <Face {...LEO} size={26} />
        <Bubble text="¿Alguien ha visto mis llaves? 🔑" />
      </Appear>
      <Appear t={t} frames={showBetween(sentAt, out)} from="right" style={{ alignItems: 'flex-end' }}>
        <Bubble text="¡Están colgadas en la entrada!" mine>
          <View style={{ alignSelf: 'flex-end', width: 18, height: 14, marginTop: 2 }}>
            <Animated.View style={[{ position: 'absolute', right: 0 }, oneStyle]}>
              <Check size={14} color={brand.sand600} strokeWidth={2.6} />
            </Animated.View>
            <Animated.View style={[{ position: 'absolute', right: 0 }, twoStyle]}>
              <CheckCheck size={14} color={brand.sand600} strokeWidth={2.6} />
            </Animated.View>
            <Animated.View style={[{ position: 'absolute', right: 0 }, readStyle]}>
              <CheckCheck size={14} color={brand.readBlue} strokeWidth={2.6} />
            </Animated.View>
          </View>
        </Bubble>
      </Appear>
      <Appear t={t} frames={showBetween(3100, out)} from="left" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <Face {...MARTA} size={26} />
        <Bubble text="¡Genial! Esta noche pizza 🍕" />
      </Appear>
    </Stage>
  );
}

// ── 7. Hucha ────────────────────────────────────────────────────────────────

const PRESS: Frame[] = [[0, 1], [2750, 1], [2850, 0.9], [2980, 1]];

function PiggyStory({ active, reduced }: StoryProps) {
  const t = useStoryClock(active, reduced, 6400, 4400);
  const out = 5900;
  const settled = 3050;
  const press = useAnimatedStyle(() => ({ transform: [{ scale: kf(t.value, PRESS) }] }));
  return (
    <Stage style={{ gap: 12 }}>
      <Appear t={t} frames={showBetween(150, out)} from="above">
        <MiniRow>
          <IconBubble Icon={ShoppingCart} color={brand.peach300} size={34} />
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ color: ink }}>
              Supermercado
            </Text>
            <Text variant="caption" style={{ color: brand.sand600, fontSize: 12, lineHeight: 15 }}>
              Pagado por Marta
            </Text>
          </View>
          <Text variant="heading" style={{ fontSize: 18, lineHeight: 22, color: ink }}>
            36,00 €
          </Text>
        </MiniRow>
      </Appear>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {[YO, ANA, MARTA].map((f, i) => (
          <View key={f.letter} style={{ alignItems: 'center', gap: 6 }}>
            <Face {...f} size={34} />
            <Appear t={t} frames={showBetween(900 + i * 150, out)} from="above" distance={34}>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: ink,
                  backgroundColor: brand.mustard300,
                }}
              >
                <Text variant="caption" style={{ color: ink, fontFamily: 'Quicksand_700Bold' }}>
                  12,00 €
                </Text>
              </View>
            </Appear>
          </View>
        ))}
      </View>

      <Appear t={t} frames={showBetween(1800, out)}>
        <MiniRow style={{ backgroundColor: brand.peach50, minHeight: 52 }}>
          <View style={{ flex: 1, height: 36, justifyContent: 'center' }}>
            <Appear t={t} frames={showBetween(1800, settled, 'smooth', 1)} from="fade" style={{ position: 'absolute' }}>
              <Text variant="caption" style={{ color: brand.sand600 }}>
                Tu balance
              </Text>
              <Text variant="label" style={{ color: brand.danger }}>
                Debes 12,00 € a Marta
              </Text>
            </Appear>
            <Appear t={t} frames={showBetween(settled + 240, out, 'pop')} from="grow" style={{ position: 'absolute' }}>
              <Text variant="label" style={{ color: brand.success }}>
                Todo liquidado ✓
              </Text>
            </Appear>
          </View>
          <Appear t={t} frames={showBetween(1800, settled, 'smooth', 1)} from="fade">
            <Animated.View
              style={[
                {
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: ink,
                  backgroundColor: brand.lime300,
                },
                press,
              ]}
            >
              <Text variant="caption" style={{ color: ink, fontFamily: 'Quicksand_700Bold' }}>
                Liquidar
              </Text>
            </Animated.View>
          </Appear>
        </MiniRow>
      </Appear>
    </Stage>
  );
}

// ── 8. Mascotas ─────────────────────────────────────────────────────────────

const PAWS = [
  { left: '8%', top: '86%' },
  { left: '24%', top: '74%' },
  { left: '40%', top: '84%' },
  { left: '56%', top: '72%' },
  { left: '72%', top: '82%' },
  { left: '87%', top: '70%' },
] as const;

function PetsStory({ active, reduced }: StoryProps) {
  const t = useStoryClock(active, reduced, 5600, 3000);
  const out = 5100;
  return (
    <Stage>
      {/* Huellas que "caminan" por la parte de abajo. */}
      {PAWS.map(({ left, top }, i) => (
        <Appear
          key={i}
          t={t}
          frames={showBetween(1400 + i * 220, 1400 + i * 220 + 1500, 'smooth', 180)}
          from="fade"
          style={{ position: 'absolute', left, top }}
        >
          <View style={{ transform: [{ rotate: '70deg' }] }}>
            <PawPrint size={18} color={brand.orange500} strokeWidth={2.4} />
          </View>
        </Appear>
      ))}
      <Appear t={t} frames={showBetween(100, out)} from="grow" style={{ alignItems: 'center', gap: 2 }}>
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            borderWidth: 2,
            borderColor: ink,
            backgroundColor: brand.mustard300,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `2px 2px 0px 0px ${ink}`,
          }}
        >
          <Text style={{ fontSize: 30, lineHeight: 36 }}>🐶</Text>
        </View>
        <Text variant="heading" style={{ fontSize: 18, lineHeight: 22, color: ink }}>
          Luna
        </Text>
      </Appear>
      {[
        { title: 'Darle de comer', face: ANA, at: 600, done: 2200 },
        { title: 'Paseo de la tarde', face: LEO, at: 780, done: null },
      ].map(({ title, face, at, done }) => (
        <Appear key={title} t={t} frames={showBetween(at, out)} from="right">
          <MiniRow style={{ paddingVertical: 6 }}>
            <Tick t={t} at={done} outAt={out} />
            <View style={{ flex: 1 }}>
              <StrikeText t={t} at={done} outAt={out}>
                {title}
              </StrikeText>
            </View>
            <Face {...face} size={24} />
          </MiniRow>
        </Appear>
      ))}
    </Stage>
  );
}

// ── 9. Final: avisos ────────────────────────────────────────────────────────

const RING: Frame[] = [
  [0, 0], [400, 0], [500, 16], [600, -16], [700, 12], [800, -10], [900, 6], [1000, 0],
  [2800, 0], [2900, 16], [3000, -16], [3100, 10], [3200, 0],
];

function ReadyStory({ active, reduced }: StoryProps) {
  const t = useStoryClock(active, reduced, 4800, 2200);
  const out = 4300;
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${kf(t.value, RING)}deg` }] }));
  return (
    <Stage style={{ gap: 8 }}>
      <Animated.View style={[{ alignSelf: 'center', transformOrigin: 'top', marginBottom: 4 }, ring]}>
        <IconBubble Icon={Bell} color={brand.mustard300} size={56} />
      </Animated.View>
      {[
        { Icon: CheckSquare, text: 'Tarea nueva: Limpiar el baño', color: brand.lime300, at: 600 },
        { Icon: MessageCircle, text: 'Leo: ¿pizza esta noche? 🍕', color: brand.white, at: 900 },
        { Icon: Wallet, text: 'Marta ha añadido un gasto de 36 €', color: brand.peach300, at: 1200 },
      ].map(({ Icon, text, color, at }) => (
        <Appear key={text} t={t} frames={showBetween(at, out)} from="below">
          <MiniRow style={{ backgroundColor: color, paddingVertical: 8 }}>
            <Icon size={17} color={ink} strokeWidth={2.4} />
            <Text variant="caption" style={{ flex: 1, color: ink, fontFamily: 'Quicksand_700Bold' }} numberOfLines={1}>
              {text}
            </Text>
          </MiniRow>
        </Appear>
      ))}
    </Stage>
  );
}

// ── Lista de diapositivas ───────────────────────────────────────────────────

export type Slide = {
  key: string;
  title: string;
  body: string;
  Story: ComponentType<StoryProps>;
};

export const SLIDES: readonly Slide[] = [
  {
    key: 'welcome',
    title: 'Te damos la bienvenida a HOMI',
    body: 'Organizar un piso compartido sin dramas: tareas, compra, chat, gastos y mascotas, todo en un mismo sitio.',
    Story: WelcomeStory,
  },
  {
    key: 'houses',
    title: 'Tu hogar y tu gente',
    body: 'Crea un hogar o únete a uno con un código de invitación. Puedes estar en varios y ordenarlos arrastrando.',
    Story: HousesStory,
  },
  {
    key: 'today',
    title: 'Tu día, de un vistazo',
    body: 'En Inicio tienes tus tareas de hoy de todos tus hogares y un resumen de cada casa: tareas, compra y mensajes sin leer.',
    Story: TodayStory,
  },
  {
    key: 'tasks',
    title: 'Tareas repartidas',
    body: 'Crea tareas por estancias, asígnalas y organízalas en el calendario semanal. Al marcarlas como hechas, el resto del piso se entera.',
    Story: TasksStory,
  },
  {
    key: 'shopping',
    title: 'La compra, compartida',
    body: 'Todos veis la misma lista al momento. Tacha lo que compras y los demás sabrán cuándo empiezas y cuándo has terminado.',
    Story: ShoppingStory,
  },
  {
    key: 'chat',
    title: 'Habla con tu piso',
    body: 'Cada hogar tiene su chat. Los checks te dicen si tu mensaje se ha entregado (✓✓) y si ya lo han leído (en azul).',
    Story: ChatStory,
  },
  {
    key: 'piggy',
    title: 'Cuentas claras con la hucha',
    body: 'Apunta los gastos comunes y la hucha los reparte entre todos. Verás quién debe a quién y podrás liquidar con un toque.',
    Story: PiggyStory,
  },
  {
    key: 'pets',
    title: 'Las mascotas también cuentan',
    body: 'Registra las mascotas del piso y crea sus tareas (comida, paseos, medicación) para que a nadie se le olvide.',
    Story: PetsStory,
  },
  {
    key: 'ready',
    title: '¡Todo listo!',
    body: 'Activa las notificaciones en Ajustes para enterarte de todo. Este tutorial también está ahí, por si quieres volver a verlo.',
    Story: ReadyStory,
  },
];
