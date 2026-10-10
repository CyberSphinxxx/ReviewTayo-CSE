(function(RT){
  let lastFocused=null;
  function open(id,trigger){
    const overlay=RT.core.byId(id); if(!overlay)return;
    lastFocused=trigger||document.activeElement;
    overlay.classList.add('show');
    const focusable=overlay.querySelector('button,input,[tabindex]:not([tabindex="-1"])');
    setTimeout(()=>focusable?.focus?.(),0);
  }
  function close(id){
    const overlay=RT.core.byId(id); if(!overlay)return;
    overlay.classList.remove('show');
    lastFocused?.focus?.();
  }
  function init(){
    RT.core.$$('.overlay').forEach(overlay=>overlay.addEventListener('click',e=>{if(e.target===overlay)close(overlay.id)}));
    RT.core.$$('[data-close-overlay]').forEach(button=>button.addEventListener('click',()=>close(button.dataset.closeOverlay)));
    document.addEventListener('keydown',e=>{
      if(e.key!=='Escape')return;
      const visible=[...document.querySelectorAll('.overlay.show')].pop();
      if(visible){close(visible.id);return;}
      RT.features.quiz?.pause?.();
    });
  }
  RT.ui.overlays={open,close,init};
})(window.ReviewTayo);
