/* js/main.js */
import { fetchApps } from './data.js';
import { renderCardList, renderAppModal, renderIncompatibleCard } from './ui.js';
import { isAppCompatible, apiMap, escapeHtml } from './utils.js';
import Fuse from './fuse.mjs'; // 本地引入

const elements = {
  container: document.getElementById('cardsContainer'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  searchSuggestions: document.getElementById('searchSuggestions'),

  menuBtn: document.getElementById('menuBtn'),
  menuModal: document.getElementById('menuModalOverlay'),
  closeMenuModal: document.getElementById('closeMenuModal'),
  menuThemeToggle: document.getElementById('menuThemeToggle'),
  menuVersionTrigger: document.getElementById('menuVersionTrigger'),
  menuVersionText: document.getElementById('menuVersionText'),
  newArrivalsBtn: document.getElementById('newArrivalsBtn'),
  recentUpdatesBtn: document.getElementById('recentUpdatesBtn'),
  menuCategoryGrid: document.getElementById('menuCategoryGrid'),

  categoryWindow: document.getElementById('categoryWindowOverlay'),
  categoryAppsContainer: document.getElementById('categoryAppsContainer'),
  categoryWindowTitle: document.getElementById('categoryWindowTitle'),
  categoryCloseBtn: document.getElementById('categoryCloseBtn'),

  welcomeModal: document.getElementById('welcomeModalOverlay'),
  versionGrid: document.getElementById('versionGrid'),
  devModal: document.getElementById('devModalOverlay'),
  devAppsContainer: document.getElementById('devAppsContainer'),
  devModalTitle: document.getElementById('devModalTitle'),
};

let allApps = [];
let globalZIndex = 1300;
let fuse;

async function init() {
  initTheme();
  allApps = await fetchApps();
  initFuse();
  checkHashLink();
  checkUserVersion();
  bindEvents();
  populateMenuCategories();

  if (!window.location.hash && elements.searchInput.value === '') {
    renderRandomHome();
  }
}

function initFuse() {
  const options = {
    includeScore: true,
    threshold: 0.4,
    keys: [
      { name: 'name', weight: 0.6 },
      { name: 'keywords', weight: 0.3 },
      { name: 'description', weight: 0.1 },
      { name: 'developer', weight: 0.1 }
    ]
  };
  fuse = new Fuse(allApps, options);
}

function bindEvents() {
  elements.searchBtn.onclick = performSearch;
  elements.searchInput.onkeyup = (e) => {
    if (e.key === 'Enter') {
      elements.searchSuggestions.classList.remove('active');
      performSearch();
    }
  };
  elements.searchInput.addEventListener('input', (e) => showSuggestions(e.target.value.trim()));
  elements.searchInput.addEventListener('focus', (e) => {
    if (e.target.value.trim() !== '') showSuggestions(e.target.value.trim());
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      elements.searchSuggestions.classList.remove('active');
    }
  });

  elements.menuBtn.onclick = () => {
    updateVersionTextInMenu();
    elements.menuModal.classList.add('active');
    elements.menuModal.style.zIndex = ++globalZIndex;
  };
  elements.closeMenuModal.onclick = () => elements.menuModal.classList.remove('active');
  elements.menuModal.onclick = (e) => {
    if (e.target === elements.menuModal) elements.menuModal.classList.remove('active');
  };

  elements.menuThemeToggle.onclick = toggleTheme;
  elements.menuVersionTrigger.onclick = () => {
    elements.welcomeModal.style.zIndex = ++globalZIndex + 10;
    elements.welcomeModal.classList.add('active');
  };

  elements.newArrivalsBtn.onclick = openNewArrivals;
  elements.recentUpdatesBtn.onclick = openRecentUpdates;

  elements.categoryCloseBtn.onclick = () => elements.categoryWindow.classList.remove('active');
  elements.categoryWindow.onclick = (e) => {
    if (e.target === elements.categoryWindow) elements.categoryWindow.classList.remove('active');
  };

  window.addEventListener('open-dev-modal', (e) => {
    openDevWindow(e.detail);
  });

  window.addEventListener('hashchange', checkHashLink);
}

function openNewArrivals() {
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  let sorted = [...allApps].filter(a => isAppCompatible(a, userApi));
  sorted.sort((a, b) => (b.addedTime || 0) - (a.addedTime || 0));
  openCategoryList("最新上架", sorted.slice(0, 10));
}

function openRecentUpdates() {
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  let sorted = [...allApps].filter(a => isAppCompatible(a, userApi));
  sorted.sort((a, b) => {
    const dateA = new Date(a.updateTime || 0);
    const dateB = new Date(b.updateTime || 0);
    return dateB - dateA;
  });
  openCategoryList("最近更新", sorted.slice(0, 10));
}

function showSuggestions(term) {
  if (!term) {
    elements.searchSuggestions.innerHTML = '';
    elements.searchSuggestions.classList.remove('active');
    return;
  }
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  const fuseResults = fuse.search(term);
  const matches = fuseResults.map(r => r.item).filter(a => isAppCompatible(a, userApi)).slice(0, 5);

  if (matches.length === 0) {
    elements.searchSuggestions.classList.remove('active');
    return;
  }
  elements.searchSuggestions.innerHTML = matches.map(app => `
        <div class="suggestion-item" data-package="${app.package}">
            <img src="${escapeHtml(app.icon)}" class="suggestion-icon" onerror="handleImgError(this)">
            <div class="suggestion-info">
                <span class="suggestion-name">${escapeHtml(app.name)}</span>
                <span class="suggestion-dev">${escapeHtml(app.developer || '未知开发者')}</span>
            </div>
        </div>
    `).join('');
  elements.searchSuggestions.classList.add('active');
  Array.from(elements.searchSuggestions.children).forEach(el => {
    el.onclick = () => {
      const pkg = el.getAttribute('data-package');
      const app = allApps.find(a => a.package === pkg);
      if (app) {
        renderAppModal(app);
        elements.searchSuggestions.classList.remove('active');
        elements.searchInput.value = app.name;
      }
    };
  });
}

