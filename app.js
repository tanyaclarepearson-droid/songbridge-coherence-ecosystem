const navLinks = [...document.querySelectorAll('.nav-link')];
const bottomLinks = [...document.querySelectorAll('.bottom-link')];
const allNav = [...navLinks, ...bottomLinks];
const sections = [...document.querySelectorAll('main section[id]')];

const cardButtons = document.querySelectorAll('.product-card');
const drawer = document.querySelector('.drawer');
const backdrop = document.querySelector('.drawer-backdrop');
const closeBtn = document.querySelector('.drawer-close');

const drawerTier = document.getElementById('drawer-tier');
const drawerTitle = document.getElementById('drawer-title');
const drawerAudience = document.getElementById('drawer-audience');
const drawerIncludes = document.getElementById('drawer-includes');
const drawerWhy = document.getElementById('drawer-why');

function setActive(hash) {
  allNav.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === hash);
  });
}

const observer = new IntersectionObserver((entries) => {
  const visible = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (visible) setActive(`#${visible.target.id}`);
}, { threshold: [0.35, 0.6, 0.85] });

sections.forEach(section => observer.observe(section));

function openDrawer(dataset) {
  drawerTier.textContent = dataset.tier || '';
  drawerTitle.textContent = dataset.title || '';
  drawerAudience.textContent = dataset.audience ? `Best fit: ${dataset.audience}` : '';
  drawerIncludes.textContent = dataset.includes || '';
  drawerWhy.textContent = dataset.why || '';
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.hidden = true;
  document.body.style.overflow = '';
}

cardButtons.forEach(btn => btn.addEventListener('click', () => openDrawer(btn.dataset)));
closeBtn.addEventListener('click', closeDrawer);
backdrop.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}


const splash = document.getElementById('splash');

function hideSplash() {
  if (!splash) return;
  requestAnimationFrame(() => {
    splash.classList.add('is-hidden');
    setTimeout(() => {
      splash.remove();
    }, 760);
  });
}

window.addEventListener('load', () => {
  const minSplashTime = 1150;
  setTimeout(hideSplash, minSplashTime);
});
function openStartHereModal() {
  document.getElementById("startHereModal").classList.add("open");
}

function closeStartHereModal() {
  document.getElementById("startHereModal").classList.remove("open");
}
function openJoyStaysModal() {
  document.getElementById("joyStaysModal").classList.add("open");
}

function closeJoyStaysModal() {
  document.getElementById("joyStaysModal").classList.remove("open");
}

function openBreatheModal() {
  document.getElementById("breatheModal").classList.add("open");
}

function closeBreatheModal() {
  document.getElementById("breatheModal").classList.remove("open");
}
function openVoiceModal() {
  document.getElementById("voiceModal").classList.add("open");
}

function closeVoiceModal() {
  document.getElementById("voiceModal").classList.remove("open");
}
function openSuperpowersModal() {
  document.getElementById("superpowersModal").classList.add("open");
}

function closeSuperpowersModal() {
  document.getElementById("superpowersModal").classList.remove("open");
}
function openWaysModal() {
  document.getElementById("waysModal").classList.add("open");
}

function closeWaysModal() {
  document.getElementById("waysModal").classList.remove("open");
}
function attachSheetSwipe(modalId, closeFn) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  const handle = modal.querySelector('.sheet-handle');
  const sheet = modal.querySelector('.start-here-content');
  if (!handle || !sheet) return;

  let startY = 0;
  let currentY = 0;
  let dragging = false;

  handle.addEventListener('touchstart', (e) => {
    if (!modal.classList.contains('open')) return;
    startY = e.touches[0].clientY;
    currentY = startY;
    dragging = true;
    sheet.classList.add('is-dragging');
  }, { passive: true });

  handle.addEventListener('touchmove', (e) => {
    if (!dragging) return;

    currentY = e.touches[0].clientY;
    const deltaY = Math.max(0, currentY - startY);

    if (deltaY > 0) {
      e.preventDefault();
      sheet.style.transform = `translateY(${deltaY}px)`;
    }
  }, { passive: false });

  handle.addEventListener('touchend', () => {
    if (!dragging) return;

    const deltaY = Math.max(0, currentY - startY);
    dragging = false;
    sheet.classList.remove('is-dragging');

    sheet.style.transform = 'translateY(100%)';
setTimeout(() => {
  sheet.style.transform = '';
  closeFn();
}, 120);
  });

  handle.addEventListener('touchcancel', () => {
    dragging = false;
    sheet.classList.remove('is-dragging');
    sheet.style.transform = '';
  });
}

attachSheetSwipe('startHereModal', closeStartHereModal);
attachSheetSwipe('joyStaysModal', closeJoyStaysModal);
attachSheetSwipe('breatheModal', closeBreatheModal);
attachSheetSwipe('voiceModal', closeVoiceModal);
attachSheetSwipe('superpowersModal', closeSuperpowersModal);
attachSheetSwipe('waysModal', closeWaysModal);
function openRandomSongModal() {
  const openers = [
    openJoyStaysModal,
    openBreatheModal,
    openVoiceModal,
    openSuperpowersModal,
    openWaysModal
  ];

  const randomIndex = Math.floor(Math.random() * openers.length);
  openers[randomIndex]();
}
