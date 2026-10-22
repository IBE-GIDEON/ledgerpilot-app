import { StyleSheet, View } from 'react-native';

import { Screen, Text } from '@/components/ds';
import { space } from '@/constants/theme';
import { appInfo } from '@/lib/app-info';

export type LegalSection = { title: string; body: string };

type LegalPageProps = {
  intro: string;
  sections: readonly LegalSection[];
};

/** Long-form legal text: serif headings, body copy with room to breathe. */
export function LegalPage({ intro, sections }: LegalPageProps) {
  return (
    <Screen header>
      <View style={styles.intro}>
        <Text variant="caption" tone="faint">
          {appInfo.legalUpdatedLabel}
        </Text>
        <Text variant="body" style={styles.prose}>
          {intro}
        </Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text accessibilityRole="header" variant="heading">
            {section.title}
          </Text>
          <Text variant="body" tone="muted" style={styles.prose}>
            {section.body}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: space.sm,
  },
  section: {
    gap: space.sm,
  },
  prose: {
    lineHeight: 26,
  },
});
