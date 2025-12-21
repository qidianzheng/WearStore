/* js/main.js */
import { fetchApps } from './data.js';
import { renderCardList, renderAppModal, renderIncompatibleCard } from './ui.js';
import { isAppCompatible, apiMap, escapeHtml } from './utils.js';
import Fuse from './fuse.mjs';

const elements = {
  container: document.getElementById('cardsContainer'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  searchSuggestions: document.getElementById('searchSuggestions'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),

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
  devModalCloseBtn: document.querySelector('#devModalOverlay .header-close-img'),
};

let allApps = [];
let globalZIndex = 1300;
let fuse;
let homeAppsCache = null;

async function init() {
  initTheme();
  allApps = await fetchApps();
  window.allApps = allApps;

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

// 🔥 新增：通用关闭辅助函数 (修复滚动条失效的核心)
function closeStaticModal(modalElement) {
  modalElement.classList.remove('active');

  // 延迟 250ms 等动画结束 (与 CSS 保持一致)
  setTimeout(() => {
    // 检查页面上是否还有其他激活的弹窗
    const activeModals = document.querySelectorAll('.modal-overlay.active');
    if (activeModals.length === 0) {
      // 只有当所有弹窗都关了，才恢复滚动
      document.body.style.overflow = '';
    }
  }, 250);
}

function bindEvents() {
  // 1. 搜索
  elements.searchBtn.onclick = performSearch;
  elements.searchInput.onkeyup = (e) => {
    if (e.key === 'Enter') {
      elements.searchSuggestions.classList.remove('active');
      performSearch();
    }
  };
  elements.searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.trim().length > 0) {
      if (elements.clearSearchBtn) elements.clearSearchBtn.style.display = 'block';
    } else {
      if (elements.clearSearchBtn) elements.clearSearchBtn.style.display = 'none';
      renderRandomHome();
    }
    showSuggestions(val.trim());
  });
  elements.searchInput.addEventListener('focus', (e) => {
    if (e.target.value.trim() !== '') showSuggestions(e.target.value.trim());
  });
  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.onclick = (e) => {
      e.preventDefault();
      elements.searchInput.value = '';
      elements.clearSearchBtn.style.display = 'none';
      elements.searchSuggestions.classList.remove('active');
      elements.searchInput.focus();
      renderRandomHome();
    };
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      elements.searchSuggestions.classList.remove('active');
    }
  });

  // 2. 菜单 (修复逻辑)
  elements.menuBtn.onclick = () => {
    updateVersionTextInMenu();
    elements.menuModal.classList.add('active');
    elements.menuModal.style.zIndex = ++globalZIndex;
    document.body.style.overflow = 'hidden'; // 打开时锁死
  };
  // 关闭时使用通用函数
  elements.closeMenuModal.onclick = () => closeStaticModal(elements.menuModal);
  elements.menuModal.onclick = (e) => {
    if (e.target === elements.menuModal) closeStaticModal(elements.menuModal);
  };

  elements.menuThemeToggle.onclick = toggleTheme;
  elements.menuVersionTrigger.onclick = () => {
    elements.welcomeModal.style.zIndex = ++globalZIndex + 10;
    elements.welcomeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  elements.newArrivalsBtn.onclick = openNewArrivals;
  elements.recentUpdatesBtn.onclick = openRecentUpdates;

  // 3. 分类窗口 (修复逻辑)
  elements.categoryCloseBtn.onclick = () => closeStaticModal(elements.categoryWindow);
  // 只有点击遮罩空白处才关闭，防止误触内容
  elements.categoryWindow.onclick = (e) => {
    if (e.target === elements.categoryWindow) closeStaticModal(elements.categoryWindow);
  };

  // 4. 开发者窗口 (修复逻辑)
  window.addEventListener('open-dev-modal', (e) => {
    openDevWindow(e.detail);
  });

  if (elements.devModalCloseBtn) {
    elements.devModalCloseBtn.onclick = () => closeStaticModal(elements.devModal);
  }

  // 5. 路由
  window.addEventListener('hashchange', checkHashLink);
}

