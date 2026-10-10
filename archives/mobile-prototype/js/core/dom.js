(function(RT){
  RT.core = RT.core || {};
  RT.core.$ = (selector, scope = document) => scope.querySelector(selector);
  RT.core.$$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  RT.core.byId = (id) => {
    if(id === 'todayScreen') return document.getElementById('homeScreen') || document.getElementById('todayScreen');
    return document.getElementById(id);
  };
})(window.ReviewTayo);
