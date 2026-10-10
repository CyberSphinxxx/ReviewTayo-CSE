(function(RT){
  RT.data = RT.data || {};
  RT.data.mockResults = {
    professional: {
      score: 139,
      total: 170,
      percentage: 82,
      dateTaken: '2 days ago',
      timeSpent: '2 hr 48 min',
      breakdown: [
        { subject: 'Verbal Ability', score: '36/50', percentage: 72, status: 'Needs attention', color: 'var(--maroon)' },
        { subject: 'Numerical Ability', score: '35/40', percentage: 88, status: 'Strong', color: 'var(--green)' },
        { subject: 'Analytical Ability', score: '34/40', percentage: 85, status: 'Strong', color: 'var(--green)' },
        { subject: 'General Information', score: '34/40', percentage: 79, status: 'On track', color: 'var(--gold)' }
      ],
      next7Days: [
        { day: 'Mon', topic: 'Sentence Completion', type: 'Weak area drill', duration: '15 min' },
        { day: 'Tue', topic: 'General Information', type: 'Constitution & RA 6713', duration: '20 min' },
        { day: 'Wed', topic: 'Timed Numerical', type: 'Pacing sprint (20 Qs)', duration: '15 min' },
        { day: 'Thu', topic: 'Review Mistakes', type: 'Retry past mock misses', duration: '20 min' },
        { day: 'Fri', topic: 'Smart Drill', type: 'Adaptive 10-Q mix', duration: '12 min' },
        { day: 'Sat', topic: 'Light Review', type: 'Due flashcards only', duration: '10 min' },
        { day: 'Sun', topic: 'Full Simulation', type: 'Mock Exam Sprint', duration: '60 min' }
      ]
    },
    subprofessional: {
      score: 135,
      total: 165,
      percentage: 82,
      dateTaken: '2 days ago',
      timeSpent: '2 hr 24 min',
      breakdown: [
        { subject: 'Verbal Ability', score: '36/50', percentage: 72, status: 'Needs attention', color: 'var(--maroon)' },
        { subject: 'Numerical Ability', score: '35/40', percentage: 88, status: 'Strong', color: 'var(--green)' },
        { subject: 'Clerical Ability', score: '35/40', percentage: 87, status: 'Strong', color: 'var(--green)' },
        { subject: 'General Information', score: '29/35', percentage: 79, status: 'On track', color: 'var(--gold)' }
      ],
      next7Days: [
        { day: 'Mon', topic: 'Sentence Completion', type: 'Weak area drill', duration: '15 min' },
        { day: 'Tue', topic: 'General Information', type: 'Constitution & Ethics', duration: '20 min' },
        { day: 'Wed', topic: 'Clerical Operations', type: 'Filing & accuracy sprint', duration: '15 min' },
        { day: 'Thu', topic: 'Review Mistakes', type: 'Retry past mock misses', duration: '20 min' },
        { day: 'Fri', topic: 'Smart Drill', type: 'Adaptive 10-Q mix', duration: '12 min' },
        { day: 'Sat', topic: 'Light Review', type: 'Due flashcards only', duration: '10 min' },
        { day: 'Sun', topic: 'Full Simulation', type: 'Sub-Prof Mock Sprint', duration: '60 min' }
      ]
    }
  };
})(window.ReviewTayo);
