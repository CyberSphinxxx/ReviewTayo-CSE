(function(RT){
  RT.features = RT.features || {};

  function calculateDays(targetDateStr){
    if(!targetDateStr) return 43; // default
    const now = new Date();
    const exam = new Date(targetDateStr + 'T12:00:00');
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.ceil((exam - start) / 86400000);
    return isNaN(diff) ? 43 : diff;
  }

  function getPhaseStatus(phaseId, currentPhaseId){
    const order = ['foundation', 'accuracy', 'speed', 'mock_week', 'final_review'];
    const currentIndex = order.indexOf(currentPhaseId);
    const phaseIndex = order.indexOf(phaseId);
    if(phaseIndex < currentIndex) return { status: 'completed', label: 'Completed', icon: '✓' };
    if(phaseIndex === currentIndex) return { status: 'current', label: 'Current Phase', icon: '●' };
    if(phaseIndex === currentIndex + 1) return { status: 'upcoming', label: 'Next', icon: '○' };
    return { status: 'locked', label: 'Locked', icon: '🔒' };
  }

  function syncWithTargetDate(targetDateStr){
    const days = calculateDays(targetDateStr);
    const phaseObj = RT.data.journey.getPhaseForDays(days);
    RT.state.store.journey.daysRemaining = days;
    RT.state.store.journey.phase = phaseObj.id;
    return { days, phaseObj };
  }

  function renderToday(){
    const currentId = RT.state.store.journey.phase;
    const phaseObj = RT.data.journey.phases.find(p => p.id === currentId) || RT.data.journey.phases[1];
    const days = RT.state.store.journey.daysRemaining;

    // Compact single line on Today hero: "Accuracy Phase · 43 days left"
    const heroLine = RT.core.byId('todayHeroPhaseLine');
    if(heroLine){
      heroLine.textContent = `${phaseObj.name} Phase · ${days > 1 ? `${days} days left` : days === 1 ? '1 day left' : 'Exam day'}`;
    }

    const heroFocus = RT.core.byId('todayHeroFocus');
    if(heroFocus && !RT.features.studyPlan?.isDoneToday?.()){
      heroFocus.textContent = 'Verbal Ability needs the most work today.';
    }
  }

  function renderProgressJourney(){
    const currentId = RT.state.store.journey.phase;
    const days = RT.state.store.journey.daysRemaining;
    const currentPhase = RT.data.journey.phases.find(p => p.id === currentId) || RT.data.journey.phases[1];

    // Summary subrow in disclosure
    const subLabel = RT.core.byId('progressJourneySubLabel');
    if(subLabel){
      subLabel.textContent = `${currentPhase.name} Phase · ${days > 1 ? `${days} days left` : days === 1 ? '1 day left' : 'Exam day'}`;
    }

    // Panel content when expanded
    const panel = RT.core.byId('progressJourneyPanel');
    if(panel){
      panel.innerHTML = `
        <div class="panel-box">
          <p class="panel-sub-lead">${currentPhase.focus}</p>
          <div class="compact-journey-steps">
            ${RT.data.journey.phases.map(p => {
              const st = getPhaseStatus(p.id, currentId);
              return `
                <div class="cjs-item ${st.status === 'current' ? 'current' : ''}">
                  <div>
                    <span style="display:inline-block;width:16px">${st.icon}</span>
                    <strong>${p.name}</strong>
                  </div>
                  <small>${st.label}</small>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
  }

  function renderAll(){
    renderToday();
    renderProgressJourney();
  }

  function init(){
    const savedDate = RT.state.store.exam.targetDate;
    syncWithTargetDate(savedDate);
    renderAll();
  }

  RT.features.journey = {
    init,
    calculateDays,
    syncWithTargetDate,
    renderAll,
    renderToday,
    getPhaseStatus
  };
})(window.ReviewTayo);
