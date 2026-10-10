(function(RT){
  RT.features = RT.features || {};

  function init(){
    RT.core.byId('lessonBtn')?.addEventListener('click', () => {
      RT.ui.toast('Lesson: Sentence Completion opened (6 min)');
    });

    // Quick Sheets row trigger
    RT.core.byId('quickSheetsBtn')?.addEventListener('click', () => {
      RT.ui.toast('Quick Sheets: Math shortcuts, grammar rules & Constitution');
    });

    RT.core.byId('formulaBtn')?.addEventListener('click', () => {
      RT.ui.toast('Quick Sheets: Math shortcuts, grammar rules & Constitution');
    });

    // Subjects disclosure toggle
    RT.core.byId('subjectsDisclosureBtn')?.addEventListener('click', e => {
      const btn = e.currentTarget;
      const panel = RT.core.byId('subjectsDisclosurePanel');
      const open = panel?.classList.toggle('show');
      btn.setAttribute('aria-expanded', String(open));
    });

    // More learning resources disclosure toggle (optional)
    RT.core.byId('resourcesDisclosureBtn')?.addEventListener('click', e => {
      const btn = e.currentTarget;
      const panel = RT.core.byId('resourcesDisclosurePanel');
      const open = panel?.classList.toggle('show');
      btn.setAttribute('aria-expanded', String(open));
    });

    // Subject subrows
    RT.core.$$('[data-learn-subject]').forEach(row => {
      row.addEventListener('click', () => {
        const subj = row.dataset.learnSubject;
        RT.ui.toast(`Opened ${subj} lessons`);
      });
    });
  }

  RT.features.study = { init };
  RT.features.learn = RT.features.study;
})(window.ReviewTayo);
