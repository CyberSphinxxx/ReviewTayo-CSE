import { fireEvent } from '@testing-library/react-native';

import {
  RTBadge,
  RTButton,
  RTChoice,
  RTListRow,
  RTProgressBar,
  RTProgressRing,
  RTSegmentedControl,
  RTStateView,
  RTText,
} from '@/components';
import { createTheme } from '@/theme';

import { renderWithProviders } from '@tests/utils/render';

/**
 * Primitive behaviour tests.
 *
 * These assert the interaction contract the feature screens rely on: presses fire,
 * disabled controls refuse input, and state is exposed to assistive technology
 * rather than communicated by colour alone.
 */

describe('RTButton', () => {
  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const view = await renderWithProviders(
      <RTButton label="Start Smart Drill" onPress={onPress} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Start Smart Drill' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks itself disabled and ignores taps while disabled', async () => {
    const onPress = jest.fn();
    const view = await renderWithProviders(
      <RTButton label="Continue" onPress={onPress} disabled />,
    );

    const button = view.getByRole('button', { name: 'Continue' });
    expect(button).toBeDisabled();

    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('announces the busy state while loading and hides the label', async () => {
    const view = await renderWithProviders(
      <RTButton label="Checking" onPress={() => undefined} loading />,
    );

    expect(view.getByRole('button', { name: 'Checking' })).toBeBusy();
    expect(view.queryByText('Checking')).toBeNull();
  });

  it('exposes an accessibility hint for ambiguous actions', async () => {
    const view = await renderWithProviders(
      <RTButton
        label="Practice"
        onPress={() => undefined}
        accessibilityHint="Start weakest area"
      />,
    );

    expect(view.getByRole('button', { name: 'Practice' })).toHaveProp(
      'accessibilityHint',
      'Start weakest area',
    );
  });
});

describe('RTBadge', () => {
  it('renders mastery status text, not only colour', async () => {
    const view = await renderWithProviders(<RTBadge label="Strong" mastery="Strong" />);
    expect(view.getByText('Strong')).toBeOnTheScreen();
  });
});

describe('RTChoice', () => {
  it('announces selection and reports taps', async () => {
    const onPress = jest.fn();
    const view = await renderWithProviders(
      <RTChoice
        title="Continue as guest"
        description="Keep progress on this device."
        selected
        onPress={onPress}
      />,
    );

    const choice = view.getByRole('checkbox', {
      name: 'Continue as guest. Keep progress on this device.',
    });
    expect(choice).toBeSelected();

    await fireEvent.press(choice);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders unselected choices as not selected', async () => {
    const view = await renderWithProviders(
      <RTChoice title="Continue with Google" selected={false} onPress={() => undefined} />,
    );
    expect(view.getByRole('checkbox', { name: 'Continue with Google' })).not.toBeSelected();
  });
});

describe('RTSegmentedControl', () => {
  it('reports the chosen value', async () => {
    const onChange = jest.fn();
    const view = await renderWithProviders(
      <RTSegmentedControl
        label="Appearance"
        value="device"
        onChange={onChange}
        options={[
          { value: 'device', label: 'Device' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />,
    );

    await fireEvent.press(view.getByRole('radio', { name: 'Dark' }));

    expect(onChange).toHaveBeenCalledWith('dark');
  });

  it('marks the active option as selected', async () => {
    const view = await renderWithProviders(
      <RTSegmentedControl
        label="Text size"
        value="large"
        onChange={() => undefined}
        options={[
          { value: 'standard', label: 'Standard' },
          { value: 'large', label: 'Large' },
        ]}
      />,
    );

    expect(view.getByRole('radio', { name: 'Large' })).toBeSelected();
    expect(view.getByRole('radio', { name: 'Standard' })).not.toBeSelected();
  });
});

describe('progress primitives', () => {
  it('exposes bar progress as a percentage value', async () => {
    const view = await renderWithProviders(
      <RTProgressBar value={0.64} label="Verbal Ability accuracy" />,
    );
    expect(view.getByRole('progressbar', { name: 'Verbal Ability accuracy' })).toHaveProp(
      'accessibilityValue',
      { min: 0, max: 100, now: 64 },
    );
  });

  it('clamps out-of-range ring values', async () => {
    const view = await renderWithProviders(<RTProgressRing value={1.4} label="Daily goal" />);
    expect(view.getByRole('progressbar', { name: 'Daily goal' })).toHaveProp('accessibilityValue', {
      min: 0,
      max: 100,
      now: 100,
    });
  });
});

describe('RTListRow', () => {
  it('renders a pressable row with its badge count', async () => {
    const onPress = jest.fn();
    const view = await renderWithProviders(
      <RTListRow title="Mistakes" badgeCount={23} chevron onPress={onPress} />,
    );

    expect(view.getByText('23')).toBeOnTheScreen();

    await fireEvent.press(view.getByRole('button', { name: 'Mistakes' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders non-interactive rows as static content', async () => {
    const view = await renderWithProviders(
      <RTListRow title="Review history" subtitle="48 concepts this week" />,
    );
    expect(view.queryByRole('button', { name: 'Review history' })).toBeNull();
    expect(view.getByText('48 concepts this week')).toBeOnTheScreen();
  });
});

describe('RTStateView', () => {
  it('offers a recovery action for error states', async () => {
    const onAction = jest.fn();
    const view = await renderWithProviders(
      <RTStateView
        kind="error"
        title="We couldn't load your plan"
        description="Your progress is safe."
        actionLabel="Retry"
        onAction={onAction}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Retry' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders caught-up empty states without an action when none is provided', async () => {
    const view = await renderWithProviders(
      <RTStateView kind="empty" title="You're caught up." description="Nothing needs review." />,
    );
    expect(view.getByText("You're caught up.")).toBeOnTheScreen();
    expect(view.queryByRole('button')).toBeNull();
  });
});

describe('RTText', () => {
  it('applies the light theme accent colour when the theme is light', async () => {
    const light = createTheme('light');
    const view = await renderWithProviders(<RTText tone="accent">Study score</RTText>, {
      themePreference: 'light',
    });

    expect(view.getByText('Study score')).toHaveStyle({ color: light.colors.accentText });
  });

  it('applies the dark theme accent colour when the theme is dark', async () => {
    const dark = createTheme('dark');
    const view = await renderWithProviders(<RTText tone="accent">Study score</RTText>, {
      themePreference: 'dark',
    });

    expect(dark.colors.accentText).not.toBe(createTheme('light').colors.accentText);
    expect(view.getByText('Study score')).toHaveStyle({ color: dark.colors.accentText });
  });

  it('scales type with the text size preference', async () => {
    const standard = createTheme('light', 'standard');
    const extra = createTheme('light', 'extra');

    const view = await renderWithProviders(<RTText role="body">Scaled body</RTText>, {
      textSize: 'extra',
    });

    expect(extra.typography.body.fontSize).toBeGreaterThan(standard.typography.body.fontSize ?? 0);
    expect(view.getByText('Scaled body')).toHaveStyle({
      fontSize: extra.typography.body.fontSize,
    });
  });

  it('announces screen and section titles as headings', async () => {
    const view = await renderWithProviders(
      <>
        <RTText role="pageTitle">Study plan</RTText>
        <RTText role="sectionTitle">This week</RTText>
        <RTText role="body">Plain body copy.</RTText>
      </>,
    );

    // Screen readers can jump between headings instead of hearing one long stream.
    expect(view.getByRole('header', { name: 'Study plan' })).toBeOnTheScreen();
    expect(view.getByRole('header', { name: 'This week' })).toBeOnTheScreen();
    expect(view.queryByRole('header', { name: 'Plain body copy.' })).toBeNull();
  });

  it('lets an explicit accessibility role override the derived heading', async () => {
    const view = await renderWithProviders(
      <RTText role="sectionTitle" accessibilityRole="summary">
        Not a heading
      </RTText>,
    );

    expect(view.queryByRole('header')).toBeNull();
    expect(view.getByRole('summary')).toBeOnTheScreen();
  });
});
