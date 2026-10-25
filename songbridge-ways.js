/* One collection, with several ways into a listening moment. */
(() => {
  'use strict';
  const home = document.getElementById('collectionView');
  const world = document.getElementById('worldView');
  const pages = window.SONGBRIDGE_WAYS;
  if (!home || !world || !pages) return;
  const labels = {'home':'Explore uses','on-the-way':'On the way','in-the-classroom':'With students','with-your-team':'With your team','in-community':'In community','deeper-inquiry':'Deeper inquiry'};
  const songSets = {};
  Object.entries(pages).forEach(([key,page]) => {
    const template = document.createElement('template');template.innerHTML = page.html;
    const grid = template.content.querySelector('[data-songs]');
    if (grid) songSets[key] = grid.dataset.songs.split(',').map(Number);
  });
  const drafts = new Map();
  let current = null;
  const routeFor = key => key === 'home' ? '#ways' : '#ways/' + key;
  const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  function rememberReflection() {
    const field = world.querySelector('#ways-reflection');
    if (field && current) drafts.set(current, field.value);
  }
  function scrollToTarget(selector, smooth = true) {
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({behavior:smooth ? motion() : 'instant',block:'start'});
  }
  function download(filename, content) {
    const url = URL.createObjectURL(new Blob([content], {type:'text/plain;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function extras(page, id) {
    if (page === 'in-the-classroom' && id === 3) return '<p class="ways-song-note">An upbeat, Caribbean/island-style welcome for movement and shared activity.</p><p class="ways-song-note"><strong>An invitation to try</strong><br>How would you like to contribute today—speaking, drawing, moving, writing, or listening first?</p>';
    if (page === 'with-your-team' && id === 13) return '<p class="ways-song-note"><strong>A reflection to try</strong><br>Where could we make more room for joy in our everyday work with learners?</p>';
    if (page === 'with-your-team' && id === 12) return '<p class="ways-song-note"><strong>A reflection to try</strong><br>What are we understanding differently now because of something we’ve tried, struggled with, or returned to?</p>';
    if (page === 'on-the-way' && id === 6) return '<p class="ways-song-note"><strong>Optional closing pause</strong> · A slower ending, if it fits your morning.</p>';
    return '';
  }
  function updatePicks() {
    world.querySelectorAll('[data-save]').forEach(button => {
      const id = Number(button.dataset.save), song = SONGS.find(s => s.id === id), selected = saved.includes(id);
      button.textContent = selected ? '♥' : '♡';
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', (selected ? 'Remove ' : 'Save ') + song.title + (selected ? ' from' : ' to') + ' my picks');
    });
    const status = world.querySelector('.selection');
    if (status) status.textContent = saved.length ? saved.length + ' saved in My picks · the same collection wherever you listen.' : 'Heart the songs you want to return to. Your picks stay with you throughout SongBridge.';
  }
  function setupPage(key) {
    world.querySelectorAll('[data-song-art]').forEach(image => {
      const song = SONGS.find(s => s.id === Number(image.dataset.songArt));
      if (song?.cover) image.src = song.cover;
    });
    world.querySelectorAll('[data-songs]').forEach(grid => {
      const ids = grid.dataset.songs.split(',').map(Number);
      songSets[key] = ids;
      grid.innerHTML = ids.map(id => SONGS.find(s => s.id === id)).filter(Boolean).map(s => songCardHTML(s, extras(key,s.id))).join('');
    });
    const exportButton = world.querySelector('[data-export]');
    if (exportButton) {
      exportButton.textContent = 'Download my picks';
      const button = document.createElement('button');button.type = 'button';button.className = 'outline';button.dataset.openPlaylists = '';button.textContent = 'Open playlists';
      exportButton.before(button);
      const tip = document.createElement('p');tip.className = 'ways-playlist-tip';tip.textContent = 'In Playlists, choose a saved list or start a new one, then use “Add My picks.”';
      exportButton.after(tip);
    }
    const field = world.querySelector('#ways-reflection');
    if (field) field.value = drafts.get(key) || '';
    world.querySelectorAll('.response .small').forEach(p => {
      if (/words stay/i.test(p.textContent)) p.textContent = 'Your words stay as you explore this tab. Download them to keep a copy. Nothing is submitted.';
    });
    updatePicks();
  }
  function route({focus = false, scroll = true} = {}) {
    const hash = location.hash;
    const match = /^#ways(?:\/([^?]+))?$/.exec(hash);
    const key = match ? (pages[match[1]] ? match[1] : 'home') : null;
    if (current === key && (key !== null || !home.hidden)) {
      if (scroll && !key && /^#(?:collection|about|start-here)$/.test(hash)) scrollToTarget(hash);
      else if (scroll) window.scrollTo({top:0,behavior:motion()});
      return;
    }
    rememberReflection();
    window.SongBridgePlayer?.preserve();
    if (dialog.open) dialog.close();
    current = key;
    if (key !== null) {
      home.hidden = true;world.hidden = false;world.dataset.waysPage = key;
      world.innerHTML = '<nav class="ways-nav" aria-label="Ways to use the songs">' + Object.entries(labels).map(([slug,label]) => '<a href="' + routeFor(slug) + '"' + (slug === key ? ' aria-current="page"' : '') + '>' + label + '</a>').join('') + '</nav>' + pages[key].html;
      setupPage(key);
      document.title = pages[key].title;
      document.querySelector('.skip').href = '#worldView';
      document.querySelector('.skip').textContent = 'Skip to content';
    } else {
      world.hidden = true;world.replaceChildren();home.hidden = false;
      document.title = 'SongBridge — Find a song for this moment';
      document.querySelector('.skip').href = '#collection';
      document.querySelector('.skip').textContent = 'Skip to songs';
      render();
    }
    document.body.classList.toggle('showing-ways', key !== null);
    document.querySelectorAll('.site-header nav > a').forEach(a => {
      const selected = key !== null ? a.getAttribute('href') === '#ways' : a.getAttribute('href') === '#collection';
      if (selected) a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    requestAnimationFrame(() => {
      window.SongBridgePlayer?.refresh();
      if (scroll) {
        if (key === null && /^#(?:collection|about|start-here)$/.test(hash)) scrollToTarget(hash,false);
        else window.scrollTo({top:0,behavior:'instant'});
      }
      if (focus) {const heading=(key === null ? home : world).querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
    });
  }
  function navigate(hash) {
    const fromDialog = dialog.open;
    if (fromDialog) {window.SongBridgePlayer?.preserve();dialog.close();}
    const url = new URL(location.href);
    const hadSong = url.searchParams.has('song');
    url.searchParams.delete('song');url.hash = hash;
    if (location.hash !== hash || hadSong) history.pushState(null,'',url.pathname + url.search + url.hash);
    route({focus:true});
    if (fromDialog) {window.SongBridgePlayer?.refresh();window.scrollTo({top:0,behavior:'instant'});}
  }
  window.SongBridgeShowCollection = () => navigate('#collection');
  window.SongBridgeNavigateToSong = id => {
    let card = !world.hidden && world.querySelector('[data-song-card-id="' + Number(id) + '"]');
    if (!card) {
      navigate('#collection');
      if (!home.querySelector('[data-song-card-id="' + Number(id) + '"]')) reset();
      card = home.querySelector('[data-song-card-id="' + Number(id) + '"]');
    }
    requestAnimationFrame(() => {window.SongBridgePlayer?.refresh();card?.scrollIntoView({behavior:motion(),block:'center'});card?.querySelector('.sb-play')?.focus({preventScroll:true});});
  };
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      const href = anchor.getAttribute('href');
      if (href === '#worldView') {event.preventDefault();world.focus({preventScroll:true});scrollToTarget('#worldView');return;}
      if (/^#ways(?:\/|$)|^#(?:home|collection|about|start-here)$/.test(href)) {event.preventDefault();navigate(href);return;}
      if (anchor.closest('#worldView') && /^#ways-/.test(href)) {event.preventDefault();scrollToTarget(href);return;}
    }
    if (event.target.closest('[data-open-playlists]')) {window.SongBridgeQueue?.open();return;}
    if (!event.target.closest('#worldView')) return;
    if (event.target.closest('[data-export]')) {
      const picks = SONGS.filter(s => saved.includes(s.id));
      if (!picks.length) {notify('Heart a song first to add it to My picks.');return;}
      download('SongBridge-my-picks.txt', 'SONGBRIDGE / MY PICKS\n\n' + picks.map(s => s.title + ' · ' + s.language + '\nhttps://songbridgelearning.com/?song=' + s.id).join('\n\n'));
    }
    if (event.target.closest('[data-reflection-save]')) {
      const value = world.querySelector('#ways-reflection')?.value.trim();
      const status = world.querySelector('.feedback');
      if (!value) {status.textContent = 'Write a reflection first, or print a blank card to write by hand.';return;}
      download('SongBridge-' + current + '-reflection.txt',world.querySelector('.response h2').textContent + '\n\n' + value + '\n\nSongBridge · ' + labels[current]);
      status.textContent = 'Your reflection has been downloaded. Nothing was sent or submitted.';
    }
    if (event.target.closest('[data-print]')) window.print();
  });
  document.addEventListener('songbridge:pickschange', updatePicks);
  document.addEventListener('songbridge:songopen', event => {
    const matches = Object.entries(songSets).filter(([,ids]) => ids.includes(event.detail.id));
    const host = document.querySelector('#detail .use');
    if (!host || !matches.length) return;
    const links = document.createElement('div');links.className='song-use-links';
    links.innerHTML = '<h3>Imagine it in practice</h3>' + matches.map(([key]) => '<a href="' + routeFor(key) + '">' + labels[key] + ' <span aria-hidden="true">↗</span></a>').join('');
    host.after(links);
  });
  window.addEventListener('popstate', () => route({focus:true}));
  window.addEventListener('hashchange', () => route({focus:true}));
  route({scroll:false});
  // Old shared song links continue to open the exact song.
  const linkedId = new URLSearchParams(location.search).get('song');
  if (linkedId !== null && SONGS.some(s => s.id === Number(linkedId))) openSong(Number(linkedId));
})();
