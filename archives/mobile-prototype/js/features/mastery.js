(function(RT){
  RT.features = RT.features || {};

  function getTrackData(){
    const level = RT.state.store.exam.level || 'professional';
    return RT.data.concepts[level] || RT.data.concepts.professional;
  }

  function getMasteryBadge(status){
    const s = (status || 'developing').toLowerCase();
    switch(s){
      case 'mastered':
        return `<span class="mastery-pill mastery-mastered"><span class="mp-icon">★</span> Mastered</span>`;
      case 'strong':
        return `<span class="mastery-pill mastery-strong"><span class="mp-icon">✓</span> Strong</span>`;
      case 'developing':
        return `<span class="mastery-pill mastery-developing"><span class="mp-icon">↗</span> Developing</span>`;
      case 'learning':
      default:
        return `<span class="mastery-pill mastery-learning"><span class="mp-icon">●</span> Learning</span>`;
    }
  }

  function openConceptSheet(subjectKey){
    const track = getTrackData();
    const subject = track[subjectKey];
    if(!subject) return;

    const titleEl = RT.core.byId('masterySheetTitle');
    const scoreEl = RT.core.byId('masterySheetScore');
    const listEl = RT.core.byId('masterySheetList');

    if(titleEl) titleEl.textContent = subject.title;
    if(scoreEl) scoreEl.textContent = `${subject.overallAccuracy}%`;

    if(listEl){
      listEl.innerHTML = subject.concepts.map(c => `
        <div class="concept-card-item">
          <div class="cci-head">
            <span class="cci-name">${c.name}</span>
            ${getMasteryBadge(c.status)}
          </div>
          <div class="cci-note">${c.note}</div>
        </div>
      `).join('');
    }

    RT.ui.overlays.open('masteryOverlay');
  }

  function render(){
    const container = RT.core.byId('progressSubjectsGroup');
    if(!container) return;

    const track = getTrackData();

    container.innerHTML = Object.entries(track).map(([key, subject]) => `
      <button class="subject-item-row" data-open-concept="${key}">
        <strong>${subject.title}</strong>
        <div class="subject-row-right">
          <span class="pill">${subject.overallAccuracy}%</span>
          <span class="disclosure-arrow">›</span>
        </div>
      </button>
    `).join('');

    container.querySelectorAll('[data-open-concept]').forEach(btn => {
      btn.addEventListener('click', () => {
        openConceptSheet(btn.dataset.openConcept);
      });
    });
  }

  function init(){
    render();

    // Needs Attention button handler
    RT.core.byId('needsAttentionBtn')?.addEventListener('click', () => {
      RT.features.quiz.start('weak', true);
    });

    // Info button for Study Score disclaimer
    RT.core.byId('scoreInfoBtn')?.addEventListener('click', () => {
      RT.ui.overlays.open('scoreInfoOverlay');
    });
  }

  RT.features.mastery = {
    init,
    render,
    getMasteryBadge,
    getTrackData,
    openConceptSheet
  };
})(window.ReviewTayo);
