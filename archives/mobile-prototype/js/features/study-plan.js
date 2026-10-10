(function(RT){
  RT.features = RT.features || {};

  const stepRowIds = {
    dailyQuestion: 'planDaily',
    smartDrill: 'planSmart',
    reviewDue: 'planReview'
  };

  const stepCheckIds = {
    dailyQuestion: 'planDailyCheck',
    smartDrill: 'planSmartCheck',
    reviewDue: 'planReviewCheck'
  };

  function isDoneToday(){
    const plan = RT.state.store.dailyPlan;
    return !!(plan.dailyQuestion && plan.smartDrill && plan.reviewDue);
  }

  function markDone(stepKey){
    const plan = RT.state.store.dailyPlan;
    if(plan[stepKey]) return; // already done
    plan[stepKey] = true;

    // Check item in UI
    const rowEl = RT.core.byId(stepRowIds[stepKey]);
    if(rowEl) rowEl.classList.add('done');

    const checkEl = RT.core.byId(stepCheckIds[stepKey]);
    if(checkEl){
      checkEl.textContent = '✓';
    }

    // Maintain streak on any study completion
    RT.features.streak?.maintainStreak(stepKey);

    render();
  }

  function updateGreeting(){
    const eyebrow = RT.core.byId('homeEyebrow');
    if(!eyebrow) return;
    const hour = new Date().getHours();
    if(hour >= 5 && hour < 12){
      eyebrow.textContent = '☀ GOOD MORNING';
    } else if(hour >= 12 && hour < 18){
      eyebrow.textContent = '☀ GOOD AFTERNOON';
    } else {
      eyebrow.textContent = '🌙 GOOD EVENING';
    }
  }

  function updateDateBadge(){
    const badge = RT.core.byId('todayDateBadge');
    if(!badge) return;
    const d = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    badge.textContent = `${months[d.getMonth()]} ${d.getDate()}`;
  }

  function render(){
    const plan = RT.state.store.dailyPlan;
    const doneCount = Object.values(plan).filter(Boolean).length;
    const allDone = doneCount === 3;

    updateGreeting();
    updateDateBadge();

    // Update Streak and Today UI
    RT.features.streak?.render();

    // Today Hero Transformation
    const heroCard = RT.core.byId('todayHero');
    const heroContentNormal = RT.core.byId('todayHeroNormal');
    const heroContentDone = RT.core.byId('todayHeroDone');
    const heroOwl = RT.core.byId('heroOwlContainer');

    if(allDone){
      if(heroContentNormal) heroContentNormal.style.display = 'none';
      if(heroContentDone) heroContentDone.style.display = 'block';
      if(heroCard) heroCard.classList.add('hero-completed');
      if(heroOwl) RT.features.owl?.render(heroOwl, 'celebrating');
    } else {
      if(heroContentNormal) heroContentNormal.style.display = 'block';
      if(heroContentDone) heroContentDone.style.display = 'none';
      if(heroCard) heroCard.classList.remove('hero-completed');

      // Owl state based on partial completion
      const owlState = doneCount > 0 ? 'happy' : 'neutral';
      if(heroOwl) RT.features.owl?.render(heroOwl, owlState);
    }
  }

  function init(){
    render();

    // Extra practice button on done state
    RT.core.byId('heroExtraPracticeBtn')?.addEventListener('click', () => {
      RT.features.navigation.switchTab('practice');
      RT.ui.toast('Practice modes opened');
    });

    // Plan row click handlers
    RT.core.byId('planDaily')?.addEventListener('click', () => {
      RT.features.quiz.start('qotd');
    });

    RT.core.byId('planSmart')?.addEventListener('click', () => {
      RT.features.quiz.start('smart');
    });

    RT.core.byId('planReview')?.addEventListener('click', () => {
      RT.features.reviewDue.startReview();
    });
  }

  RT.features.studyPlan = {
    init,
    markDone,
    isDoneToday,
    render
  };
})(window.ReviewTayo);
