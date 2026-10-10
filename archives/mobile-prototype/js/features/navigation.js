(function(RT){
  const screenMap = {
    learn: 'learnScreen',
    study: 'learnScreen',
    practice: 'practiceScreen',
    home: 'homeScreen',
    today: 'homeScreen',
    review: 'reviewScreen',
    progress: 'progressScreen'
  };
  const allScreenIds = ['learnScreen', 'practiceScreen', 'homeScreen', 'reviewScreen', 'progressScreen'];

  function switchTab(name){
    let target = name;
    if(target === 'study') target = 'learn';
    if(target === 'today') target = 'home';
    RT.state.store.activeTab = target;
    const activeId = screenMap[target] || 'homeScreen';

    allScreenIds.forEach(id => {
      const el = RT.core.byId(id);
      if(el) el.classList.toggle('active', id === activeId);
    });

    RT.core.$$('.navbtn').forEach(button => {
      const bTab = button.dataset.tab;
      const active = bTab === target || (bTab === 'home' && name === 'today') || (bTab === 'learn' && name === 'study');
      button.classList.toggle('active', active);
      if(active){
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });

    const scroll = RT.core.byId('scroll');
    if(scroll) scroll.scrollTop = 0;
  }

  function init(){
    RT.core.$$('.navbtn').forEach(button => {
      button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
  }

  RT.features.navigation = { switchTab, init };
})(window.ReviewTayo);