function openNewArrivals() {
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  let sorted = [...allApps].filter(a => isAppCompatible(a, userApi));
  sorted.sort((a, b) => (b.addedTime || 0) - (a.addedTime || 0));
  openCategoryList("最新上架", sorted.slice(0, 16));
}

function openRecentUpdates() {
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  let sorted = [...allApps].filter(a => isAppCompatible(a, userApi));
  sorted.sort((a, b) => {
    const dateA = new Date(a.updateTime || 0);
    const dateB = new Date(b.updateTime || 0);
    return dateB - dateA;
  });
  openCategoryList("最近更新", sorted.slice(0, 16));
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
        if (elements.clearSearchBtn) elements.clearSearchBtn.style.display = 'block';
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
    if (isAppCompatible(app, userApi)) {
      compatible.push(app);
    } else {
      incompatible.push(app);
    }
  });

  if (compatible.length > 0) {
    renderCardList(compatible, elements.container);
  } else if (incompatible.length > 0) {
    const bestMatch = incompatible[0];
    const appName = bestMatch.name;

    const nameMatchRatio = term.length / appName.length;
    const isLiterallySame = appName.toLowerCase() === term.toLowerCase();

    if (isLiterallySame || nameMatchRatio >= 0.4) {
      renderIncompatibleCard(bestMatch, elements.container);
    } else {
      renderCardList([], elements.container);
    }
  } else {
    renderCardList([], elements.container);
  }
}

// --- 路由核心逻辑：处理浏览器的前进/后退 ---
function checkHashLink() {
  const hash = window.location.hash;

  // 获取当前所有已打开的应用窗口 (按层级排序)
  const activeModals = Array.from(document.querySelectorAll('.modal-overlay.active'))
    .sort((a, b) => (parseInt(a.style.zIndex) || 0) - (parseInt(b.style.zIndex) || 0));

  const topModal = activeModals.length > 0 ? activeModals[activeModals.length - 1] : null;

  // 情况 1: URL 变回了主页 (空 hash)
  if (!hash || hash === '#') {
    // 如果当前有打开的窗口，说明用户按了返回键 -> 依次关闭所有窗口
    if (activeModals.length > 0) {
      // 倒序关闭所有应用弹窗 (保留菜单等非应用弹窗的话需要加判断，这里假设全是应用)
      // 过滤掉 data-package 属性不存在的(比如开发者窗口)，或者全部关闭看你需求
      // 这里我们选择：只关闭带有 data-package 的应用详情页
      activeModals.forEach(modal => {
        if (modal.hasAttribute('data-package')) {
          modal.classList.remove('active');
          setTimeout(() => modal.remove(), 300);
        }
      });
      document.body.style.overflow = '';
    }
    return;
  }

  // 情况 2: URL 变成了某个应用的包名 (#app=xxx)
  if (hash.startsWith('#app=')) {
    const pkgName = hash.split('=')[1];

    // 2.1 检查当前顶层窗口是否已经是这个应用
    if (topModal && topModal.getAttribute('data-package') === pkgName) {
      return; // 已经是它了，不用动 (防止重复触发)
    }

    // 2.2 检查是否是“返回上一层”的操作
    // 如果当前顶层窗口是 B，但 URL 变成了 A (A在B底下)
    // 那么我们需要关闭 B，露出 A
    if (activeModals.length > 1) {
      const previousModal = activeModals[activeModals.length - 2];
      if (previousModal && previousModal.getAttribute('data-package') === pkgName) {
        // 用户按了返回键，回到了上一层应用
        // 关闭顶层 (B)
        topModal.classList.remove('active');
        setTimeout(() => topModal.remove(), 300);
        return;
      }
    }

    // 2.3 如果既不是当前，也不是上一层，说明是“新打开”或者“深层链接”
    // 检查 DOM 里是否已经有这个包名的窗口 (在堆叠的下层)
    const existingInStack = document.querySelector(`.modal-overlay[data-package="${pkgName}"]`);

    if (existingInStack) {
      // 如果它已经在堆叠里了，但不是最顶层（极其罕见的情况），
      // 这里通常不需要做特殊处理，或者可以把它提上来。
      // 简单处理：不做操作，等待用户继续返回。
      return;
    }

    // 2.4 如果 DOM 里完全没有，说明是全新打开 (比如刷新页面、分享链接进入)
    const target = allApps.find(a => a.package === pkgName);
    if (target) {
      renderAppModal(target);
    }
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
    "生活服务": { icon: "storefront", color: "color-cyan" },
    "休闲游戏": { icon: "sports_esports", color: "color-pink" },
    "表盘美化": { icon: "watch", color: "color-indigo" }
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

  // 打开时也计算最大层级
  let maxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => {
    const z = parseInt(window.getComputedStyle(el).zIndex) || 1300;
    if (z > maxZ) maxZ = z;
  });

  elements.categoryWindow.classList.add('active');
  elements.categoryWindow.style.zIndex = maxZ + 10;
  document.body.style.overflow = 'hidden'; // 🔥 确保打开时锁定
}