function performSearch() {
  const term = elements.searchInput.value.trim();
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;

  if (!term) { renderRandomHome(); return; }

  const fuseResults = fuse.search(term);
  const allMatches = fuseResults.map(r => r.item);
  const compatible = [];
  const incompatible = [];

  allMatches.forEach(app => {
    if (isAppCompatible(app, userApi)) compatible.push(app);
    else incompatible.push(app);
  });

  if (compatible.length > 0) renderCardList(compatible, elements.container);
  else if (incompatible.length > 0) renderIncompatibleCard(incompatible[0], elements.container);
  else renderCardList([], elements.container);
}

function checkHashLink() {
  const hash = window.location.hash;
  if (hash.startsWith('#app=')) {
    const pkgName = hash.split('=')[1];
    const target = allApps.find(a => a.package === pkgName);
    if (target) renderAppModal(target);
  }
}

function populateMenuCategories() {
  const categoryConfig = {
    "系统工具": { icon: "build", color: "color-slate" },
    "效率办公": { icon: "work", color: "color-blue" },
    "健康运动": { icon: "fitness_center", color: "color-red" },
    "通讯社交": { icon: "forum", color: "color-green" },
    "影音娱乐": { icon: "movie", color: "color-purple" },
    "学习充电": { icon: "school", color: "color-orange" },
    "生活服务": { icon: "storefront", color: "color-cyan" }
  };
  const defaultConfig = { icon: "folder", color: "color-normal" };

  const categories = new Set();
  allApps.forEach(app => {
    const cat = app.category && app.category.trim() !== "" ? app.category : "其他";
    categories.add(cat);
  });

  elements.menuCategoryGrid.innerHTML = '';

  const allBtn = document.createElement('div');
  allBtn.className = 'category-btn-new';
  allBtn.innerHTML = `<span class="material-symbols-rounded category-icon-img color-primary">apps</span><span class="category-text">全部应用</span>`;
  allBtn.onclick = () => {
    const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
    const filtered = allApps.filter(a => isAppCompatible(a, userApi));
    openCategoryList('全部应用', filtered);
  };
  elements.menuCategoryGrid.appendChild(allBtn);

  const sortedCategories = Array.from(categories).sort((a, b) => {
    if (a === "其他") return 1;
    if (b === "其他") return -1;
    return a.localeCompare(b, 'zh');
  });

  sortedCategories.forEach(cat => {
    const btn = document.createElement('div');
    btn.className = 'category-btn-new';
    const config = categoryConfig[cat] || defaultConfig;
    btn.innerHTML = `<span class="material-symbols-rounded category-icon-img ${config.color}">${config.icon}</span><span class="category-text">${escapeHtml(cat)}</span>`;
    btn.onclick = () => {
      const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
      const filtered = allApps.filter(a => {
        const appCat = a.category && a.category.trim() !== "" ? a.category : "其他";
        return appCat === cat && isAppCompatible(a, userApi);
      });
      openCategoryList(cat, filtered);
    };
    elements.menuCategoryGrid.appendChild(btn);
  });
}

function openCategoryList(title, appList) {
  elements.categoryWindowTitle.textContent = title;
  renderCardList(appList, elements.categoryAppsContainer);
  elements.categoryWindow.classList.add('active');
  elements.categoryWindow.style.zIndex = ++globalZIndex;
}

function renderRandomHome() {
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  let visible = allApps.filter(a => isAppCompatible(a, userApi));
  visible.sort(() => 0.5 - Math.random());
  renderCardList(visible.slice(0, 30), elements.container);
}

function updateVersionTextInMenu() {
  const api = localStorage.getItem('userApiLevel');
  if (api && apiMap[api]) elements.menuVersionText.textContent = `Android ${apiMap[api]}`;
  else elements.menuVersionText.textContent = '点击选择';
}

function initTheme() {
  const stored = localStorage.getItem('theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = stored || (systemDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('.theme-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? 'brightness_5' : 'dark_mode';
    icon.style.color = theme === 'dark' ? 'var(--icon-sun)' : 'var(--icon-normal)';
  }
}

function checkUserVersion() {
  const savedApi = localStorage.getItem('userApiLevel');
  elements.versionGrid.innerHTML = '';

  // 修改：循环 14-36
  for (let i = 14; i <= 36; i++) {
    const btn = document.createElement('div');
    btn.className = `version-btn ${savedApi == i ? 'selected' : ''}`;
    btn.innerHTML = `Android ${apiMap[i] || '?'}<span class="api-tag">API ${i}</span>`;
    btn.onclick = () => {
      localStorage.setItem('userApiLevel', i);
      elements.welcomeModal.classList.remove('active');
      renderRandomHome();
      if (elements.searchInput.value) performSearch();
      Array.from(elements.versionGrid.children).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      updateVersionTextInMenu();
    };
    elements.versionGrid.appendChild(btn);
  }
  if (!savedApi) elements.welcomeModal.classList.add('active');
  updateVersionTextInMenu();
}

function openDevWindow(devName) {
  elements.devModalTitle.textContent = devName;
  const devApps = allApps.filter(a => a.developer === devName);
  renderCardList(devApps, elements.devAppsContainer);
  elements.devModal.classList.add('active');
  elements.devModal.style.zIndex = ++globalZIndex;
}

init();