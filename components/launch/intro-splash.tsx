import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { fonts } from '@/constants/theme';

/** Matches `imageWidth` of expo-splash-screen in app.json so the hand-off is seamless. */
const LOGO_SIZE = 120;
const BACKGROUND = '#0B0B0C';
const NAME = '#FFFFFF';
const ASH = '#8E8E93';

type IntroSplashProps = {
  /** True once fonts and the session are ready; the intro won't leave before then. */
  ready: boolean;
  onDone: () => void;
};

/**
 * Plays over the app right after the native splash: the logo bounces, then the name rises
 * from the bottom to sit under it, and the whole layer fades away.
 */
export function IntroSplash({ ready, onDone }: IntroSplashProps) {
  const reduceMotion = useReducedMotion();
  const { height } = useWindowDimensions();

  const logoY = useSharedValue(0);
  const squash = useSharedValue(1);
  const nameY = useSharedValue(height / 2);
  const nameOpacity = useSharedValue(0);
  const layerOpacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      nameY.value = 0;
      nameOpacity.value = 1;
      return;
    }

    const up = (to: number, ms: number) => withTiming(to, { duration: ms, easing: Easing.out(Easing.quad) });
    const down = (ms: number) => withTiming(0, { duration: ms, easing: Easing.in(Easing.quad) });

    // Two hops that lose height, then the logo lifts to make room for the name.
    logoY.value = withSequence(
      up(-70, 300),
      down(280),
      up(-26, 200),
      down(190),
      withTiming(-36, { duration: 420, easing: Easing.inOut(Easing.cubic) })
    );
    // A quick squash each time it lands.
    squash.value = withSequence(
      withDelay(580, withTiming(0.88, { duration: 70 })),
      withTiming(1, { duration: 140 }),
      withDelay(180, withTiming(0.94, { duration: 60 })),
      withTiming(1, { duration: 120 })
    );
    nameOpacity.value = withDelay(1050, withTiming(1, { duration: 450 }));
    nameY.value = withDelay(
      1050,
      withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) })
    );
  }, [height, logoY, nameOpacity, nameY, reduceMotion, squash]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    // Leave once the animation has had its moment and the app underneath is ready.
    const timer = setTimeout(
      () => {
        layerOpacity.value = withTiming(0, { duration: 320 }, (finished) => {
          if (finished) {
            runOnJS(onDone)();
          }
        });
      },
      reduceMotion ? 400 : 2100
    );

    return () => clearTimeout(timer);
  }, [layerOpacity, onDone, ready, reduceMotion]);

  const layerStyle = useAnimatedStyle(() => ({ opacity: layerOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: logoY.value + (1 - squash.value) * (LOGO_SIZE / 2) },
      { scaleX: 2 - squash.value },
      { scaleY: squash.value },
    ],
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameY.value }],
  }));

  return (
    <Animated.View accessibilityLabel="Lancer" accessible style={[StyleSheet.absoluteFill, styles.layer, layerStyle]}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Image
            accessibilityIgnoresInvertColors
            contentFit="contain"
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
          />
        </Animated.View>
        <Animated.View style={[styles.nameBlock, nameStyle]}>
          <Animated.Text style={styles.name}>Lancer</Animated.Text>
          <Animated.Text style={styles.tagline}>Money and tax, sorted</Animated.Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    backgroundColor: BACKGROUND,
    zIndex: 100,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    height: LOGO_SIZE,
    width: LOGO_SIZE,
  },
  nameBlock: {
    alignItems: 'center',
    gap: 4,
    // Sits under the logo without moving it off the native splash's centre.
    position: 'absolute',
    top: '50%',
    marginTop: LOGO_SIZE / 2 + 4,
  },
  name: {
    color: NAME,
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: -0.6,
  },
  tagline: {
    color: ASH,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
});
