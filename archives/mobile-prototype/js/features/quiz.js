(function(RT){
  RT.features = RT.features || {};

  const qstate = () => RT.state.store.quiz;

  function buildSession(mode){
    const all = RT.data.questions;
    const isSub = RT.state.store.exam.level === 'subprofessional';

    // Filter relevant questions by track
    const filtered = all.filter(q => {
      if(isSub && q.subjectKey === 'analytical') return false;
      if(!isSub && q.subjectKey === 'clerical') return false;
      return true;
    });

    if(mode === 'qotd'){
      // Single daily habit question
      return [all.find(q => q.id === 'general-judicial') || all[0]];
    }

    if(mode === 'weak'){
      // Weak area questions: Sentence Completion & Vocabulary
      return filtered.filter(q => q.concept === 'Sentence Completion' || q.concept === 'Vocabulary').slice(0, 3);
    }

    if(mode === 'mistakes'){
      // Questions flagged for review
      return [
        all.find(q => q.id === 'verbal-unanimous') || all[0],
        all.find(q => q.id === 'numerical-notebooks') || all[1],
        all.find(q => q.id === 'analytical-clerks') || all[2]
      ];
    }

    if(mode === 'timed'){
      return filtered.slice(0, 4);
    }

    if(mode === 'custom'){
      return filtered.slice(0, Math.min(5, filtered.length));
    }

    if(mode === 'mock'){
      return filtered.slice(0, 5);
    }

    // Default 'smart' drill (adaptive 5-question representation)
    const q1 = all.find(q => q.id === 'verbal-unanimous') || all[0];
    const q2 = all.find(q => q.id === 'general-judicial') || all[3];
    const q3 = all.find(q => q.id === 'numerical-notebooks') || all[1];
    const q4 = isSub
      ? (all.find(q => q.id === 'clerical-filing-alpha') || all[2])
      : (all.find(q => q.id === 'analytical-clerks') || all[2]);
    const q5 = all.find(q => q.id === 'verbal-concise') || all[4];

    return [q1, q2, q3, q4, q5];
  }

  function render(){
    const s = qstate();
    const q = s.session[s.index];
    if(!q) return;

    s.selected = null;
    s.checked = false;

    // Header metadata
    const modeLabel = s.mode === 'timed' ? 'Timed Sprint · ' : s.mode === 'mock' ? 'Mock · ' : s.mode === 'qotd' ? 'Daily Question · ' : 'Smart Drill · ';
    RT.core.byId('qTag').textContent = modeLabel + q.tag;
    RT.core.byId('qText').textContent = q.q;
    RT.core.byId('qNum').textContent = s.index + 1;
    RT.core.byId('qTotal').textContent = s.session.length;

    // Progress bar
    RT.core.byId('qProgress').style.width = `${((s.index + 1) / s.session.length) * 100}%`;

    // Reset explanation & AI drawers
    const explain = RT.core.byId('explain');
    explain.classList.remove('show');
    explain.innerHTML = '';

    // Reset Next CTA
    const next = RT.core.byId('nextBtn');
    next.textContent = 'Check answer';
    next.classList.remove('enabled');

    // Reset Bookmark
    const bookmark = RT.core.byId('bookmarkBtn');
    bookmark.textContent = '☆';
    bookmark.classList.remove('saved');

    // Reset Coach Owl in Quiz Header (Minimal text per Section 37)
    const quizOwl = RT.core.byId('quizOwlContainer');
    if(quizOwl) RT.features.owl?.render(quizOwl, 'neutral');
    const quizCoachNote = RT.core.byId('quizCoachNote');
    if(quizCoachNote) quizCoachNote.textContent = 'Read carefully.';

    // Render Choices
    const choices = RT.core.byId('choices');
    choices.innerHTML = '';

    q.c.forEach((text, index) => {
      const button = document.createElement('button');
      button.className = 'choice';
      button.innerHTML = `<span class="letter">${String.fromCharCode(65 + index)}</span><span class="choice-text">${text}</span>`;
      button.addEventListener('click', () => {
        if(s.checked) return;
        s.selected = index;
        [...choices.children].forEach(x => x.classList.remove('selected'));
        button.classList.add('selected');
        next.classList.add('enabled');
      });
      choices.appendChild(button);
    });
  }

  function handleCheck(){
    const s = qstate();
    const q = s.session[s.index];
    if(s.selected === null) return;

    s.checked = true;
    const isCorrect = s.selected === q.a;
    const choices = RT.core.byId('choices');
    const explain = RT.core.byId('explain');
    const next = RT.core.byId('nextBtn');
    const quizOwl = RT.core.byId('quizOwlContainer');
    const quizCoachNote = RT.core.byId('quizCoachNote');

    // Style choices
    [...choices.children].forEach((button, index) => {
      button.classList.remove('selected');
      if(index === q.a) button.classList.add('correct');
      if(index === s.selected && !isCorrect) button.classList.add('wrong');
    });

    if(isCorrect){
      s.score++;
      s.streakInDrill++;
      if(s.streakInDrill >= 2){
        s.currentDifficulty = 'challenging';
      }

      if(quizOwl) RT.features.owl?.render(quizOwl, 'happy');
      if(quizCoachNote) quizCoachNote.textContent = 'Nice.';
    } else {
      s.streakInDrill = 0;
      s.currentDifficulty = 'standard';

      if(quizOwl) RT.features.owl?.render(quizOwl, 'thinking');
      if(quizCoachNote) quizCoachNote.textContent = 'Try one more.';
    }

    // Build concise explanation UI (Section 38, 39, 40)
    const masteryStatus = q.conceptStatus || 'developing';
    const masteryBadge = RT.features.mastery?.getMasteryBadge ? RT.features.mastery.getMasteryBadge(masteryStatus) : masteryStatus;

    explain.innerHTML = `
      <div class="explain-card ${isCorrect ? 'explain-correct' : 'explain-incorrect'}">
        <div class="explain-header">
          <div class="explain-status-title">
            <span class="est-icon">${isCorrect ? '✓' : '✕'}</span>
            <strong>${isCorrect ? 'Correct' : 'Not quite'}</strong>
          </div>
          <div class="explain-concept-badge">
            <span class="ecb-name">${q.concept}</span>
            ${masteryBadge}
          </div>
        </div>

        ${!isCorrect ? `<div class="explain-correct-answer">Correct answer: <strong>${q.c[q.a]}</strong></div>` : ''}

        <div class="explain-why">
          <p>${q.e}</p>
        </div>

        <!-- ACTION LINKS -->
        <div class="explain-actions">
          ${!isCorrect ? `
            <button class="explain-try-another-btn" id="tryAnotherBtn">
              Try another like this
            </button>
          ` : ''}
          <button class="explain-study-link" id="reviewConceptBtn">
            Review concept
          </button>
        </div>

        <!-- PROGRESSIVE DISCLOSURE AI SIMPLIFIER -->
        <div class="ai-simplifier-wrap">
          <button class="ai-simple-toggle-btn" id="aiExplainBtn">
            Still confused? Explain simply
          </button>
          <div class="ai-drawer" id="aiDrawer" style="display:none">
            <p class="ai-simple-text">${q.simplified || 'A direct rule applies: break the sentence down to find the contextual meaning.'}</p>
            <div class="ai-sub-actions">
              <button class="ai-sub-btn" id="aiStepBtn">Step-by-step</button>
              <button class="ai-sub-btn" id="aiExampleBtn">Give an example</button>
            </div>
            <div class="ai-extra-content" id="aiExtraContent" style="display:none"></div>
          </div>
        </div>
      </div>
    `;

    explain.classList.add('show');

    // Attach Contextual AI Simplifier listeners
    const aiBtn = RT.core.byId('aiExplainBtn');
    const aiDrawer = RT.core.byId('aiDrawer');
    const aiStepBtn = RT.core.byId('aiStepBtn');
    const aiExampleBtn = RT.core.byId('aiExampleBtn');
    const aiExtraContent = RT.core.byId('aiExtraContent');

    aiBtn?.addEventListener('click', () => {
      const isVisible = aiDrawer.style.display !== 'none';
      aiDrawer.style.display = isVisible ? 'none' : 'block';
      aiBtn.textContent = isVisible ? 'Still confused? Explain simply' : 'Hide simplified explanation';
    });

    aiStepBtn?.addEventListener('click', () => {
      aiExtraContent.style.display = 'block';
      aiExtraContent.innerHTML = `<strong>Step-by-step:</strong><p>${q.steps || 'Analyze keywords → Check each option → Pick the most accurate choice.'}</p>`;
    });

    aiExampleBtn?.addEventListener('click', () => {
      aiExtraContent.style.display = 'block';
      aiExtraContent.innerHTML = `<strong>Example:</strong><p>${q.example || 'Applied in official Civil Service examination items.'}</p>`;
    });

    // Attach "Try another like this" listener
    RT.core.byId('tryAnotherBtn')?.addEventListener('click', () => {
      tryAnotherLikeThis(q);
    });

    // Attach "Review concept" listener (Navigates to Learn)
    RT.core.byId('reviewConceptBtn')?.addEventListener('click', () => {
      RT.core.byId('quiz').classList.remove('show');
      RT.features.navigation.switchTab('learn');
      RT.ui.toast(`Opened ${q.concept} review`);
    });

    // Update Next Button
    next.textContent = s.index === s.session.length - 1 ? 'See results' : 'Next question';
    next.classList.add('enabled');
  }

  function tryAnotherLikeThis(currentQuestion){
    const all = RT.data.questions;
    const related = all.find(q => q.concept === currentQuestion.concept && q.id !== currentQuestion.id);

    if(!related){
      RT.ui.toast(`No other ${currentQuestion.concept} item in local set`);
      return;
    }

    const s = qstate();
    s.session[s.index] = related;
    RT.ui.toast(`Loaded related ${currentQuestion.concept} question`);
    render();
  }

  function start(mode = 'smart', forceNew = false){
    const s = qstate();
    if(s.active && !forceNew && mode === s.mode){
      RT.core.byId('quiz').classList.add('show');
      return;
    }

    s.active = true;
    s.mode = mode;
    s.index = 0;
    s.score = 0;
    s.streakInDrill = 0;
    s.session = buildSession(mode);

    RT.core.byId('quiz').classList.add('show');
    render();
  }

  function pause(){
    const screen = RT.core.byId('quiz');
    if(!screen?.classList.contains('show')) return;
    const s = qstate();
    screen.classList.remove('show');
    if(s.active && s.mode === 'smart'){
      RT.ui.toast('Smart Drill paused. You can resume anytime.');
    }
  }

  function showResults(){
    const s = qstate();
    RT.core.byId('quiz').classList.remove('show');
    s.active = false;

    const total = s.session.length;
    const missed = total - s.score;
    const isPerfect = missed === 0;

    const scoreEl = RT.core.byId('resultScore');
    const titleEl = RT.core.byId('resultTitle');
    const textEl = RT.core.byId('resultText');
    const insightEl = RT.core.byId('resultInsight');
    const primaryEl = RT.core.byId('resultPrimary');
    const secondaryEl = RT.core.byId('resultSecondary');

    if(scoreEl) scoreEl.textContent = `${s.score}/${total}`;

    if(s.mode === 'qotd'){
      RT.features.studyPlan?.markDone('dailyQuestion');

      if(titleEl) titleEl.textContent = s.score === 1 ? 'Daily Question complete!' : 'Daily Question reviewed.';
      if(textEl) textEl.textContent = 'Streak safe. Recommended: Smart Drill (~10 min).';
      if(insightEl) insightEl.innerHTML = '<strong>Next: Smart Drill</strong><small>10 adaptive questions focused on priority concepts.</small>';
      if(primaryEl){
        primaryEl.textContent = 'Start Smart Drill';
        primaryEl.onclick = () => {
          RT.ui.overlays.close('resultOverlay');
          start('smart', true);
        };
      }
      if(secondaryEl){
        secondaryEl.textContent = 'Back to Today';
        secondaryEl.onclick = () => {
          RT.ui.overlays.close('resultOverlay');
          RT.features.navigation.switchTab('today');
        };
      }
    } else if(s.mode === 'smart'){
      RT.features.studyPlan?.markDone('smartDrill');
      RT.features.weeklyGoal?.increment('smartDrills');

      if(titleEl) titleEl.textContent = isPerfect ? 'Perfect drill!' : 'Good session.';
      if(textEl) textEl.textContent = isPerfect
        ? 'All cleared. Next recommended: Review Due flashcards.'
        : `You missed ${missed} ${missed === 1 ? 'item' : 'items'}. Reviewing the concept gives you the quickest gain.`;

      if(insightEl){
        insightEl.innerHTML = missed > 0
          ? '<strong>Recommended: Sentence Completion</strong><small>Sentence Completion was your lowest accuracy point in this drill.</small>'
          : '<strong>All topics reinforced</strong><small>Retention on track across core areas.</small>';
      }

      if(primaryEl){
        primaryEl.textContent = missed > 0 ? 'Review Sentence Completion' : 'Review 12 Flashcards';
        primaryEl.onclick = () => {
          RT.ui.overlays.close('resultOverlay');
          if(missed > 0){
            RT.features.navigation.switchTab('learn');
            RT.ui.toast('Sentence Completion lesson opened');
          } else {
            RT.features.reviewDue?.startReview();
          }
        };
      }

      if(secondaryEl){
        secondaryEl.textContent = 'See progress';
        secondaryEl.onclick = () => {
          RT.ui.overlays.close('resultOverlay');
          RT.features.navigation.switchTab('progress');
        };
      }
    } else if(s.mode === 'mock'){
      RT.features.mockResults?.showMockResultModal(s.score * 34);
      return;
    } else {
      if(titleEl) titleEl.textContent = 'Session complete.';
      if(textEl) textEl.textContent = missed ? `You missed ${missed} ${missed === 1 ? 'item' : 'items'}.` : 'Great job! Clean sweep.';
      if(insightEl) insightEl.innerHTML = '<strong>Next step ready</strong><small>ReviewTayo recommends one action to stay focused.</small>';
      if(primaryEl){
        primaryEl.textContent = missed ? 'Review mistakes' : 'Back to Today';
        primaryEl.onclick = () => {
          RT.ui.overlays.close('resultOverlay');
          missed ? start('mistakes', true) : RT.features.navigation.switchTab('today');
        };
      }
      if(secondaryEl){
        secondaryEl.textContent = 'See progress';
        secondaryEl.onclick = () => {
          RT.ui.overlays.close('resultOverlay');
          RT.features.navigation.switchTab('progress');
        };
      }
    }

    RT.ui.overlays.open('resultOverlay');
  }

  function handleNext(){
    const s = qstate();
    if(s.selected === null) return;
    if(!s.checked){
      handleCheck();
      return;
    }
    if(s.index < s.session.length - 1){
      s.index++;
      render();
    } else {
      showResults();
    }
  }

  function init(){
    RT.core.$$('[data-quiz]').forEach(button => {
      button.addEventListener('click', () => start(button.dataset.quiz));
    });

    RT.core.byId('heroQuizBtn')?.addEventListener('click', () => {
      start('smart');
    });

    RT.core.byId('closeQuiz')?.addEventListener('click', pause);
    RT.core.byId('nextBtn')?.addEventListener('click', handleNext);

    RT.core.byId('bookmarkBtn')?.addEventListener('click', e => {
      const b = e.currentTarget;
      b.classList.toggle('saved');
      b.textContent = b.classList.contains('saved') ? '★' : '☆';
      RT.ui.toast(b.classList.contains('saved') ? 'Question saved' : 'Removed from saved');
    });
  }

  RT.features.quiz = {
    init,
    start,
    pause,
    render,
    tryAnotherLikeThis
  };
})(window.ReviewTayo);
