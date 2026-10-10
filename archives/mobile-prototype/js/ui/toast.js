(function(RT){
  let timer;
  RT.ui.toast=function(message){
    const el=RT.core.byId('toast');
    if(!el)return;
    el.textContent=message;
    el.classList.add('show');
    clearTimeout(timer);
    timer=setTimeout(()=>el.classList.remove('show'),1500);
  };
})(window.ReviewTayo);
