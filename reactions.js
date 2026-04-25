const GVBS_REACTIONS=['👍','👎','❤️','🙏','🔥'];
function reactionKey(text){return 'gvbs-react-'+btoa(unescape(encodeURIComponent(text))).slice(0,60)}
function decorateReactions(){
  document.querySelectorAll('.bubble').forEach(function(bubble){
    if(bubble.dataset.reactions)return;
    bubble.dataset.reactions='1';
    var text=bubble.innerText||'';
    var key=reactionKey(text);
    var saved=localStorage.getItem(key)||'';
    var bar=document.createElement('div');
    bar.className='reaction-bar';
    GVBS_REACTIONS.forEach(function(r){
      var btn=document.createElement('button');
      btn.className='reaction-btn'+(saved===r?' active':'');
      btn.type='button';
      btn.textContent=r;
      btn.onclick=function(){
        var next=localStorage.getItem(key)===r?'':r;
        localStorage.setItem(key,next);
        decorateRefresh();
      };
      bar.appendChild(btn);
    });
    bubble.appendChild(bar);
  });
}
function decorateRefresh(){document.querySelectorAll('.reaction-bar').forEach(function(x){x.remove()});document.querySelectorAll('.bubble').forEach(function(x){delete x.dataset.reactions});decorateReactions()}
new MutationObserver(decorateReactions).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',decorateReactions);
setInterval(decorateReactions,1500);
