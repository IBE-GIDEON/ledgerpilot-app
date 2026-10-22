import { ComponentProps } from 'react';
import { Switch } from 'react-native';

import { Row } from '@/components/ds';
import { useAppTheme } from '@/providers/app-theme-provider';

type SwitchRowProps = {
  title: string;
  subtitle?: string;
  icon?: ComponentProps<typeof Row>['icon'];
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

/** A DS `Row` with a themed native switch. The whole row toggles for a larger target. */
export function SwitchRow({ title, subtitle, icon, value, onValueChange, disabled }: SwitchRowProps) {
  const { theme } = useAppTheme();

  return (
    <Row
      accessibilityLabel={`${title}, ${value ? 'on' : 'off'}`}
      icon={icon}
      onPress={disabled ? undefined : () => onValueChange(!value)}
      subtitle={subtitle}
      title={title}
      trailing={
        <Switch
          accessibilityLabel={title}
          disabled={disabled}
          ios_backgroundColor={theme.borderStrong}
          onValueChange={onValueChange}
          thumbColor={theme.surface}
          trackColor={{ false: theme.borderStrong, true: theme.positive }}
          value={value}
        />
      }
    />
  );
}
