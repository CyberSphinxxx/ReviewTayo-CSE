(function(RT){
  RT.features = RT.features || {};

  function maintainStreak(triggerName = 'study activity'){
    const s = RT.state.store.streak;
    if(!s.maintainedToday){
      s.maintainedToday = true;
      s.current += 1;
      if(s.current > s.best) s.best = s.current;
      RT.ui.toast(`🔥 Streak preserved! ${s.current} days in a row`);
    }
    render();
  }

  function render(){
    const s = RT.state.store.streak;
    const streakEl = RT.core.byId('streakLineText');
    if(streakEl){
      streakEl.textContent = `🔥 ${s.current} day streak`;
    }

    const streakNote = RT.core.byId('streakLineSub');
    if(streakNote){
      streakNote.textContent = s.maintainedToday ? 'Keep it up.' : 'Daily question keeps it alive';
    }

    // Update visual bars consistency indication
    const visualBars = RT.core.byId('streakVisualBars');
    if(visualBars){
      const bars = visualBars.querySelectorAll('.streak-bar');
      if(bars.length >= 2){
        bars[bars.length - 1].classList.toggle('active', !!s.maintainedToday);
      }
    }
  }

  function init(){
    render();
  }

  RT.features.streak = {
    init,
    maintainStreak,
    render
  };
})(window.ReviewTayo);
