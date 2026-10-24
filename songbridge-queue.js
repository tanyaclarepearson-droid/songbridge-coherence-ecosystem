/* A listening queue survives collection filtering and keeps one audio element. */
(() => {
  'use strict';
  if (window.SongBridgeQueue || typeof SONGS === 'undefined') return;
  const key = 'songbridge-listening-queue';
  const listsKey = 'songbridge-playlists';
  const songs = new Map(SONGS.map(song => [String(song.id), song]));
  const available = id => songs.has(String(id)) && !!(window.SONGBRIDGE_AUDIO || {})[id];
  const cleanIds = value => [...new Set(Array.isArray(value) ? value.map(String) : [])].filter(available);
  let playlists = [], playlistId = '', storageError = false, tab = 'choose';
  function readPlaylists() {
    try {
      const value = JSON.parse(localStorage.getItem(listsKey) || 'null');
      const seen = new Set();
      return (Array.isArray(value?.lists) ? value.lists : []).filter(item => {
        if (!item || typeof item.id !== 'string' || seen.has(item.id) || typeof item.name !== 'string' || !item.name.trim()) return false;
        seen.add(item.id); return true;
      }).map(item => ({ id: item.id, name: item.name.trim().slice(0, 60), ids: cleanIds(item.ids), repeat: ['all','one'].includes(item.repeat) ? item.repeat : 'off' }));
    } catch (_) { return []; }
  }
  playlists = readPlaylists();
  let ids = [], index = -1, repeat = 'off', generation = 0, error = '', started = false;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && Array.isArray(saved.ids)) {
      ids = [...new Set(saved.ids.map(String))].filter(available);
      index = ids.length ? Math.max(0, Math.min(ids.length - 1, Math.trunc(Number(saved.index)) || 0)) : -1;
      if (['off', 'all', 'one'].includes(saved.repeat)) repeat = saved.repeat;
      if (playlists.some(item => item.id === saved.playlistId)) playlistId = saved.playlistId;
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
  dialog.innerHTML = `<div class="sb-queue-head"><div><p class="eyebrow">KEEP THE MUSIC GOING</p><h2 id="sb-queue-heading">Your playlists</h2></div><button type="button" class="sb-queue-close" aria-label="Close playlists">×</button></div>
    <p class="sb-queue-intro">A few songs for the moment. Make a list to return to.</p>
    <div class="sb-playlist-library"><label for="sb-playlist-select">Saved playlists</label><div class="sb-playlist-controls"><select id="sb-playlist-select" aria-label="Saved playlists"></select><button type="button" class="sb-playlist-new">New playlist</button></div></div>
    <form class="sb-playlist-save"><label for="sb-playlist-name">Playlist name</label><div class="sb-playlist-controls"><input id="sb-playlist-name" maxlength="60" placeholder="e.g. A gentle beginning" autocomplete="off"><button type="submit" class="sb-playlist-save-button">Save list</button></div></form>
    <div class="sb-playlist-meta"><p class="sb-playlist-saved" role="status"></p><button type="button" class="sb-playlist-delete" hidden>Delete list</button></div>
    <div class="sb-playlist-confirm" hidden><span>Delete this saved playlist?</span><button type="button" data-delete="cancel">Keep it</button><button type="button" data-delete="yes">Delete</button></div>
    <div class="sb-playlist-tabs" role="tablist" aria-label="Edit playlist"><button type="button" id="sb-choose-tab" role="tab" aria-controls="sb-choose-panel" data-tab="choose">Choose songs</button><button type="button" id="sb-order-tab" role="tab" aria-controls="sb-order-panel" data-tab="order">Playing order</button></div>
    <section id="sb-choose-panel" role="tabpanel" aria-labelledby="sb-choose-tab"><div class="sb-playlist-search"><input type="search" aria-label="Find songs to add" placeholder="Find a title, language, or moment…"><button type="button" data-source="picks">Add My picks</button></div><p class="sb-playlist-selection" aria-live="polite"></p><div class="sb-playlist-catalog" aria-label="Choose songs for this playlist"></div><p class="sb-playlist-no-results" hidden>No matching songs. Try another search.</p></section>
    <section id="sb-order-panel" role="tabpanel" aria-labelledby="sb-order-tab" hidden><div class="sb-queue-list-wrap"><p class="sb-queue-empty">Your list starts empty. Choose the songs you want to hear.</p><ol class="sb-queue-list" aria-label="Songs in listening order"></ol></div></section>
    <div class="sb-queue-footer"><button type="button" class="sb-queue-play">Play playlist</button><label class="sb-queue-repeat">Repeat <select aria-label="Repeat queue"><option value="off">Off</option><option value="all">All</option><option value="one">One</option></select></label><button type="button" class="sb-queue-clear">Clear songs</button></div><p class="sb-queue-status" role="status" aria-live="polite"></p>`;
  // One scrollable middle keeps playback controls reachable on short screens.
  // The previous nested song scrollers trapped scroll before the footer.
  const content = document.createElement('div');
  content.className = 'sb-queue-content';
  content.tabIndex = 0;
  content.setAttribute('role', 'region');
  content.setAttribute('aria-label', 'Playlist setup and songs');
  const controls = document.createElement('div');
  controls.className = 'sb-queue-controls';
  const head = dialog.querySelector('.sb-queue-head');
  const footer = dialog.querySelector('.sb-queue-footer');
  const feedback = dialog.querySelector('.sb-queue-status');
  [...dialog.children].forEach(child => {
    if (child !== head && child !== footer && child !== feedback) content.append(child);
  });
  controls.append(footer, feedback);
  dialog.replaceChildren(head, content, controls);
  document.body.append(dialog);
  const list = dialog.querySelector('.sb-queue-list');
  const status = dialog.querySelector('.sb-queue-status');
  const playButton = dialog.querySelector('.sb-queue-play');
  const repeatSelect = dialog.querySelector('.sb-queue-repeat select');
  const picksButton = dialog.querySelector('[data-source="picks"]');
  const playlistSelect = dialog.querySelector('#sb-playlist-select');
  const nameInput = dialog.querySelector('#sb-playlist-name');
  const saveButton = dialog.querySelector('.sb-playlist-save-button');
  const savedNote = dialog.querySelector('.sb-playlist-saved');
  const catalog = dialog.querySelector('.sb-playlist-catalog');
  const search = dialog.querySelector('.sb-playlist-search input');
  const deleteConfirm = dialog.querySelector('.sb-playlist-confirm');
  const namedList = () => playlists.find(item => item.id === playlistId);
  nameInput.value = namedList()?.name || '';
  let returnFocus = opener;

  function currentPicks() {
    try {
      const saved = JSON.parse(localStorage.getItem('songbridge-picks') || '[]');
      const picked = new Set(Array.isArray(saved) ? saved.map(String) : []);
      return SONGS.filter(song => picked.has(String(song.id)) && available(song.id)).map(song => String(song.id));
    } catch (_) { return []; }
  }
  function updateSources() {
    const picks = currentPicks().length;
    picksButton.textContent = 'Add My picks' + (picks ? ' (' + picks + ')' : '');
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
    try { localStorage.setItem(key, JSON.stringify({ ids, index, repeat, playlistId })); }
    catch (_) { storageError = true; }
  }
  function writePlaylists() {
    try { localStorage.setItem(listsKey, JSON.stringify({version: 1, lists: playlists})); storageError = false; return true; }
    catch (_) { storageError = true; return false; }
  }
  function commitEdits() {
    const item = namedList();
    if (item) { item.ids = [...ids]; item.repeat = repeat; writePlaylists(); }
    updateLibrary();
  }
  function updateLibrary() {
    playlistSelect.replaceChildren();
    if (!playlistId) {
      const draft = document.createElement('option'); draft.value = ''; draft.textContent = 'New / unsaved playlist'; playlistSelect.append(draft);
    }
    playlists.forEach(item => {
      const option = document.createElement('option'); option.value = item.id; option.textContent = item.name + ' · ' + item.ids.length; playlistSelect.append(option);
    });
    playlistSelect.value = playlistId;
    dialog.querySelector('.sb-playlist-delete').hidden = !playlistId;
    // New playlist provides a fresh start without accidentally emptying a saved list.
    dialog.querySelector('.sb-queue-clear').hidden = !!playlistId;
    saveButton.textContent = playlistId ? 'Save name' : 'Save list';
    saveButton.disabled = !nameInput.value.trim() || (!playlistId && !ids.length) || (namedList()?.name === nameInput.value.trim());
    savedNote.textContent = storageError ? 'This browser couldn’t save your changes. Keep this tab open.' : playlistId ? 'Saved on this browser · song changes save automatically.' : 'Name and save your list to find it here again.';
  }
  function setTab(nextTab) {
    tab = nextTab;
    dialog.querySelectorAll('[data-tab]').forEach(button => {
      const selected = button.dataset.tab === tab;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    });
    dialog.querySelector('#sb-choose-panel').hidden = tab !== 'choose';
    dialog.querySelector('#sb-order-panel').hidden = tab !== 'order';
  }
  function syncCatalog() {
    const selected = new Set(ids);
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const query = normalize(search.value.trim());
    let shown = 0;
    catalog.querySelectorAll('label').forEach(row => {
      const input = row.querySelector('input'); input.checked = selected.has(input.value);
      row.classList.toggle('is-selected', input.checked);
      row.hidden = query && !normalize(row.dataset.search).includes(query);
      if (!row.hidden) shown++;
    });
    dialog.querySelector('.sb-playlist-no-results').hidden = shown > 0;
    dialog.querySelector('.sb-playlist-selection').textContent = ids.length + ' selected · Check a song to add it.';
    dialog.querySelector('[data-tab="order"]').textContent = 'Playing order (' + ids.length + ')';
  }
  function buildCatalog() {
    SONGS.filter(song => available(song.id)).forEach(song => {
      const row = document.createElement('label'); row.className = 'sb-playlist-choice'; row.dataset.search = [song.title, song.language, song.moment].join(' ');
      const input = document.createElement('input'); input.type = 'checkbox'; input.value = String(song.id); input.setAttribute('aria-label', song.title + ' · ' + song.language);
      const image = document.createElement('img'); image.src = song.cover || ''; image.alt = ''; image.loading = 'lazy';
      const text = document.createElement('span'), title = document.createElement('strong'), detail = document.createElement('span');
      title.textContent = song.title; detail.textContent = song.language + ' · ' + song.moment;
      text.append(title, detail); row.append(input, image, text); catalog.append(row);
      input.onchange = () => {
        if (input.checked) add([input.value]);
        else { const position = ids.indexOf(input.value); if (position !== -1) remove(position, false); }
      };
    });
  }
  function add(nextIds) {
    const additions = cleanIds(nextIds).filter(id => !ids.includes(id));
    if (!additions.length) { announce('Those songs are already in your list.'); return; }
    const empty = !ids.length;
    ids.push(...additions);
    if (empty) { index = 0; started = false; prepare(); }
    commitEdits(); renderRows(); announce(additions.length === 1 ? songs.get(additions[0]).title + ' added.' : additions.length + ' songs added.');
  }
  function announce(message) { status.textContent = message; }
  function update() {
    const playing = !audio.paused && !audio.ended;
    opener.textContent = 'Playlists' + (playlists.length ? ' · ' + playlists.length : '');
    opener.setAttribute('aria-label', 'Open playlists');
    opener.classList.toggle('is-playing', playing);
    playButton.disabled = !ids.length;
    playButton.textContent = playing ? 'Pause' : audio.ended ? 'Play again' : started ? 'Resume' : 'Play playlist';
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
    if (storageError) savedNote.textContent = 'This browser couldn’t save your changes. Keep this tab open.';
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
    syncCatalog(); updateLibrary();
    if (Number.isInteger(focusPosition)) {
      const row = list.children[Math.min(focusPosition, ids.length - 1)];
      const action = row?.querySelector('[data-action="' + focusAction + '"]');
      (action && !action.disabled ? action : row?.querySelector('.sb-queue-track') || dialog.querySelector('[data-tab="choose"]')).focus();
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
    prepare(); renderRows(); announce(ids.length ? ids.length + ' songs ready. Select Play playlist to start.' : 'Choose the songs you want to add.');
  }
  function move(position, direction) {
    const target = position + direction;
    if (target < 0 || target >= ids.length) return;
    const current = ids[index];
    [ids[position], ids[target]] = [ids[target], ids[position]];
    index = ids.indexOf(current);
    commitEdits();
    renderRows(target, direction < 0 ? 'up' : 'down');
    announce(songs.get(ids[target]).title + ' moved to position ' + (target + 1) + '.');
  }
  function remove(position, focusRow = true) {
    const removed = songs.get(ids[position]), current = ids[index], playing = !audio.paused;
    const wasCurrent = position === index;
    ids.splice(position, 1);
    if (wasCurrent) {
      audio.pause(); index = ids.length ? Math.min(position, ids.length - 1) : -1; started = false; prepare();
    } else index = ids.indexOf(current);
    commitEdits(); renderRows(focusRow ? position : undefined, 'remove'); announce(removed.title + ' removed from the playlist.');
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
    updateSources(); update(); updateLibrary(); syncCatalog(); dialog.showModal();
  }
  opener.onclick = open;
  dialog.querySelector('.sb-queue-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); });
  picksButton.onclick = () => add(currentPicks());
  dialog.querySelector('.sb-queue-clear').onclick = () => { replace([]); commitEdits(); setTab('choose'); announce('Songs cleared. Choose songs to add.'); dialog.querySelector('[data-tab="choose"]').focus(); };
  search.oninput = syncCatalog;
  nameInput.oninput = updateLibrary;
  dialog.querySelectorAll('[data-tab]').forEach(button => {
    button.onclick = () => setTab(button.dataset.tab);
    button.onkeydown = event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); setTab(event.key === 'Home' ? 'choose' : event.key === 'End' ? 'order' : tab === 'choose' ? 'order' : 'choose');
        dialog.querySelector('[data-tab="' + tab + '"]').focus();
      }
    };
  });
  dialog.querySelector('.sb-playlist-new').onclick = () => {
    playlistId = ''; nameInput.value = ''; repeat = 'off'; search.value = ''; deleteConfirm.hidden = true;
    replace([]); setTab('choose'); nameInput.focus();
  };
  playlistSelect.onchange = () => {
    const item = playlists.find(list => list.id === playlistSelect.value);
    if (!item) return;
    playlistId = item.id; nameInput.value = item.name; repeat = item.repeat; search.value = ''; deleteConfirm.hidden = true;
    replace(item.ids); setTab('order');
  };
  dialog.querySelector('.sb-playlist-save').onsubmit = event => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name || (!ids.length && !playlistId)) { announce('Choose a song and give your playlist a name.'); return; }
    if (playlists.some(item => item.id !== playlistId && item.name.toLowerCase() === name.toLowerCase())) { announce('A playlist already has that name. Choose another name.'); nameInput.focus(); return; }
    if (!playlistId) {
      playlistId = 'list-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
      playlists.push({id: playlistId, name, ids: [...ids], repeat});
    } else namedList().name = name;
    nameInput.value = name; commitEdits(); update();
    announce(storageError ? 'Your playlist is available in this tab, but couldn’t be saved.' : '“' + name + '” saved. You can choose it from Saved playlists.');
  };
  dialog.querySelector('.sb-playlist-delete').onclick = () => { deleteConfirm.hidden = false; dialog.querySelector('[data-delete="cancel"]').focus(); };
  dialog.querySelector('[data-delete="cancel"]').onclick = () => { deleteConfirm.hidden = true; dialog.querySelector('.sb-playlist-delete').focus(); };
  dialog.querySelector('[data-delete="yes"]').onclick = () => {
    playlists = playlists.filter(item => item.id !== playlistId); playlistId = ''; nameInput.value = ''; deleteConfirm.hidden = true;
    writePlaylists(); updateLibrary(); update(); announce('Saved playlist deleted. The current songs are still here as an unsaved list.'); nameInput.focus();
  };
  playButton.onclick = () => { if (audio.paused) play(); else audio.pause(); };
  repeatSelect.onchange = () => { repeat = repeatSelect.value; commitEdits(); update(); announce('Repeat ' + repeat + '.'); };
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
  buildCatalog(); prepare(); renderRows(); updateSources(); setTab('choose');
})();
