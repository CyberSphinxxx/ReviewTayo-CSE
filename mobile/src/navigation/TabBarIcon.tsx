import { View, type ColorValue } from 'react-native';

import { RTOwlMark } from '@/components/brand/RTOwlMark';
import { useTheme } from '@/theme';

import type { TabRoute } from './tabs';
import { findTab } from './tabs';

/**
 * Tab bar icon.
 *
 * Mirrors the reference prototype: a pill behind the active icon, and for Home a
 * filled maroon pill with the owl mark that gains a rose ring when active. The
 * mark is decorative here — the tab item itself carries the accessibility label —
 * so the whole subtree is hidden from screen readers to avoid a double stop.
 */

export interface TabBarIconProps {
  readonly route: TabRoute;
  readonly focused: boolean;
  /** Colour supplied by the navigator for the inactive/active state. */
  readonly color: ColorValue;
}

export const TabBarIcon = ({ route, focused, color }: TabBarIconProps) => {
  const theme = useTheme();
  const tab = findTab(route);
  const isHome = route === 'home';
  const Icon = tab.icon;

  const background = isHome
    ? theme.colors.navHomeBackground
    : focused
      ? theme.colors.navActivePill
      : 'transparent';
  // The navigator may supply a platform colour object; the icon set draws with
  // plain strings, so fall back to the themed role in that case.
  const resolvedColor = typeof color === 'string' ? color : theme.colors.navInactive;
  const iconColor = isHome ? theme.colors.navHomeContent : resolvedColor;

  return (
    <View
      testID={`tab-icon-${route}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 52,
        height: 30,
        borderRadius: theme.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
        borderWidth: isHome && focused ? 3 : 0,
        borderColor: theme.colors.navHomeRing,
      }}
    >
      {isHome ? <RTOwlMark width={22} cropped /> : <Icon size={22} color={iconColor} />}
    </View>
  );
};
