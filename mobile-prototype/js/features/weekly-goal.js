(function(RT){
  RT.features = RT.features || {};

  function render(){
    const subLabel = RT.core.byId('progressWeekSubLabel');
    if(subLabel) subLabel.textContent = '74 questions · 4 study days';

    const panel = RT.core.byId('progressWeekPanel');
    if(!panel) return;

    const g = RT.state.store.weeklyGoal;
    const sdPct = Math.min(100, Math.round((g.smartDrills.current / g.smartDrills.target) * 100));
    const wrPct = Math.min(100, Math.round((g.weakReview.current / g.weakReview.target) * 100));
    const tpPct = Math.min(100, Math.round((g.timedPractice.current / g.timedPractice.target) * 100));

    panel.innerHTML = `
      <div class="panel-box">
        <div class="weekcard" style="margin-bottom:10px;padding:10px">
          <div class="chart" style="height:65px">
            <div class="barcol"><div class="bar" style="height:26px"></div><small>M</small></div>
            <div class="barcol"><div class="bar" style="height:46px"></div><small>T</small></div>
            <div class="barcol"><div class="bar" style="height:32px"></div><small>W</small></div>
            <div class="barcol"><div class="bar" style="height:54px"></div><small>T</small></div>
            <div class="barcol"><div class="bar" style="height:38px"></div><small>F</small></div>
            <div class="barcol"><div class="bar active" style="height:62px"></div><small>S</small></div>
            <div class="barcol"><div class="bar" style="height:12px"></div><small>S</small></div>
          </div>
        </div>

        <div class="wg-items" style="gap:8px">
          <div class="wg-item">
            <div class="wg-row">
              <span class="wg-label">Smart Drills</span>
              <span class="wg-counts">${g.smartDrills.current} / ${g.smartDrills.target}</span>
            </div>
            <div class="wg-bar"><span style="width: ${sdPct}%"></span></div>
          </div>

          <div class="wg-item">
            <div class="wg-row">
              <span class="wg-label">Weak Area Review</span>
              <span class="wg-counts">${g.weakReview.current} / ${g.weakReview.target}</span>
            </div>
            <div class="wg-bar"><span style="width: ${wrPct}%"></span></div>
          </div>

          <div class="wg-item">
            <div class="wg-row">
              <span class="wg-label">Timed Practice</span>
              <span class="wg-counts">${g.timedPractice.current} / ${g.timedPractice.target}</span>
            </div>
            <div class="wg-bar"><span style="width: ${tpPct}%"></span></div>
          </div>
        </div>
      </div>
    `;
  }

  function increment(targetKey){
    const g = RT.state.store.weeklyGoal;
    if(g[targetKey] && g[targetKey].current < g[targetKey].target){
      g[targetKey].current++;
      render();
    }
  }

  function init(){
    render();
  }

  RT.features.weeklyGoal = {
    init,
    render,
    increment
  };
})(window.ReviewTayo);
