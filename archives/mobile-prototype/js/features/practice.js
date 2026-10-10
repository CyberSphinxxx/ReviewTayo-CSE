(function(RT){
  RT.features = RT.features || {};

  function initDisclosure(){
    // More practice options disclosure
    const moreBtn = RT.core.byId('morePracticeBtn');
    const morePanel = RT.core.byId('morePracticePanel');
    moreBtn?.addEventListener('click', () => {
      const open = morePanel?.classList.toggle('show');
      moreBtn.setAttribute('aria-expanded', String(open));
    });

    // Practice by subject disclosure
    const subjectBtn = RT.core.byId('subjectPracticeBtn');
    const subjectPanel = RT.core.byId('subjectPracticePanel');
    subjectBtn?.addEventListener('click', () => {
      const open = subjectPanel?.classList.toggle('show');
      subjectBtn.setAttribute('aria-expanded', String(open));
    });
  }

  function initCustomQuiz(){
    const count = RT.core.byId('customCount');
    RT.core.byId('customBtn')?.addEventListener('click', e => {
      RT.ui.overlays.open('customOverlay', e.currentTarget);
    });

    RT.core.byId('minusQ')?.addEventListener('click', () => {
      RT.state.store.customCount = Math.max(5, RT.state.store.customCount - 5);
      if(count) count.textContent = RT.state.store.customCount;
    });

    RT.core.byId('plusQ')?.addEventListener('click', () => {
      RT.state.store.customCount = Math.min(100, RT.state.store.customCount + 5);
      if(count) count.textContent = RT.state.store.customCount;
    });

    RT.core.byId('startCustom')?.addEventListener('click', () => {
      RT.ui.overlays.close('customOverlay');
      RT.features.quiz.start('custom', true);
    });
  }

  function init(){
    initDisclosure();
    initCustomQuiz();

    // Dominant Smart Drill card start button
    RT.core.byId('startSmartPracticeBtn')?.addEventListener('click', () => {
      RT.features.quiz.start('smart');
    });

    // Mastery Rounds inside advanced options
    RT.core.byId('levelBtn')?.addEventListener('click', () => {
      RT.ui.toast('Mastery Rounds begins with an easier short set');
      setTimeout(() => RT.features.quiz.start('level', true), 350);
    });

    // Mock Exam single row trigger
    RT.core.byId('mockPracticeRow')?.addEventListener('click', e => {
      RT.ui.overlays.open('mockOverlay', e.currentTarget);
    });

    RT.core.byId('startMock')?.addEventListener('click', () => {
      RT.ui.overlays.close('mockOverlay');
      RT.features.quiz.start('mock', true);
    });

    // Subject practice items
    RT.core.$$('[data-practice-subject]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.practiceSubject === 'verbal' ? 'weak' : 'quick';
        RT.features.quiz.start(mode, true);
      });
    });
  }

  RT.features.practice = { init };
})(window.ReviewTayo);
