function gvbsActiveTab(){
  var el=document.querySelector('.tabbtn.active');
  return el&&el.dataset?el.dataset.tab:'chat';
}
function gvbsNativeTab(tab){
  var el=document.querySelector('[data-tab="'+tab+'"]');
  if(el) el.click();
}
function gvbsSyncNav(){
  var active=gvbsActiveTab();
  document.querySelectorAll('[data-hub-tab]').forEach(function(btn){
    btn.classList.toggle('active',btn.dataset.hubTab===active);
  });
}
function gvbsAddNav(){
  var main=document.querySelector('.chat');
  if(!main||document.querySelector('.bottom-nav')) return;
  var nav=document.createElement('nav');
  nav.className='bottom-nav';
  nav.innerHTML='<button class="nav-item" data-hub-tab="chat"><b>•</b><span>Чат</span></button><button class="nav-item" data-hub-tab="files"><b>•</b><span>Файлы</span></button><button class="nav-item" data-hub-tab="rules"><b>•</b><span>Регламент</span></button><button class="nav-item" data-hub-tab="notify"><b>•</b><span>Push</span></button><button class="nav-item" data-hub-tab="profile"><b>•</b><span>Профиль</span></button>';
  main.appendChild(nav);
  nav.addEventListener('click',function(e){
    var btn=e.target.closest('[data-hub-tab]');
    if(!btn) return;
    var tab=btn.dataset.hubTab;
    if(tab==='files'&&window.gvbsShowFiles){window.gvbsShowFiles();return;}
    if(tab==='profile'&&window.gvbsShowProfile){window.gvbsShowProfile();return;}
    gvbsNativeTab(tab);
  });
}
function gvbsNavTick(){gvbsAddNav();gvbsSyncNav();}
new MutationObserver(gvbsNavTick).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',gvbsNavTick);
setInterval(gvbsNavTick,1500);
