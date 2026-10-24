import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ComponentRef, forwardRef, ReactNode, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { Button } from '@/components/ds/button';
import { Photo } from '@/components/ds/photo';
import { Overline, Text } from '@/components/ds/text';
import { fonts, radius, space } from '@/constants/theme';
import { useAppTheme } from '@/providers/app-theme-provider';

type IconName = ComponentProps<typeof Ionicons>['name'];

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  /** Text shown inside the field before the value, e.g. "$". */
  prefix?: string;
};

/** What a ref to `Field` points at: the native text input (focus, blur, clear). */
export type FieldHandle = ComponentRef<typeof TextInput>;

export const Field = forwardRef<FieldHandle, FieldProps>(function Field(
  { label, error, hint, prefix, style, onFocus, onBlur, ...rest },
  ref
) {
  const { theme } = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text variant="smallMedium" tone="muted">
        {label}
      </Text>
      <View
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.negative : focused ? theme.tint : theme.surface,
          },
        ]}>
        {prefix ? (
          <Text variant="body" tone="muted">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          maxFontSizeMultiplier={1.6}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor={theme.textFaint}
          selectionColor={theme.tint}
          style={[styles.inputText, { color: theme.text }, style]}
          {...rest}
        />
      </View>
      {error ? (
        <Text variant="small" tone="negative">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

type SegmentedProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
};

export function Segmented<T extends string>({ options, value, onChange, labels }: SegmentedProps<T>) {
  const { theme } = useAppTheme();

  return (
    <View accessibilityRole="tablist" style={[styles.segmented, { backgroundColor: theme.surface }]}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={[
              styles.segment,
              selected ? { backgroundColor: theme.surfaceMuted, borderColor: theme.surfaceMuted } : null,
            ]}>
            <Text numberOfLines={1} variant="smallMedium" tone={selected ? 'default' : 'muted'}>
              {labels?.[option] ?? option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
};

export function Chip({ label, selected = false, onPress, icon }: ChipProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.surface,
        },
      ]}>
      {icon ? <Ionicons color={selected ? theme.onPrimary : theme.textMuted} name={icon} size={14} /> : null}
      <Text numberOfLines={1} variant="smallMedium" style={{ color: selected ? theme.onPrimary : theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'accent' | 'primary';
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { theme } = useAppTheme();

  const look = {
    neutral: { bg: theme.surfaceMuted, fg: theme.textMuted },
    positive: { bg: 'rgba(52, 199, 123, 0.14)', fg: theme.positive },
    negative: { bg: 'rgba(255, 90, 95, 0.14)', fg: theme.negative },
    accent: { bg: theme.accentSoft, fg: theme.accent },
    primary: { bg: theme.surfaceMuted, fg: theme.text },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: look.bg }]}>
      <Text numberOfLines={1} variant="caption" style={{ color: look.fg }}>
        {label}
      </Text>
    </View>
  );
}

type EmptyStateProps = {
  icon: IconName;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
  /** A first-run photo shown in place of the icon. */
  photo?: { source: ComponentProps<typeof Photo>['source']; focus: { x: number; y: number }; alt: string };
};

export function EmptyState({ icon, title, body, action, photo }: EmptyStateProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.empty}>
      {photo ? (
        <Photo
          accessibilityLabel={photo.alt}
          aspectRatio={16 / 10}
          focus={photo.focus}
          source={photo.source}
          style={styles.emptyPhoto}
        />
      ) : (
        <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons color={theme.textMuted} name={icon} size={22} />
        </View>
      )}
      <Text align="center" variant="subheading">
        {title}
      </Text>
      <Text align="center" variant="small" tone="muted">
        {body}
      </Text>
      {action ? <Button fullWidth={false} label={action.label} onPress={action.onPress} size="small" variant="secondary" /> : null}
    </View>
  );
}

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  trailing?: ReactNode;
};

/** Serif page title used at the top of tab screens (tabs have no native header). */
export function PageHeader({ title, eyebrow, subtitle, trailing }: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {eyebrow ? <Overline>{eyebrow}</Overline> : null}
        <Text accessibilityRole="header" numberOfLines={2} variant="title">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.headerTrailing}>{trailing}</View> : null}
    </View>
  );
}

type StatProps = {
  label: string;
  children: ReactNode;
  caption?: string;
};

/** Label above a value, used in two- or three-column summaries. */
export function Stat({ label, children, caption }: StatProps) {
  return (
    <View style={styles.stat}>
      <Overline numberOfLines={1}>{label}</Overline>
      {children}
      {caption ? (
        <Text numberOfLines={1} variant="small" tone="faint">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

type ProgressProps = { value: number; tone?: 'primary' | 'accent' | 'negative' };

export function Progress({ value, tone = 'primary' }: ProgressProps) {
  const { theme } = useAppTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const fill = { primary: theme.positive, accent: theme.accent, negative: theme.negative }[tone];

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { backgroundColor: theme.surfaceMuted }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: space.xs + 2,
  },
  input: {
    alignItems: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 50,
    paddingHorizontal: space.md + 2,
  },
  inputText: {
    flex: 1,
    minHeight: 50,
    fontFamily: fonts.sans,
    fontSize: 16,
    paddingVertical: space.md,
  },
  segmented: {
    borderRadius: radius.control,
    flexDirection: 'row',
    padding: 3,
  },
  segment: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: space.sm,
  },
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 36,
    paddingHorizontal: space.md + 2,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  empty: {
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.xxl,
  },
  emptyPhoto: {
    marginBottom: space.md,
    maxWidth: 360,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    marginBottom: space.xs,
    width: 48,
  },
  header: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: space.md,
  },
  headerText: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  headerTrailing: {
    flexDirection: 'row',
    gap: space.sm,
  },
  stat: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  track: {
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
    height: '100%',
  },
});
