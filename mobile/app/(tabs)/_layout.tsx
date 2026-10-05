import { Tabs } from 'expo-router';

import { TAB_DEFINITIONS, TabBarIcon, useDueReviewCount } from '@/navigation';
import { useTheme } from '@/theme';

/**
 * Tab shell.
 *
 * Five destinations in the fixed product order — Learn, Practice, Home, Review,
 * Progress — with Home centred and styled as the owl pill. The Review tab carries
 * a due-count badge read from the local review queue; the badge is decorative, so
 * a missing profile or a storage problem simply leaves it hidden.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const dueCount = useDueReviewCount();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.navActive,
        tabBarInactiveTintColor: theme.colors.navInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.navBackground,
          borderTopColor: theme.colors.border,
          borderTopWidth: theme.borderWidth.hairline,
        },
        tabBarLabelStyle: theme.typography.navLabel,
        sceneStyle: { backgroundColor: theme.colors.canvas },
      }}
    >
      {TAB_DEFINITIONS.map((tab) => {
        const isReview = tab.route === 'review';
        const badge = isReview && dueCount > 0 ? dueCount : undefined;

        return (
          <Tabs.Screen
            key={tab.route}
            name={tab.route}
            options={{
              title: tab.title,
              tabBarAccessibilityLabel:
                badge === undefined
                  ? tab.accessibilityLabel
                  : `${tab.accessibilityLabel}, ${badge} items due`,
              tabBarBadge: badge,
              tabBarBadgeStyle: {
                backgroundColor: theme.colors.primary,
                color: theme.colors.onPrimary,
                fontSize: 10,
                fontWeight: '700',
              },
              tabBarIcon: ({ focused, color }) => (
                <TabBarIcon route={tab.route} focused={focused} color={color} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
