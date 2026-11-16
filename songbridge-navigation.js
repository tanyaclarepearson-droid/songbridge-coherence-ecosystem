(() => {
  const isStories = Boolean(document.getElementById('story-jump'));
  function updateNavigation() {
    const current = isStories ? 'stories' : location.hash.startsWith('#ways') ? 'ways' : 'songs';
    document.querySelectorAll('[data-sb-nav]').forEach(a => {
      if(a.dataset.sbNav === current) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    const counter = document.getElementById('storyPickCount');
    if(counter) {try {const saved=JSON.parse(localStorage.getItem('songbridge-picks')||'[]');counter.textContent=Array.isArray(saved)?saved.length:0;} catch {counter.textContent='0';}}
  }
  updateNavigation();
  window.addEventListener('hashchange',updateNavigation);
  window.addEventListener('popstate',updateNavigation);
  window.addEventListener('storage',updateNavigation);
  document.addEventListener('click',()=>queueMicrotask(updateNavigation));
  if(!isStories && new URLSearchParams(location.search).get('picks')==='1') {
    const url=new URL(location.href);url.searchParams.delete('picks');
    history.replaceState(null,'',url.href);
    document.getElementById('picksTop')?.click();
  }
})();