function renderRandomHome() {
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;

  if (!homeAppsCache) {
    let visible = allApps.filter(a => isAppCompatible(a, userApi));
    visible.sort(() => 0.5 - Math.random());
    homeAppsCache = visible.slice(0, 32);
  }

  renderCardList(homeAppsCache, elements.container);
}

function updateVersionTextInMenu() {
  const api = localStorage.getItem('userApiLevel');
  if (api && apiMap[api]) elements.menuVersionText.textContent = `Android ${apiMap[api]}`;
  else elements.menuVersionText.textContent = '点击选择';
}

function initTheme() {
  const stored = localStorage.getItem('theme');
  const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const apply = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  };

  if (stored) {
    apply(stored);
  } else {
    apply(systemQuery.matches ? 'dark' : 'light');
  }

  try {
    systemQuery.addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        apply(e.matches ? 'dark' : 'light');
      }
    });
  } catch (e) {
    systemQuery.addListener((e) => {
      if (!localStorage.getItem('theme')) {
        apply(e.matches ? 'dark' : 'light');
      }
    });
  }
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

  for (let i = 14; i <= 36; i++) {
    const btn = document.createElement('div');
    btn.className = `version-btn ${savedApi == i ? 'selected' : ''}`;
    btn.innerHTML = `Android ${apiMap[i] || '?'}<span class="api-tag">API ${i}</span>`;
    btn.onclick = () => {
      localStorage.setItem('userApiLevel', i);
      elements.welcomeModal.classList.remove('active');

      homeAppsCache = null;
      renderRandomHome();

      if (elements.searchInput.value) performSearch();
      Array.from(elements.versionGrid.children).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      updateVersionTextInMenu();

      // 关闭版本选择窗口后恢复滚动 (如果它下面没有其他窗口)
      // 这里因为版本选择是强制的/或者从菜单打开的，通常需要检查
      setTimeout(() => {
        const activeModals = document.querySelectorAll('.modal-overlay.active');
        if (activeModals.length === 0) document.body.style.overflow = '';
      }, 300);
    };
    elements.versionGrid.appendChild(btn);
  }
  if (!savedApi) {
    elements.welcomeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  updateVersionTextInMenu();
}

function openDevWindow(detail) {
  const name = typeof detail === 'string' ? detail : detail.name;
  const type = typeof detail === 'string' ? 'original' : detail.type;

  elements.devModalTitle.textContent = name;

  let filteredApps = [];

  if (type === 'mod') {
    filteredApps = allApps.filter(a => a.modAuthor === name || a.developer === name);
  } else {
    filteredApps = allApps.filter(a => a.developer === name && !a.modAuthor);
  }

  renderCardList(filteredApps, elements.devAppsContainer);

  let maxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => {
    const z = parseInt(window.getComputedStyle(el).zIndex) || 1300;
    if (z > maxZ) maxZ = z;
  });

  elements.devModal.style.zIndex = maxZ + 10;
  elements.devModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

init();