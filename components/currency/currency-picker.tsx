import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, Field, List, Row, Section, Text } from '@/components/ds';
import { space } from '@/constants/theme';
import { currencyName, currencySymbol, deviceCurrency, searchCurrencies } from '@/lib/currencies';
import { useAppTheme } from '@/providers/app-theme-provider';

type CurrencyPickerProps = {
  value: string;
  onChange: (code: string) => void;
};

/** Search every currency; the phone's region currency is offered first. */
export function CurrencyPicker({ value, onChange }: CurrencyPickerProps) {
  const [query, setQuery] = useState('');
  const regional = useMemo(() => deviceCurrency(), []);
  const results = useMemo(() => searchCurrencies(query), [query]);
  const searching = query.trim().length > 0;

  return (
    <View style={styles.root}>
      <Field
        autoCapitalize="none"
        autoCorrect={false}
        label="Search"
        onChangeText={setQuery}
        placeholder="Naira, EUR, dollar…"
        returnKeyType="search"
        value={query}
      />

      {!searching ? (
        <Section title="Your region">
          <List>
            <CurrencyRow code={regional} onPress={onChange} selected={value === regional} />
          </List>
        </Section>
      ) : null}

      <Section title={searching ? `${results.length} found` : 'All currencies'}>
        {results.length === 0 ? (
          <EmptyState body="Try the currency's name or its 3-letter code." icon="search-outline" title="No match" />
        ) : (
          <List>
            {results.map((item) => (
              <CurrencyRow key={item.code} code={item.code} onPress={onChange} selected={value === item.code} />
            ))}
          </List>
        )}
      </Section>
    </View>
  );
}

type CurrencyRowProps = {
  code: string;
  selected: boolean;
  onPress: (code: string) => void;
};

const CurrencyRow = memo(function CurrencyRow({ code, selected, onPress }: CurrencyRowProps) {
  const { theme } = useAppTheme();
  const symbol = currencySymbol(code);

  return (
    <Row
      accessibilityLabel={`${currencyName(code)}, ${code}${selected ? ', selected' : ''}`}
      onPress={() => onPress(code)}
      subtitle={code}
      title={currencyName(code)}
      trailing={
        <View style={styles.trailing}>
          {symbol !== code ? (
            <Text tone="muted" variant="bodyMedium">
              {symbol}
            </Text>
          ) : null}
          <Ionicons
            color={selected ? theme.tint : theme.borderStrong}
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
          />
        </View>
      }
    />
  );
});

const styles = StyleSheet.create({
  root: {
    gap: space.xl,
  },
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
});
