(function(RT){
  RT.state = RT.state || {};
  RT.state.store = {
    activeTab: 'home',

    exam: {
      level: 'professional',
      targetDate: '2026-11-15',
      offlineStudy: true
    },

    journey: {
      phase: 'accuracy',
      daysRemaining: 43
    },

    streak: {
      current: 12,
      best: 18,
      maintainedToday: false
    },

    dailyPlan: {
      dailyQuestion: false,
      smartDrill: false,
      reviewDue: false
    },

    weeklyGoal: {
      smartDrills: { current: 3, target: 4 },
      weakReview: { current: 1, target: 1 },
      timedPractice: { current: 0, target: 1 }
    },

    continuity: {
      visible: true,
      title: 'Mock Exam',
      progress: '83 / 170',
      source: 'Desktop · 18 min ago'
    },

    customCount: 20,

    // Quiz runtime state
    quiz: {
      active: false,
      mode: 'smart', // 'smart', 'qotd', 'weak', 'mistakes', 'timed', 'quick', 'custom', 'mock', 'level'
      index: 0,
      selected: null,
      checked: false,
      score: 0,
      session: [],
      currentDifficulty: 'standard',
      streakInDrill: 0,
      adaptiveMix: { weak: 4, recent: 3, reviewDue: 2, coverage: 1 }
    },

    // Spaced review runtime state
    reviewDueSession: {
      active: false,
      index: 0,
      revealed: false,
      queue: [],
      completedCount: 0
    },

    // Progress expanded concepts accordion state
    expandedSubjects: {
      verbal: true, // open by default as primary focus
      numerical: false,
      analytical: false,
      clerical: false,
      general: false
    }
  };
})(window.ReviewTayo);
