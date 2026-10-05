import type { ComponentType } from 'react';

import {
  HomeIcon,
  LearnIcon,
  PracticeIcon,
  ProgressIcon,
  ReviewIcon,
  type IconProps,
} from '@/components/icons';

/**
 * Top-level navigation configuration.
 *
 * The order is fixed by the product contract — Learn, Practice, Home, Review,
 * Progress, with Home centred — and is defined once here so the route layout, the
 * tests and the accessibility labels cannot drift apart.
 */

export type TabRoute = 'learn' | 'practice' | 'home' | 'review' | 'progress';

export interface TabDefinition {
  readonly route: TabRoute;
  readonly title: string;
  readonly accessibilityLabel: string;
  readonly icon: ComponentType<IconProps>;
}

export const TAB_DEFINITIONS: readonly TabDefinition[] = [
  {
    route: 'learn',
    title: 'Learn',
    accessibilityLabel: 'Learn tab',
    icon: LearnIcon,
  },
  {
    route: 'practice',
    title: 'Practice',
    accessibilityLabel: 'Practice tab',
    icon: PracticeIcon,
  },
  {
    route: 'home',
    title: 'Home',
    accessibilityLabel: 'Home tab',
    icon: HomeIcon,
  },
  {
    route: 'review',
    title: 'Review',
    accessibilityLabel: 'Review tab',
    icon: ReviewIcon,
  },
  {
    route: 'progress',
    title: 'Progress',
    accessibilityLabel: 'Progress tab',
    icon: ProgressIcon,
  },
];

export const HOME_TAB_ROUTE: TabRoute = 'home';

export const HOME_TAB_INDEX = TAB_DEFINITIONS.findIndex((tab) => tab.route === HOME_TAB_ROUTE);

export const findTab = (route: TabRoute): TabDefinition => {
  const tab = TAB_DEFINITIONS.find((candidate) => candidate.route === route);
  if (tab === undefined) throw new Error(`Unknown tab route: ${route}`);
  return tab;
};
