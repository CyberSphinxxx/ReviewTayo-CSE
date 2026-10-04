(function(RT){
  RT.features = RT.features || {};

  function getMockData(){
    const level = RT.state.store.exam.level || 'professional';
    return RT.data.mockResults[level] || RT.data.mockResults.professional;
  }

  function renderProgressMockCard(){
    const subLabel = RT.core.byId('progressMockSubLabel');
    const data = getMockData();
    if(subLabel) subLabel.textContent = `${data.percentage}% · Last attempt`;

    const panel = RT.core.byId('progressMockPanel');
    if(!panel) return;

    panel.innerHTML = `
      <div class="panel-box">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <strong>Score: ${data.score} / ${data.total} (${data.percentage}%)</strong>
          <small style="color:var(--muted)">${data.dateTaken}</small>
        </div>

        <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">
          ${data.breakdown.map(b => `
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px">
              <span>${b.subject}</span>
              <strong>${b.score} (${b.percentage}%)</strong>
            </div>
          `).join('')}
        </div>

        <button class="learn-btn" id="view7DayPlanBtn" style="padding:8px 12px;font-size:11px;margin-bottom:6px">
          View 7-day study plan →
        </button>
        <button class="secondarybtn" id="retakeMockBtn" style="padding:6px;font-size:10.5px">
          Retake sample mock
        </button>
      </div>
    `;

    RT.core.byId('view7DayPlanBtn')?.addEventListener('click', () => {
      showMockResultModal();
    });

    RT.core.byId('retakeMockBtn')?.addEventListener('click', () => {
      RT.ui.overlays.open('mockOverlay');
    });
  }

  function showMockResultModal(customScore = null){
    const data = getMockData();
    const scoreVal = customScore !== null ? customScore : data.score;
    const pct = Math.round((scoreVal / data.total) * 100);

    const titleEl = RT.core.byId('mockResultTitle');
    const scoreEl = RT.core.byId('mockResultScore');
    const breakdownEl = RT.core.byId('mockResultBreakdown');
    const planEl = RT.core.byId('mockResult7DayPlan');

    if(titleEl) titleEl.textContent = 'Mock Exam Complete';
    if(scoreEl) scoreEl.textContent = `${scoreVal} / ${data.total} (${pct}%)`;

    if(breakdownEl){
      breakdownEl.innerHTML = data.breakdown.map(b => `
        <div class="mrc-subject-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;font-size:11px">
          <span class="mrc-sub-name">${b.subject}</span>
          <span class="mrc-sub-score">${b.percentage}%</span>
          <span class="mrc-status-pill" style="color: ${b.color};font-weight:800">${b.status}</span>
        </div>
      `).join('');
    }

    if(planEl){
      planEl.innerHTML = data.next7Days.map((item, idx) => `
        <div class="day-plan-item ${idx === 0 ? 'today-focus' : ''}" style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:10px;background:#FAF6F5;margin-bottom:4px">
          <div class="dpi-day" style="font-weight:900;font-size:10px;color:var(--maroon);width:30px">${item.day}</div>
          <div class="dpi-copy" style="flex:1">
            <strong style="font-size:11.5px;display:block">${item.topic}</strong>
            <small style="font-size:9px;color:var(--muted)">${item.type} · ${item.duration}</small>
          </div>
          ${idx === 0 ? '<span class="dpi-badge" style="font-size:8.5px;background:var(--maroon);color:#fff;padding:2px 6px;border-radius:99px">Next</span>' : ''}
        </div>
      `).join('');
    }

    RT.ui.overlays.open('mockResultOverlay');
  }

  function init(){
    renderProgressMockCard();

    RT.core.byId('mockResultPrimaryBtn')?.addEventListener('click', () => {
      RT.ui.overlays.close('mockResultOverlay');
      RT.features.navigation.switchTab('today');
      RT.ui.toast('Returned to Today plan');
    });

    RT.core.byId('mockResultSecondaryBtn')?.addEventListener('click', () => {
      RT.ui.overlays.close('mockResultOverlay');
      RT.features.navigation.switchTab('progress');
    });
  }

  RT.features.mockResults = {
    init,
    renderProgressMockCard,
    showMockResultModal
  };
})(window.ReviewTayo);
