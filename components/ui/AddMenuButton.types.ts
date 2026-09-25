import type { ReactNode } from 'react';

export type AddMenuAction = {
  key: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress: () => void;
};

export type AddMenuButtonProps = {
  actions: AddMenuAction[];
  accessibilityLabel: string;
};
