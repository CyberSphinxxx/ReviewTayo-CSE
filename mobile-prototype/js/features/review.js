(function(RT){
  RT.features = RT.features || {};

  function render(){
    const isDone = RT.state.store.dailyPlan.reviewDue;
    const normalBox = RT.core.byId('reviewHeroNormal');
    const emptyBox = RT.core.byId('reviewHeroEmpty');
    const badge = RT.core.byId('reviewDueBadge');

    if(normalBox && emptyBox){
      if(isDone){
        normalBox.style.display = 'none';
        emptyBox.style.display = 'block';
      } else {
        normalBox.style.display = 'block';
        emptyBox.style.display = 'none';
      }
    }

    if(badge){
      if(isDone){
        badge.style.display = 'none';
      } else {
        badge.style.display = '';
        badge.textContent = String(RT.data.reviewDue?.total || 12);
      }
    }
  }

  function init(){
    render();

    // Start Review Due session
    RT.core.byId('startReviewNowBtn')?.addEventListener('click', () => {
      RT.features.reviewDue?.startReview();
    });

    // Mistakes row (starts missed questions quiz)
    RT.core.byId('reviewMistakesRow')?.addEventListener('click', () => {
      RT.features.quiz?.start('mistakes', true);
    });

    // Saved questions row
    RT.core.byId('reviewSavedRow')?.addEventListener('click', () => {
      RT.ui.toast('Saved questions: 8 items bookmarked');
    });

    // Empty state browse saved button
    RT.core.byId('reviewBrowseSavedBtn')?.addEventListener('click', () => {
      RT.ui.toast('Saved questions: 8 items bookmarked');
    });

    // Concepts to revisit row
    RT.core.byId('reviewConceptsRow')?.addEventListener('click', () => {
      RT.ui.toast('Concepts to revisit: Sentence Completion, Percentages, Article III');
    });

    // Review history secondary disclosure
    RT.core.byId('reviewHistoryRow')?.addEventListener('click', () => {
      RT.ui.toast('Review history: 48 items completed with 82% retention');
    });
  }

  RT.features.review = { init, render };
})(window.ReviewTayo);
