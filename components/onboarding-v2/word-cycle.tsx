import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { fonts } from '@/constants/theme';

type Word = { label: string; icon: ComponentProps<typeof Ionicons>['name'] };

const ROW = 52;
const STEP_MS = 2400;

type WordCycleProps = {
  words: readonly Word[];
  /** Colour of the active word; the others fade toward transparent. */
  color: string;
};

/**
 * A vertical list of words that rolls upward, one at a time. The centred word is bold with its icon;
 * neighbours fade above and below. Holds still when the system asks for reduced motion.
 */
export function WordCycle({ words, color }: WordCycleProps) {
  const reduceMotion = useReducedMotion();
  const position = useSharedValue(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduceMotion || words.length < 2) {
      return;
    }

    const timer = setInterval(() => {
      setActive((current) => {
        const next = current + 1;
        position.value = withTiming(next, { duration: 650, easing: Easing.out(Easing.cubic) });
        return next;
      });
    }, STEP_MS);

    return () => clearInterval(timer);
  }, [position, reduceMotion, words.length]);

  const current = words[active % words.length];

  return (
    <View
      accessibilityLabel={current.label}
      accessibilityLiveRegion="polite"
      accessible
      style={[styles.frame, { height: ROW * 3 }]}>
      {words.map((word, index) => (
        <CycleItem key={word.label} color={color} count={words.length} index={index} position={position} word={word} />
      ))}
    </View>
  );
}

type CycleItemProps = {
  word: Word;
  index: number;
  count: number;
  color: string;
  position: SharedValue<number>;
};

function CycleItem({ word, index, count, color, position }: CycleItemProps) {
  const rowStyle = useAnimatedStyle(() => {
    // Signed distance from the centre slot, wrapped so the list loops forever.
    let distance = index - (position.value % count);
    if (distance > count / 2) distance -= count;
    if (distance < -count / 2) distance += count;
    const away = Math.abs(distance);

    return {
      opacity: interpolate(away, [0, 1, 1.6], [1, 0.22, 0], 'clamp'),
      transform: [{ translateY: distance * ROW }, { scale: interpolate(away, [0, 1], [1, 0.86], 'clamp') }],
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    let distance = index - (position.value % count);
    if (distance > count / 2) distance -= count;
    if (distance < -count / 2) distance += count;
    return { opacity: interpolate(Math.abs(distance), [0, 0.5], [1, 0], 'clamp') };
  });

  return (
    <Animated.View importantForAccessibility="no-hide-descendants" style={[styles.row, rowStyle]}>
      <Animated.View style={iconStyle}>
        <Ionicons color={color} name={word.icon} size={26} />
      </Animated.View>
      <Animated.Text style={[styles.word, { color }]}>{word.label}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    height: ROW,
    left: 0,
    position: 'absolute',
    right: 0,
    top: ROW,
  },
  word: {
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: -0.6,
  },
});
