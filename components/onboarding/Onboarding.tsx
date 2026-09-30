import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { brand } from '../../lib/theme';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { WatercolorTape } from '../brand/WatercolorTape';
import { SLIDES, type Slide } from './slides';

/** Ancho máximo del contenido (en tablet o en el ordenador no se estira). */
const MAX_CONTENT = 420;

/**
 * Tutorial "Cómo funciona HOMI": sale solo la primera vez que un usuario entra
 * y se puede volver a abrir desde Ajustes. Va encima de la app (y debajo de la
 * animación de inicio, que se desvanece dejándolo ver).
 */
export function Onboarding() {
  const userId = useAuthStore((s) => s.user?.id);
  const visible = useOnboardingStore((s) => s.visible);
  const checkFirstTime = useOnboardingStore((s) => s.checkFirstTime);
  const finish = useOnboardingStore((s) => s.finish);

  useEffect(() => {
    if (userId) void checkFirstTime(userId);
  }, [userId, checkFirstTime]);

  if (!visible || !userId) return null;
  return <OnboardingPager onDone={() => finish(userId)} />;
}

function OnboardingPager({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  // Diapositiva "asentada": la que está quieta en pantalla (su historia se reproduce).
  const [index, setIndex] = useState(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const isLast = index === SLIDES.length - 1;

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  // Se considera que ha cambiado de diapositiva cuando el scroll se para justo en
  // una página. Funciona igual en iOS, Android y web (en web no hay onMomentumScrollEnd).
  useAnimatedReaction(
    () => {
      if (width === 0) return -1;
      const page = Math.round(scrollX.value / width);
      return Math.abs(scrollX.value - page * width) < 1 ? page : -1;
    },
    (page, prev) => {
      if (page >= 0 && page !== prev) scheduleOnRN(setIndex, page);
    },
    [width],
  );

  function goTo(page: number) {
    scrollRef.current?.scrollTo({ x: page * width, animated: !reduced });
  }

  function next() {
    if (isLast) onDone();
    else goTo(index + 1);
  }

  // Android: el botón "atrás" vuelve a la diapositiva anterior en vez de salir.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index > 0) goTo(index - 1);
      else onDone();
      return true;
    });
    return () => sub.remove();
  });

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(250)}
      style={[StyleSheet.absoluteFill, { zIndex: 950 }]}
      accessibilityViewIsModal
    >
      <LinearGradient colors={brand.gradient} locations={[0, 0.35, 0.7, 1]} style={{ flex: 1 }}>
        <View style={{ position: 'absolute', top: 0, bottom: 0, width: '56%', alignSelf: 'center' }}>
          <WatercolorTape />
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            minHeight: insets.top + 48,
          }}
        >
          {!isLast ? (
            <Pressable
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLabel="Saltar el tutorial"
              hitSlop={12}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: brand.ink,
                backgroundColor: brand.cream,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text variant="label" style={{ color: brand.ink }}>
                Saltar
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ flex: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 ? (
            <Animated.ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              bounces={false}
            >
              {SLIDES.map((slide, i) => (
                <Page
                  key={slide.key}
                  slide={slide}
                  index={i}
                  width={width}
                  scrollX={scrollX}
                  active={i === index}
                  reduced={reduced}
                />
              ))}
            </Animated.ScrollView>
          ) : null}
        </View>

        <View
          style={{
            alignItems: 'center',
            gap: 18,
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <View
            style={{ flexDirection: 'row', gap: 6 }}
            accessible
            accessibilityLabel={`Paso ${index + 1} de ${SLIDES.length}`}
          >
            {SLIDES.map((slide, i) => (
              <Dot key={slide.key} index={i} width={width} scrollX={scrollX} />
            ))}
          </View>
          <View style={{ width: '100%', maxWidth: MAX_CONTENT }}>
            <Button
              title={isLast ? '¡Empezar!' : 'Siguiente'}
              variant={isLast ? 'secondary' : 'primary'}
              onPress={next}
            />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

type PageProps = {
  slide: Slide;
  index: number;
  width: number;
  scrollX: SharedValue<number>;
  active: boolean;
  reduced: boolean;
};

function Page({ slide, index, width, scrollX, active, reduced }: PageProps) {
  const { Story } = slide;
  // Paralaje: al deslizar, la ilustración va un poco más rápida que el texto
  // (entra desde más lejos y sale antes), sin asomar en la diapositiva vecina.
  const parallax = useAnimatedStyle(() => ({
    transform: [{ translateX: (index * width - scrollX.value) * 0.3 }],
  }));

  return (
    <View style={{ width, paddingHorizontal: 24, justifyContent: 'center' }}>
      <View style={{ width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center', gap: 22 }}>
        {/* La ilustración es decorativa: los lectores de pantalla leen el título y el texto. */}
        <Animated.View
          style={parallax}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Story active={active} reduced={reduced} />
        </Animated.View>
        <View style={{ gap: 8 }}>
          <Text variant="title" style={{ color: brand.ink, fontSize: 30, lineHeight: 35 }} accessibilityRole="header">
            {slide.title}
          </Text>
          <Text variant="body" style={{ color: brand.ink, fontSize: 16.5, lineHeight: 23 }}>
            {slide.body}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Punto de progreso: el de la diapositiva actual se alarga (sigue al dedo al deslizar). */
function Dot({ index, width, scrollX }: { index: number; width: number; scrollX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const pos = width === 0 ? 0 : scrollX.value / width;
    const input = [index - 1, index, index + 1];
    return {
      width: interpolate(pos, input, [8, 24, 8], Extrapolation.CLAMP),
      opacity: interpolate(pos, input, [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });
  return (
    <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: brand.ink }, style]} />
  );
}
