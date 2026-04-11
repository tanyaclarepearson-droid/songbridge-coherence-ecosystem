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
  document.getElementById("startHereModal").style.display = "block";
}

function closeStartHereModal() {
  document.getElementById("startHereModal").style.display = "none";
}
