import { useEffect, useState } from 'react';

import type { Repositories } from '@/data/repositories';
import { useLocalData } from '@/store/LocalDataProvider';

/**
 * Due-review count for the Review tab badge.
 *
 * A fresh install has no exam profile yet, and a badge is decorative: any storage
 * problem must leave the badge at zero rather than break navigation. The pure
 * helper is exported so the behaviour is testable without rendering the tab bar.
 */
export const countDueReviews = async (
  repositories: Repositories,
  nowIso: string,
): Promise<number> => {
  const profile = await repositories.profile.get();
  if (profile === null) return 0;
  return repositories.review.countDue(profile.examId, nowIso);
};

export const useDueReviewCount = (): number => {
  const { status, repositories } = useLocalData();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (status !== 'ready' || repositories === null) return undefined;
    let active = true;
    void countDueReviews(repositories, new Date().toISOString())
      .then((due) => {
        if (active) setCount(due);
      })
      .catch(() => {
        if (active) setCount(0);
      });
    return () => {
      active = false;
    };
  }, [repositories, status]);

  return count;
};
