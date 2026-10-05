import { useEffect, useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { openNodeDatabase } from '@/data/local/sqlite/node-database';
import type { ExamContentPack } from '@/domain/exams/types';
import { ok, type Result } from '@/domain/result';
import { LocalDataProvider, useLocalData } from '@/store/LocalDataProvider';

import { loadFixturePack } from '@tests/utils/exam-fixtures';
import { renderWithProviders } from '@tests/utils/render';

/**
 * Local data provider tests.
 *
 * Startup is the riskiest moment in an offline app: migrations run, content is
 * imported, and every screen depends on the result. These tests drive the real
 * provider against a real SQLite database (injected through the opener seam) and
 * verify failure and retry as well as the happy path.
 */

const ContentProbe = ({ examId }: { readonly examId: string }) => {
  const { status, repositories } = useLocalData();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'ready' || repositories === null) return;
    void repositories.questions.countPublished({ examId }).then(setCount);
  }, [examId, repositories, status]);

  return <Text testID="content-count">{count === null ? 'none' : String(count)}</Text>;
};

const StatusProbe = () => {
  const { status, error, retry } = useLocalData();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="error">{error?.message ?? ''}</Text>
      <Pressable testID="retry" onPress={retry}>
        <Text>retry</Text>
      </Pressable>
    </>
  );
};

const packs = (): Result<readonly ExamContentPack[]> => ok([loadFixturePack()]);

describe('LocalDataProvider', () => {
  it('opens the injected database, imports content and becomes ready', async () => {
    const { exam } = loadFixturePack();

    await renderWithProviders(
      <LocalDataProvider openDatabase={async () => openNodeDatabase()} loadPacks={packs}>
        <StatusProbe />
        <ContentProbe examId={exam.id} />
      </LocalDataProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });
    await waitFor(() => {
      expect(screen.getByTestId('content-count')).toHaveTextContent('10');
    });
  });

  it('reports a recoverable failure and becomes ready after retry', async () => {
    let failing = true;

    await renderWithProviders(
      <LocalDataProvider
        openDatabase={async () => {
          if (failing) throw new Error('disk unavailable');
          return openNodeDatabase();
        }}
        loadPacks={packs}
      >
        <StatusProbe />
      </LocalDataProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('failed');
    });
    // The provider intentionally shows the learner-facing message, not the raw
    // driver text.
    expect(screen.getByTestId('error')).toHaveTextContent('Could not open your study data.');

    failing = false;
    fireEvent.press(screen.getByTestId('retry'));

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });
});
