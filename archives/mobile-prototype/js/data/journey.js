(function(RT){
  RT.data = RT.data || {};
  RT.data.journey = {
    phases: [
      {
        id: 'foundation',
        name: 'Foundation',
        minDays: 61,
        maxDays: Infinity,
        focus: 'Core concept coverage and foundational mastery before testing speed.',
        emphasis: 'Study lessons · Untimed practice · Core rules',
        recommendation: 'Complete foundational lessons in your lowest-confidence topics.'
      },
      {
        id: 'accuracy',
        name: 'Accuracy',
        minDays: 31,
        maxDays: 60,
        focus: 'Improve reliable answers before adding time pressure.',
        emphasis: 'Smart Drills · Error analysis · Spaced review',
        recommendation: 'Your next 10 questions are ready. We found 3 concepts worth strengthening today.'
      },
      {
        id: 'speed',
        name: 'Speed',
        minDays: 15,
        maxDays: 30,
        focus: 'Build pacing and question triage without sacrificing accuracy.',
        emphasis: 'Timed sprints · Question elimination · Pacing checks',
        recommendation: 'Focus on time per question: target under 55 seconds on Verbal items.'
      },
      {
        id: 'mock_week',
        name: 'Mock Week',
        minDays: 7,
        maxDays: 14,
        focus: 'Full simulations, timing, stamina, and mistake recovery.',
        emphasis: 'Full mock simulations · Stamina · Weak-link remediation',
        recommendation: 'Complete one full-length mock simulation and review every error.'
      },
      {
        id: 'final_review',
        name: 'Final Review',
        minDays: 0,
        maxDays: 6,
        focus: 'High-yield flashcards, Constitution essentials, and exam-day calm.',
        emphasis: 'Spaced review · High-yield formulas · Rest and pacing',
        recommendation: 'Keep sessions short: review due flashcards and rest your mind.'
      }
    ],
    getPhaseForDays(days){
      if(days > 60) return this.phases[0];
      if(days >= 31) return this.phases[1];
      if(days >= 15) return this.phases[2];
      if(days >= 7) return this.phases[3];
      return this.phases[4];
    }
  };
})(window.ReviewTayo);
