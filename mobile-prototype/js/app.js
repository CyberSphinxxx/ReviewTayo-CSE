document.addEventListener('DOMContentLoaded', () => {
  const RT = window.ReviewTayo;

  // Initialize UI Primitives
  RT.ui.overlays.init();

  // Initialize Features
  RT.features.navigation.init();
  RT.features.settings.init();
  RT.features.journey.init();
  RT.features.streak.init();
  RT.features.studyPlan.init();
  RT.features.reviewDue.init();
  RT.features.mastery.init();
  RT.features.weeklyGoal.init();
  RT.features.mockResults.init();
  RT.features.study.init();
  RT.features.review.init();
  RT.features.quiz.init();
  RT.features.practice.init();

  // Restore initial tab (Home is default)
  RT.features.navigation.switchTab(RT.state.store.activeTab || 'home');

  // Dismiss continuity card if clicked
  RT.core.byId('dismissContinuityBtn')?.addEventListener('click', () => {
    const card = RT.core.byId('continuityCard');
    if(card) card.style.display = 'none';
    RT.state.store.continuity.visible = false;
  });

  // Progress screen disclosures
  ['progressJourneyToggle', 'progressWeekToggle', 'progressMockToggle'].forEach(id => {
    const btn = RT.core.byId(id);
    if(!btn) return;
    btn.addEventListener('click', () => {
      const panelId = btn.getAttribute('aria-controls');
      const panel = RT.core.byId(panelId);
      const open = panel?.classList.toggle('show');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // Practice screen adaptive preview disclosure (subtle)
  RT.core.byId('adaptiveDisclosureBtn')?.addEventListener('click', e => {
    const btn = e.currentTarget;
    const panel = RT.core.byId('adaptiveDisclosurePanel');
    const open = panel?.classList.toggle('show');
    btn.setAttribute('aria-expanded', String(open));
  });
});
