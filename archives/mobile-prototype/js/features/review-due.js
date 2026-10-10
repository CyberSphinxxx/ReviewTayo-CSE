(function(RT){
  RT.features = RT.features || {};

  function startReview(){
    const data = RT.data.reviewDue;
    const session = RT.state.store.reviewDueSession;
    session.active = true;
    session.queue = [...data.items];
    session.index = 0;
    session.revealed = false;
    session.completedCount = 0;

    RT.ui.overlays.open('flashcardOverlay');
    renderFlashcard();
  }

  function renderFlashcard(){
    const session = RT.state.store.reviewDueSession;
    if(session.queue.length === 0 || session.index >= session.queue.length){
      finishReview();
      return;
    }

    const card = session.queue[session.index];
    session.revealed = false;

    const progEl = RT.core.byId('flashcardProgress');
    const countEl = RT.core.byId('flashcardCount');
    const tagEl = RT.core.byId('flashcardTag');
    const cardEl = RT.core.byId('flashcardCard');
    const promptEl = RT.core.byId('flashcardPrompt');
    const revealEl = RT.core.byId('flashcardReveal');
    const answerEl = RT.core.byId('flashcardAnswer');
    const actionsEl = RT.core.byId('flashcardActions');

    const total = session.queue.length;
    const currentNum = session.index + 1;

    if(progEl) progEl.style.width = `${(currentNum / total) * 100}%`;
    if(countEl) countEl.textContent = `${currentNum} / ${total}`;
    if(tagEl) tagEl.textContent = `${card.category} · ${card.kicker}`;
    if(promptEl) promptEl.textContent = card.front;
    if(answerEl) answerEl.textContent = card.back;

    if(cardEl) cardEl.classList.remove('flipped');
    if(revealEl) revealEl.style.display = 'block';
    if(actionsEl) actionsEl.style.display = 'none';
  }

  function revealCard(){
    const session = RT.state.store.reviewDueSession;
    session.revealed = true;
    const cardEl = RT.core.byId('flashcardCard');
    const revealEl = RT.core.byId('flashcardReveal');
    const actionsEl = RT.core.byId('flashcardActions');

    if(cardEl) cardEl.classList.add('flipped');
    if(revealEl) revealEl.style.display = 'none';
    if(actionsEl) actionsEl.style.display = 'grid';
  }

  function handleConfidence(action){
    const session = RT.state.store.reviewDueSession;
    const currentCard = session.queue[session.index];

    if(action === 'again'){
      // Re-queue card near the end of the session
      session.queue.push(currentCard);
      RT.ui.toast('Card queued for end of session');
      session.index++;
      renderFlashcard();
    } else {
      // 'got_it'
      session.completedCount++;
      session.index++;
      renderFlashcard();
    }
  }

  function finishReview(){
    const session = RT.state.store.reviewDueSession;
    session.active = false;
    RT.ui.overlays.close('flashcardOverlay');

    // Mark plan done
    RT.features.studyPlan?.markDone('reviewDue');
    RT.features.streak?.maintainStreak('flashcard review');

    // Update review and study badges
    const reviewBadge = RT.core.byId('reviewDueBadge');
    if(reviewBadge) reviewBadge.style.display = 'none';
    const studyBadge = RT.core.byId('studyDueBadge');
    if(studyBadge) studyBadge.style.display = 'none';

    RT.features.review?.render();
    renderBanners();

    // Show session result
    const title = RT.core.byId('resultTitle');
    const text = RT.core.byId('resultText');
    const score = RT.core.byId('resultScore');
    const insight = RT.core.byId('resultInsight');
    const primary = RT.core.byId('resultPrimary');
    const secondary = RT.core.byId('resultSecondary');

    if(score) score.textContent = '12';
    if(title) title.textContent = 'Review complete!';
    if(text) text.textContent = '12 concepts reviewed and reinforced. Nothing else is due for spaced review right now.';
    if(insight) insight.innerHTML = '<strong>Spaced repetition updated</strong><small>High-retention concepts moved to 3-day intervals; low-confidence cards will appear again tomorrow.</small>';
    if(primary){
      primary.textContent = 'Back to Home';
      primary.onclick = () => {
        RT.ui.overlays.close('resultOverlay');
        RT.features.navigation.switchTab('home');
      };
    }
    if(secondary){
      secondary.textContent = 'See progress';
      secondary.onclick = () => {
        RT.ui.overlays.close('resultOverlay');
        RT.features.navigation.switchTab('progress');
      };
    }

    RT.ui.overlays.open('resultOverlay');
  }

  function renderBanners(){
    const isDone = RT.state.store.dailyPlan.reviewDue;
    const data = RT.data.reviewDue;

    // Render on Today screen
    const todayCard = RT.core.byId('todayReviewDueCard');
    if(todayCard){
      if(isDone){
        todayCard.innerHTML = `
          <div class="review-due-done">
            <div class="rdd-icon">✓</div>
            <div class="rdd-copy">
              <strong>Review queue caught up</strong>
              <small>All 12 scheduled items reviewed. Next batch due tomorrow.</small>
            </div>
          </div>
        `;
      } else {
        todayCard.innerHTML = `
          <div class="review-due-card">
            <div class="rdc-head">
              <div class="rdc-badge">REVIEW DUE</div>
              <span class="rdc-time">~${data.estimatedMinutes} min</span>
            </div>
            <strong>${data.total} concepts are ready for review.</strong>
            <p class="rdc-groups">
              ${data.groups.map(g => `<span class="rdc-group-pill">${g.count} ${g.name}</span>`).join('')}
            </p>
            <button class="rdc-btn" id="todayStartReviewBtn">Review now <span>→</span></button>
          </div>
        `;
        RT.core.byId('todayStartReviewBtn')?.addEventListener('click', startReview);
      }
    }

    // Render on Study screen
    const studySection = RT.core.byId('studyReviewDueSection');
    if(studySection){
      if(isDone){
        studySection.innerHTML = `
          <div class="review-due-done">
            <div class="rdd-icon">✓</div>
            <div class="rdd-copy">
              <strong>All caught up!</strong>
              <small>Nothing is due for spaced review right now. Nice work!</small>
            </div>
          </div>
        `;
      } else {
        studySection.innerHTML = `
          <div class="review-due-card">
            <div class="rdc-head">
              <div class="rdc-badge">SPACED REVIEW</div>
              <span class="rdc-time">${data.estimatedMinutes} min</span>
            </div>
            <strong>${data.total} concepts ready for recall.</strong>
            <p class="rdc-groups">
              ${data.groups.map(g => `<span class="rdc-group-pill">${g.count} ${g.name}</span>`).join('')}
            </p>
            <button class="rdc-btn" id="studyStartReviewBtn">Review now <span>→</span></button>
          </div>
        `;
        RT.core.byId('studyStartReviewBtn')?.addEventListener('click', startReview);
      }
    }
  }

  function init(){
    renderBanners();

    RT.core.byId('flashcardCard')?.addEventListener('click', () => {
      const session = RT.state.store.reviewDueSession;
      if(!session.revealed) revealCard();
    });

    RT.core.byId('flashcardRevealBtn')?.addEventListener('click', revealCard);

    RT.core.byId('flashcardAgainBtn')?.addEventListener('click', () => handleConfidence('again'));
    RT.core.byId('flashcardGotItBtn')?.addEventListener('click', () => handleConfidence('got_it'));

    RT.core.byId('closeFlashcard')?.addEventListener('click', () => {
      RT.ui.overlays.close('flashcardOverlay');
      RT.ui.toast('Review paused. You can resume anytime.');
    });
  }

  RT.features.reviewDue = {
    init,
    startReview,
    renderBanners
  };
})(window.ReviewTayo);
