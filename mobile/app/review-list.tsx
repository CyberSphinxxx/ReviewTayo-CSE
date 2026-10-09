import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { RTStateView, RTScreenShell } from '@/components';
import type { Repositories } from '@/data/repositories';
import { toAppError, type AppError } from '@/domain/result';
import { ReviewListRows } from '@/features/review';
import { activeExam } from '@/services/exams';
import { isReviewListKind, loadReviewList, type ReviewList } from '@/services/review';
import { useLocalData } from '@/store/LocalDataProvider';

/**
 * The lists behind Review's rows.
 *
 * One route, four lists: mistakes, saved questions, concepts to revisit and the week's
 * history are all the same shape — a title, what it belongs to, and one supporting
 * line — so they are one screen driven by a parameter rather than four screens that
 * would drift apart. An unknown parameter is treated as mistakes rather than as an
 * error, because a stale deep link should still land somewhere true.
 */
export default function ReviewListScreen() {
  const { repositories } = useLocalData();
  const params = useLocalSearchParams<{ kind?: string | string[] }>();
  const raw = typeof params.kind === 'string' ? params.kind : (params.kind?.[0] ?? '');
  const kind = isReviewListKind(raw) ? raw : 'mistakes';

  if (repositories === null) {
    return (
      <RTScreenShell testID="screen-review-list" eyebrow="Review" title="Opening…">
        <RTStateView kind="info" title="Review" description="Reading your queue…" />
      </RTScreenShell>
    );
  }

  return <ReviewListContent repositories={repositories} kind={kind} />;
}

const ReviewListContent = ({
  repositories,
  kind,
}: {
  readonly repositories: Repositories;
  readonly kind: 'mistakes' | 'saved' | 'revisit' | 'history';
}) => {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [list, setList] = useState<ReviewList | null>(null);

  const load = useCallback(async () => {
    try {
      const profile = await repositories.profile.get();
      const exam = activeExam(profile?.examId);
      if (exam === null) {
        throw new Error('No exam content is available yet.');
      }
      setList(
        await loadReviewList({
          repositories,
          exam,
          trackId: profile?.trackId ?? exam.defaultTrackId,
          kind,
        }),
      );
      setError(null);
      setStatus('ready');
    } catch (cause) {
      setError(toAppError(cause, 'Could not load this list.'));
      setStatus('error');
    }
  }, [kind, repositories]);

  // Deferred by a microtask so the first render is never interrupted by the read;
  // the retry button calls `load` directly.
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const title = list?.title ?? 'Review';

  if (status === 'loading') {
    return (
      <RTScreenShell
        testID="screen-review-list"
        eyebrow="Review"
        title={title}
        onBack={() => router.back()}
      >
        <RTStateView
          kind="info"
          title="Review"
          description="Reading your queue…"
          testID="review-list-loading"
        />
      </RTScreenShell>
    );
  }

  if (status === 'error' || list === null) {
    return (
      <RTScreenShell
        testID="screen-review-list"
        eyebrow="Review"
        title={title}
        onBack={() => router.back()}
      >
        <RTStateView
          kind="error"
          title="Could not load this list"
          description={error?.message ?? 'This list could not be read.'}
          actionLabel="Try again"
          onAction={load}
        />
      </RTScreenShell>
    );
  }

  return (
    <RTScreenShell
      testID="screen-review-list"
      eyebrow="Review"
      title={list.title}
      onBack={() => router.back()}
      backLabel="Go back"
    >
      {list.items.length === 0 ? (
        <RTStateView
          kind="info"
          title={list.emptyTitle}
          description={list.emptyDescription}
          testID="review-list-empty"
        />
      ) : (
        <ReviewListRows
          items={list.items}
          onOpenConcept={(conceptId) => {
            if (conceptId === null) return;
            router.push({ pathname: '/concept', params: { conceptId } });
          }}
        />
      )}
    </RTScreenShell>
  );
};
