/* A listening queue survives collection filtering and keeps one audio element. */
(() => {
  'use strict';
  if (window.SongBridgeQueue || typeof SONGS === 'undefined') return;
  const key = 'songbridge-listening-queue';
  const songs = new Map(SONGS.map(song => [String(song.id), song]));
  const available = id => songs.has(String(id)) && !!(window.SONGBRIDGE_AUDIO || {})[id];
  let ids = [], index = -1, repeat = 'off', generation = 0, error = '', started = false;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && Array.isArray(saved.ids)) {
      ids = [...new Set(saved.ids.map(String))].filter(available);
      index = ids.length ? Math.max(0, Math.min(ids.length - 1, Math.trunc(Number(saved.index)) || 0)) : -1;
      if (['off', 'all', 'one'].includes(saved.repeat)) repeat = saved.repeat;
    }
  } catch (_) {}

  const host = document.createElement('div');
  host.style.display = 'none';
  const audio = document.createElement('audio');
  audio.id = 'sb-queue-audio';
  audio.preload = 'none';
  host.append(audio);
  document.body.append(host);

  const opener = document.createElement('button');
  opener.type = 'button';
  opener.className = 'sb-queue-opener';
  opener.setAttribute('aria-haspopup', 'dialog');
  opener.setAttribute('aria-controls', 'sb-queue-dialog');
  const notice = document.createElement('span');
  notice.className = 'sb-queue-notice';
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  const toolbar = document.createElement('span');
  toolbar.className = 'sb-queue-toolbar';
  toolbar.append(opener, notice);
  const count = document.getElementById('resultCount');
  if (count) count.after(toolbar);
  else document.getElementById('songGrid')?.before(toolbar);

  const dialog = document.createElement('dialog');
  dialog.id = 'sb-queue-dialog';
  dialog.setAttribute('aria-labelledby', 'sb-queue-heading');
  dialog.innerHTML = '<div class="sb-queue-head"><div><p class="eyebrow">KEEP THE MUSIC GOING</p><h2 id="sb-queue-heading">Listening queue</h2></div><button type="button" class="sb-queue-close" aria-label="Close listening queue">×</button></div><p class="sb-queue-intro">Play songs in order. Keep listening while you browse.</p><div class="sb-queue-sources"><button type="button" data-source="view"></button><button type="button" data-source="picks"></button></div><p class="sb-queue-hint">Choose a set to replace your queue. Filters and hearts won’t change it.</p><div class="sb-queue-list-wrap"><p class="sb-queue-empty">Start with the songs in your current view, or your saved picks.</p><ol class="sb-queue-list" aria-label="Songs in listening order"></ol></div><div class="sb-queue-footer"><button type="button" class="sb-queue-play">Play queue</button><label class="sb-queue-repeat">Repeat <select aria-label="Repeat queue"><option value="off">Off</option><option value="all">All</option><option value="one">One</option></select></label><button type="button" class="sb-queue-clear">Clear</button></div><p class="sb-queue-status" role="status" aria-live="polite"></p>';
  document.body.append(dialog);
  const list = dialog.querySelector('.sb-queue-list');
  const status = dialog.querySelector('.sb-queue-status');
  const playButton = dialog.querySelector('.sb-queue-play');
  const repeatSelect = dialog.querySelector('select');
  const viewButton = dialog.querySelector('[data-source="view"]');
  const picksButton = dialog.querySelector('[data-source="picks"]');
  let returnFocus = opener;

  function currentView() {
    return [...document.querySelectorAll('#songGrid .song-card .cover[data-open]')]
      .map(button => button.dataset.open).filter(available);
  }
  function currentPicks() {
    try {
      const saved = JSON.parse(localStorage.getItem('songbridge-picks') || '[]');
      const picked = new Set(Array.isArray(saved) ? saved.map(String) : []);
      return SONGS.filter(song => picked.has(String(song.id)) && available(song.id)).map(song => String(song.id));
    } catch (_) { return []; }
  }
  function updateSources() {
    const view = currentView().length, picks = currentPicks().length;
    viewButton.textContent = 'Use current view (' + view + ')';
    picksButton.textContent = 'Use My picks (' + picks + ')';
    viewButton.disabled = !view;
    picksButton.disabled = !picks;
  }
  function state() {
    return {
      count: ids.length, index, repeat,
      hasPrevious: ids.length > 0 && (index > 0 || repeat === 'all'),
      hasNext: ids.length > 0 && (index < ids.length - 1 || repeat === 'all')
    };
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify({ ids, index, repeat })); } catch (_) {}
  }
  function announce(message) { status.textContent = message; }
  function update() {
    const playing = !audio.paused && !audio.ended;
    opener.textContent = 'Listening queue' + (ids.length ? ' · ' + ids.length : '');
    opener.setAttribute('aria-label', 'Open listening queue' + (ids.length ? ', ' + ids.length + ' songs' : ''));
    opener.classList.toggle('is-playing', playing);
    playButton.disabled = !ids.length;
    playButton.textContent = playing ? 'Pause' : audio.ended ? 'Play again' : started ? 'Resume' : 'Play queue';
    dialog.querySelector('.sb-queue-clear').disabled = !ids.length;
    dialog.querySelector('.sb-queue-empty').hidden = !!ids.length;
    repeatSelect.value = repeat;
    audio.loop = repeat === 'one';
    [...list.children].forEach((row, position) => {
      const current = position === index;
      row.classList.toggle('is-current', current);
      const track = row.querySelector('.sb-queue-track');
      if (current) track.setAttribute('aria-current', 'true');
      else track.removeAttribute('aria-current');
      row.querySelector('.sb-queue-track-state').textContent = current ? (playing ? 'Playing' : audio.ended ? 'Finished' : started ? 'Paused' : 'Ready') : '';
    });
    notice.hidden = !error;
    notice.textContent = error ? 'Audio couldn’t play. Open the queue to try again.' : '';
    if (error) announce(error);
    save();
    document.dispatchEvent(new CustomEvent('songbridge:queuechange', { detail: state() }));
  }
  function renderRows(focusPosition, focusAction) {
    list.replaceChildren();
    ids.forEach((id, position) => {
      const song = songs.get(id), row = document.createElement('li');
      row.className = 'sb-queue-row';
      const track = document.createElement('button');
      track.type = 'button'; track.className = 'sb-queue-track';
      track.setAttribute('aria-label', 'Play ' + song.title + ' · ' + song.language);
      if (song.cover) {
        const image = document.createElement('img'); image.src = song.cover; image.alt = ''; image.loading = 'lazy'; track.append(image);
      }
      const copy = document.createElement('span'); copy.className = 'sb-queue-track-copy';
      const title = document.createElement('strong'); title.textContent = song.title;
      const language = document.createElement('span'); language.className = 'sb-queue-language'; language.textContent = song.language;
      const indicator = document.createElement('span'); indicator.className = 'sb-queue-track-state';
      copy.append(title, language, indicator); track.append(copy);
      track.onclick = () => select(position, true);
      row.append(track);
      const actions = document.createElement('span'); actions.className = 'sb-queue-row-actions';
      [['up', '↑', 'Move up'], ['down', '↓', 'Move down'], ['remove', '×', 'Remove']].forEach(([action, symbol, label]) => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = symbol; button.dataset.action = action;
        button.setAttribute('aria-label', label + ' ' + song.title + ' · ' + song.language);
        button.title = label;
        button.disabled = action === 'up' && position === 0 || action === 'down' && position === ids.length - 1;
        button.onclick = () => action === 'remove' ? remove(position) : move(position, action === 'up' ? -1 : 1);
        actions.append(button);
      });
      row.append(actions); list.append(row);
    });
    update();
    if (Number.isInteger(focusPosition)) {
      const row = list.children[Math.min(focusPosition, ids.length - 1)];
      const action = row?.querySelector('[data-action="' + focusAction + '"]');
      (action && !action.disabled ? action : row?.querySelector('.sb-queue-track') || viewButton).focus();
    }
  }
  function prepare() {
    generation++;
    error = '';
    if (index < 0 || !ids.length) {
      audio.pause(); audio.removeAttribute('src'); audio.load();
      delete audio.dataset.sbTitle; delete audio.dataset.sbCover;
      return;
    }
    const song = songs.get(ids[index]);
    audio.dataset.sbTitle = song.title + ' · ' + song.language;
    audio.dataset.sbCover = song.cover || '';
    audio.src = window.SONGBRIDGE_AUDIO[ids[index]];
    audio.loop = repeat === 'one';
    audio.load();
  }
  async function play() {
    if (!ids.length) return;
    if (audio.ended && index === ids.length - 1) { index = 0; prepare(); }
    else if (audio.error) prepare();
    error = ''; announce('');
    // Also covers playback before the shared player has observed this element.
    document.querySelectorAll('audio').forEach(other => { if (other !== audio) other.pause(); });
    const attempt = generation;
    try { await audio.play(); }
    catch (failure) {
      if (attempt !== generation || failure.name === 'AbortError') return;
      error = 'Couldn’t play this recording. Try Play again, or choose another song.';
    }
    update();
  }
  function select(position, autoplay) {
    if (position < 0 || position >= ids.length) return;
    audio.pause(); index = position; started = false; prepare(); update();
    if (autoplay) play();
  }
  function replace(nextIds) {
    audio.pause(); ids = [...new Set(nextIds)].filter(available); index = ids.length ? 0 : -1; started = false;
    prepare(); renderRows(); announce(ids.length + ' songs ready. Select Play queue to start.');
  }
  function move(position, direction) {
    const target = position + direction;
    if (target < 0 || target >= ids.length) return;
    const current = ids[index];
    [ids[position], ids[target]] = [ids[target], ids[position]];
    index = ids.indexOf(current);
    renderRows(target, direction < 0 ? 'up' : 'down');
    announce(songs.get(ids[target]).title + ' moved to position ' + (target + 1) + '.');
  }
  function remove(position) {
    const removed = songs.get(ids[position]), current = ids[index], playing = !audio.paused;
    const wasCurrent = position === index;
    ids.splice(position, 1);
    if (wasCurrent) {
      audio.pause(); index = ids.length ? Math.min(position, ids.length - 1) : -1; started = false; prepare();
    } else index = ids.indexOf(current);
    renderRows(position, 'remove'); announce(removed.title + ' removed from the queue.');
    if (wasCurrent && playing && ids.length) play();
  }
  function previous() {
    if (!state().hasPrevious) return;
    select(index > 0 ? index - 1 : ids.length - 1, !audio.paused || audio.ended);
  }
  function next() {
    if (!state().hasNext) return;
    select(index < ids.length - 1 ? index + 1 : 0, !audio.paused || audio.ended);
  }
  function open() {
    if (dialog.open) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : opener;
    updateSources(); update(); dialog.showModal();
  }
  opener.onclick = open;
  dialog.querySelector('.sb-queue-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); });
  viewButton.onclick = () => replace(currentView());
  picksButton.onclick = () => replace(currentPicks());
  dialog.querySelector('.sb-queue-clear').onclick = () => { replace([]); announce('Queue cleared.'); viewButton.focus(); };
  playButton.onclick = () => { if (audio.paused) play(); else audio.pause(); };
  repeatSelect.onchange = () => { repeat = repeatSelect.value; update(); announce('Repeat ' + repeat + '.'); };
  audio.addEventListener('play', () => { started = true; error = ''; update(); });
  audio.addEventListener('playing', () => { error = ''; announce(''); update(); });
  audio.addEventListener('pause', update);
  audio.addEventListener('ended', () => {
    if (repeat === 'one') { select(index, true); return; }
    if (index < ids.length - 1) select(index + 1, true);
    else if (repeat === 'all') select(0, true);
    else { update(); announce('Your queue has finished.'); }
  });
  audio.addEventListener('error', () => {
    if (!audio.getAttribute('src')) return;
    error = 'This recording couldn’t load. Try Play again, or choose another song.'; update();
  });
  audio.addEventListener('waiting', () => announce('Loading recording…'));
  const grid = document.getElementById('songGrid');
  if (grid) new MutationObserver(updateSources).observe(grid, { childList: true });
  window.addEventListener('storage', event => { if (event.key === 'songbridge-picks') updateSources(); });
  window.SongBridgeQueue = { audio, open, previous, next, state };
  prepare(); renderRows(); updateSources();
})();
