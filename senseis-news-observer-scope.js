(()=>{'use strict';
if(window.__senseisNewsObserverScope)return;
window.__senseisNewsObserverScope=true;
const nativeObserve=MutationObserver.prototype.observe;
MutationObserver.prototype.observe=function(target,options){
  const stockView=document.getElementById('view-stocks');
  if(target===document.body&&stockView&&options?.subtree&&options?.childList){
    target=stockView;
  }
  return nativeObserve.call(this,target,options);
};
})();
