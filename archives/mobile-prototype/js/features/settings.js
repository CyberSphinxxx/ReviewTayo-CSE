(function(RT){
  RT.features = RT.features || {};

  function updateCountdownAndJourney(){
    const input = RT.core.byId('targetExamDate');
    if(!input) return;

    if(!input.value){
      const out = RT.core.byId('examCountdown');
      if(out) out.textContent = 'Set an exam date';
      return;
    }

    RT.state.store.exam.targetDate = input.value;
    RT.features.journey?.syncWithTargetDate(input.value);
    RT.features.journey?.renderAll();
  }

  function applyTrack(level){
    RT.state.store.exam.level = level;
    const sub = level === 'subprofessional';

    // Mock exam facts and labels
    const mockCount = RT.core.byId('mockCount');
    if(mockCount) mockCount.textContent = sub ? '165' : '170';

    const practiceMockSub = RT.core.byId('practiceMockSub');
    if(practiceMockSub){
      practiceMockSub.textContent = sub ? '165 items · 2h 40m' : '170 items · 3h 10m';
    }

    const mockDesc = RT.core.byId('mockDescription');
    if(mockDesc){
      mockDesc.textContent = sub
        ? 'Sub-Professional simulation · 165 total items · 2 hr 40 min.'
        : 'Professional-level simulation · 170 total items · 3 hr 10 min.';
    }

    // Learn tab track row
    const trackLearnTitle = RT.core.byId('trackLearnTitle');
    if(trackLearnTitle) trackLearnTitle.textContent = sub ? 'Clerical Ability' : 'Analytical Ability';

    // Practice tab track row
    const trackPracticeTitle = RT.core.byId('trackPracticeTitle');
    if(trackPracticeTitle) trackPracticeTitle.textContent = sub ? 'Clerical Ability' : 'Analytical Ability';

    // Mock modal facts
    const mockFactItems = RT.core.byId('mockFactItems');
    if(mockFactItems) mockFactItems.textContent = sub ? '165' : '170';

    const mockFactTime = RT.core.byId('mockFactTime');
    if(mockFactTime) mockFactTime.textContent = sub ? '2:40' : '3:10';

    const mockSheetLead = RT.core.byId('mockSheetLead');
    if(mockSheetLead){
      mockSheetLead.textContent = sub
        ? 'Sub-Professional simulation using exam-style pacing.'
        : 'Professional simulation using exam-style pacing.';
    }

    // Refresh concept mastery in Progress
    RT.features.mastery?.render();

    // Refresh mock results in Progress
    RT.features.mockResults?.renderProgressMockCard();
  }

  function init(){
    RT.core.byId('settingsBtn')?.addEventListener('click', e => {
      RT.ui.overlays.open('settingsOverlay', e.currentTarget);
    });

    // Segmented button selection
    RT.core.$$('.seg').forEach(group => group.addEventListener('click', e => {
      if(!e.target.classList.contains('segbtn')) return;
      group.querySelectorAll('.segbtn').forEach(x => x.classList.remove('active'));
      e.target.classList.add('active');
    }));

    // Level toggle
    RT.core.byId('levelSegment')?.addEventListener('click', e => {
      if(e.target.matches('[data-level]')){
        applyTrack(e.target.dataset.level);
        RT.ui.toast(`Switched to ${e.target.dataset.level === 'subprofessional' ? 'Sub-Professional' : 'Professional'} track`);
      }
    });

    // Date change
    RT.core.byId('targetExamDate')?.addEventListener('change', updateCountdownAndJourney);

    // Save button
    RT.core.byId('saveSettings')?.addEventListener('click', () => {
      RT.state.store.exam.offlineStudy = RT.core.byId('offlineToggle')?.checked ?? true;
      updateCountdownAndJourney();
      RT.ui.overlays.close('settingsOverlay');
      RT.ui.toast(RT.state.store.exam.offlineStudy ? 'Settings saved · offline study pack ready' : 'Exam settings saved');
    });

    updateCountdownAndJourney();
  }

  RT.features.settings = {
    init,
    applyTrack,
    updateCountdownAndJourney
  };
})(window.ReviewTayo);
