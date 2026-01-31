import { fetchApps } from './data.js';
import { renderCardList, renderAppModal, renderIncompatibleCard, openHistoryModal, renderDevModal, renderCategoryModal } from './ui.js';
import { isAppCompatible, apiMap, escapeHtml, categoryHash, getCategoryByHash, findAppByPrecision, setPageTitle } from './utils.js';
import Fuse from './fuse.mjs';

const elements = {
  container: document.getElementById('cardsContainer'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  searchSuggestions: document.getElementById('searchSuggestions'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),

  // 菜单相关
  menuBtn: document.getElementById('menuBtn'),
  menuModal: document.getElementById('menuModalOverlay'),
  closeMenuModal: document.getElementById('closeMenuModal'),
  menuThemeToggle: document.getElementById('menuThemeToggle'),
  menuVersionTrigger: document.getElementById('menuVersionTrigger'),
  menuVersionText: document.getElementById('menuVersionText'),
  newArrivalsBtn: document.getElementById('newArrivalsBtn'),
  recentUpdatesBtn: document.getElementById('recentUpdatesBtn'),
  serviceBtn: document.getElementById('serviceBtn'),
  menuCategoryGrid: document.getElementById('menuCategoryGrid'),

  welcomeModal: document.getElementById('welcomeModalOverlay'),
  versionGrid: document.getElementById('versionGrid'),
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

  // 先绑定事件
  bindEvents();

  populateMenuCategories();

  // 初始化路由
  checkHashLink();
  checkUserVersion();

  if (!window.location.hash && elements.searchInput.value === '') {
    renderRandomHome();
  }
}

function initFuse() {
  const options = {
    includeScore: true,
    threshold: 0.2,
    location: 0,
    distance: 100,
    keys: [
      { name: 'name', weight: 1.0 },
      { name: 'keywords', weight: 0.8 }
    ]
  };
  fuse = new Fuse(allApps, options);
}

// 统一关闭逻辑：点击关闭按钮 = 浏览器后退
function handleCloseButton() {
  if (window.location.hash && window.location.hash !== '#') {
    history.back();
  } else {
    // 异常兜底
    closeAllModalsForce();
  }
}

// 强制清理所有窗口
function forceCloseAll() {
  closeAllModalsForce();
}

function closeAllModalsForce() {
  // 1. 关闭所有动态创建的窗口 (详情、开发者、分类、历史)
  document.querySelectorAll('.modal-overlay[data-dynamic="true"]').forEach(m => {
    m.classList.remove('active');
    setTimeout(() => m.remove(), 300);
  });

  // 2. 关闭静态窗口 (只剩菜单和欢迎页)
  if (elements.menuModal) elements.menuModal.classList.remove('active');
  if (elements.welcomeModal) elements.welcomeModal.classList.remove('active');

  document.body.style.overflow = '';
}

function bindEvents() {
  // 搜索
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
      window.location.hash = '';
    };
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      elements.searchSuggestions.classList.remove('active');
    }
  });

  // 菜单
  elements.menuBtn.onclick = () => {
    updateVersionTextInMenu();
    window.location.hash = 'menu';
  };

  // 关闭按钮
  elements.closeMenuModal.onclick = handleCloseButton;

  // 主题/版本
  elements.menuThemeToggle.onclick = toggleTheme;
  elements.menuVersionTrigger.onclick = () => {
    let maxZ = 1300;
    document.querySelectorAll('.modal-overlay').forEach(el => {
      const z = parseInt(window.getComputedStyle(el).zIndex) || 1300;
      if (z > maxZ) maxZ = z;
    });
    elements.welcomeModal.style.zIndex = maxZ + 10;
    elements.welcomeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  // 列表入口
  elements.newArrivalsBtn.onclick = () => { window.location.hash = 'list=new'; };
  elements.recentUpdatesBtn.onclick = () => { window.location.hash = 'list=recent'; };

  // 服务按钮
  if (elements.serviceBtn) {
    const serviceUrl = "https://wj.qq.com/s2/25513095/8cde/";
    elements.serviceBtn.onclick = () => {
      const link = document.createElement('a');
      link.href = serviceUrl;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  }

  // 监听 UI 层事件
  window.addEventListener('open-dev-modal', (e) => {
    const name = e.detail.name;
    const type = e.detail.type;
    window.location.hash = `dev=${encodeURIComponent(name)}${type === 'mod' ? '&type=mod' : ''}`;
  });

  // 路由监听
  window.addEventListener('hashchange', checkHashLink);
}

// 路由检查
function checkHashLink() {
  const hash = window.location.hash;
  const decodedHash = decodeURIComponent(hash);

  const activeModals = Array.from(document.querySelectorAll('.modal-overlay.active'))
    .sort((a, b) => (parseInt(window.getComputedStyle(a).zIndex) || 0) - (parseInt(window.getComputedStyle(b).zIndex) || 0));
  const topModal = activeModals.length > 0 ? activeModals[activeModals.length - 1] : null;

  // 1. 主页
  if (!hash || hash === '#') {
    closeAllModalsForce();
    renderRandomHome();
    setPageTitle("WearStore - 发现心动的手表软件");
    return;
  }

  // 2. 菜单
  if (hash === '#menu') {
    if (topModal && topModal.id === 'menuModalOverlay') return;

    // 关闭遮挡菜单的动态窗口
    if (topModal && topModal.getAttribute('data-dynamic') === 'true') {
      topModal.classList.remove('active');
      setTimeout(() => topModal.remove(), 300);
    }

    updateVersionTextInMenu();
    let maxZ = 1300;
    document.querySelectorAll('.modal-overlay').forEach(el => {
      const z = parseInt(window.getComputedStyle(el).zIndex) || 1300;
      if (z > maxZ) maxZ = z;
    });

    elements.menuModal.classList.add('active');
    elements.menuModal.style.zIndex = maxZ + 1;
    document.body.style.overflow = 'hidden';
    setPageTitle("WearStore - 菜单");
    return;
  }

  // 3. 应用详情
  if (hash.startsWith('#app=')) {
    const rawValue = hash.substring(5);
    const parts = rawValue.split('+');
    const pkgName = parts[0];
    const verStr = parts.length > 1 ? decodeURIComponent(parts[1]) : '';
    const codeStr = parts.length > 2 ? parts[2] : '';

    // 顶层匹配检查
    if (topModal && topModal.getAttribute('data-package') === pkgName) {
      const currentCode = topModal.getAttribute('data-code');
      const currentVer = topModal.getAttribute('data-version');
      if (codeStr && currentCode === codeStr && verStr && currentVer === verStr) return;
      if (!codeStr && !verStr) return;
    }

    // 回退检查
    if (activeModals.length > 1) {
      const prevModal = activeModals[activeModals.length - 2];
      const prevPkg = prevModal.getAttribute('data-package');
      const prevCode = prevModal.getAttribute('data-code');
      const prevVer = prevModal.getAttribute('data-version');

      if (prevPkg === pkgName) {
        if (codeStr && prevCode === codeStr && prevVer === verStr) {
          topModal.classList.remove('active');
          setTimeout(() => topModal.remove(), 300);
          return;
        }
        if (!codeStr) {
          topModal.classList.remove('active');
          setTimeout(() => topModal.remove(), 300);
          return;
        }
      }
    }

    const target = findAppByPrecision(allApps, pkgName, verStr, codeStr);
    if (target) {
      renderAppModal(target);
      setPageTitle(`WearStore上的 ${target.name}`);
    }
    return;
  }

  // 4. 列表 (#list=)
  if (decodedHash.startsWith('#list=')) {
    const type = hash.split('=')[1];
    // 检查防重：如果顶层已经是这个分类列表
    const title = type === 'new' ? "最新上架" : "最近更新";
    if (topModal && topModal.getAttribute('data-type') === 'category' && topModal.getAttribute('data-name') === title) return;

    if (type === 'new') {
      openNewArrivals();
      setPageTitle("最新上架");
    }
    if (type === 'recent') {
      openRecentUpdates();
      setPageTitle("最近更新");
    }
    return;
  }

  // 5. 分类 (#category=)
  if (decodedHash.startsWith('#category=')) {
    const key = hash.split('=')[1];
    const catName = getCategoryByHash(key);

    if (topModal && topModal.getAttribute('data-type') === 'category' && topModal.getAttribute('data-name') === catName) return;

    if (catName) {
      const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
      const filtered = allApps.filter(a => {
        const appCat = a.category && a.category.trim() !== "" ? a.category : "其他";
        return appCat === catName && isAppCompatible(a, userApi);
      });
      renderCategoryModal(catName, filtered);
      setPageTitle(`${catName}`);
    }
    return;
  }

  // 6. 开发者 (#dev=)
  if (decodedHash.startsWith('#dev=')) {
    const paramsStr = decodedHash.substring(5);
    const parts = paramsStr.split('&type=');
    const name = parts[0];
    const type = parts[1] || 'original';

    // 检查防重 (data-name)
    if (topModal && topModal.getAttribute('data-type') === 'dev' && topModal.getAttribute('data-dev-name') === name) {
      return;
    }

    let filteredApps = [];
    if (type === 'mod') {
      filteredApps = allApps.filter(a => a.modAuthor === name || a.developer === name);
    } else {
      filteredApps = allApps.filter(a => a.developer === name && !a.modAuthor);
    }

    renderDevModal(name, filteredApps);
    setPageTitle(`${name} 的所有应用`);
    return;
  }

  // 7. 历史版本 (#history=)
  if (hash.startsWith('#history=')) {
    const rawValue = hash.substring(9);
    // 分离 包名 和 ID (如果有的话)
    const parts = rawValue.split('+');
    const pkgName = parts[0];
    const appId = parts.length > 1 ? parts[1] : null;

    // 检查防重：如果顶层已经是该应用的历史窗口，则不重复打开
    if (topModal &&
      topModal.getAttribute('data-type') === 'history' &&
      topModal.getAttribute('data-package') === pkgName) {
      return;
    }

    // 查找应用：优先通过 ID 找，找不到再通过包名找
    let app = null;
    if (appId) {
      app = allApps.find(a => String(a.id) === appId);
    }
    if (!app) {
      app = allApps.find(a => a.package === pkgName);
    }

    if (app) {
      // 只有找到了应用，才执行打开窗口函数
      openHistoryModal(app);
      setPageTitle(`${app.name} 的历史版本`);
    } else {
      console.error("未找到对应的应用数据，无法打开历史版本");
    }
    return;
  }
}

function openNewArrivals() {
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  let sorted = [...allApps].filter(a => isAppCompatible(a, userApi));
  sorted.sort((a, b) => (b.addedTime || 0) - (a.addedTime || 0));
  renderCategoryModal("最新上架", sorted.slice(0, 15));
}

function openRecentUpdates() {
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  let sorted = [...allApps].filter(a => isAppCompatible(a, userApi));
  sorted.sort((a, b) => {
    const dateA = new Date(a.updateTime || 0);
    const dateB = new Date(b.updateTime || 0);
    return dateB - dateA;
  });
  renderCategoryModal("最近更新", sorted.slice(0, 15));
}

function showSuggestions(term) {
  if (!term) {
    elements.searchSuggestions.innerHTML = '';
    elements.searchSuggestions.classList.remove('active');
    return;
  }

  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  const query = term.toLowerCase();

  // 1. 执行 Fuse 搜索
  const fuseResults = fuse.search(term);

  // 2. 同样的过滤逻辑：剔除无关项
  const filtered = fuseResults.filter(r => {
    const name = (r.item.name || "").toLowerCase();

    // 安全处理关键词
    let keywordsStr = "";
    const rawKeywords = r.item.keywords;
    if (typeof rawKeywords === 'string') keywordsStr = rawKeywords.toLowerCase();
    else if (Array.isArray(rawKeywords)) keywordsStr = rawKeywords.join(' ').toLowerCase();

    // 只有名字包含、关键词包含或分数极高的才显示
    return name.includes(query) || keywordsStr.includes(query) || r.score < 0.1;
  });

  // 3. 同样的排序逻辑：名字包含 > 其他
  filtered.sort((a, b) => {
    const aNameIn = (a.item.name || "").toLowerCase().includes(query);
    const bNameIn = (b.item.name || "").toLowerCase().includes(query);

    if (aNameIn && !bNameIn) return -1;
    if (!aNameIn && bNameIn) return 1;

    return a.score - b.score;
  });

  // 4. 映射数据并过滤兼容性，取前 5 条
  const matches = filtered
    .map(r => r.item)
    .filter(a => isAppCompatible(a, userApi))
    .slice(0, 5);

  if (matches.length === 0) {
    elements.searchSuggestions.classList.remove('active');
    return;
  }

  // 5. 渲染联想列表
  elements.searchSuggestions.innerHTML = matches.map(app => `
        <div class="suggestion-item" data-package="${app.package}" data-id="${app.id}">
            <img src="${escapeHtml(app.icon)}" class="suggestion-icon" onerror="handleImgError(this)">
            <div class="suggestion-info">
                <span class="suggestion-name">${escapeHtml(app.name)}</span>
                <span class="suggestion-dev">${escapeHtml(app.developer || '未知开发者')}</span>
            </div>
        </div>
    `).join('');
  elements.searchSuggestions.classList.add('active');

  // 6. 绑定点击事件
  Array.from(elements.searchSuggestions.children).forEach(el => {
    el.onclick = () => {
      const pkg = el.getAttribute('data-package');
      const id = el.getAttribute('data-id');
      const app = allApps.find(a => a.id == id);
      if (app) {
        const code = app.code ? app.code : '0';
        const ver = app.version ? encodeURIComponent(app.version) : 'unknown';
        window.location.hash = `app=${pkg}+${ver}+${code}`;
        elements.searchSuggestions.classList.remove('active');
        elements.searchInput.value = app.name;
        if (elements.clearSearchBtn) elements.clearSearchBtn.style.display = 'block';
      }
    };
  });
}

function performSearch(term) {
  if (!term || typeof term !== 'string') term = elements.searchInput.value.trim();
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;

  if (!term) {
    renderRandomHome();
    return;
  }

  let fuseResults = fuse.search(term);

  const allFoundResults = fuseResults.filter(r => {
    const query = term.toLowerCase();
    const name = (r.item.name || "").toLowerCase();

    let kwStr = "";
    if (typeof r.item.keywords === 'string') kwStr = r.item.keywords.toLowerCase();
    else if (Array.isArray(r.item.keywords)) kwStr = r.item.keywords.join(' ').toLowerCase();

    return name.includes(query) || kwStr.includes(query) || r.score < 0.4;
  });

  if (allFoundResults.length === 0) {
    renderCardList([], elements.container);
    return;
  }

  // 3. 排序：精准包含 > 模糊匹配
  allFoundResults.sort((a, b) => {
    const query = term.toLowerCase();
    const aIn = (a.item.name || "").toLowerCase().includes(query);
    const bIn = (b.item.name || "").toLowerCase().includes(query);

    if (aIn && !bIn) return -1;
    if (!aIn && bIn) return 1;
    return a.score - b.score;
  });

  // 4. 将搜索到的结果（包含不兼容的）映射为应用对象数组
  const allAppsFound = allFoundResults.map(r => r.item);

  // 5. 分离兼容和不兼容的应用
  const compatible = allAppsFound.filter(app => isAppCompatible(app, userApi));

  if (compatible.length > 0) {
    renderCardList(compatible, elements.container);
  } else {
    const topApp = allAppsFound[0];
    const nameStr = (topApp.name || "").toLowerCase();
    const termStr = term.toLowerCase();

    const isIncluded = nameStr.includes(termStr);
    const matchRatio = termStr.length / nameStr.length;

    if (isIncluded && matchRatio >= 0.5) {
      renderIncompatibleCard(topApp, elements.container);
    } else {
      renderCardList([], elements.container);
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
      const hashKey = categoryHash[cat] || 'other';
      window.location.hash = `category=${hashKey}`;
    };
    elements.menuCategoryGrid.appendChild(btn);
  });
}

function renderRandomHome() {
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  const MUST_SHOW_ID = 1287852515; // 你指定的应用 ID

  if (!homeAppsCache) {
    // 1. 获取所有当前版本兼容的应用
    let allVisible = allApps.filter(a => isAppCompatible(a, userApi));

    // 2. 尝试从兼容列表中找到这个指定应用
    const targetIdx = allVisible.findIndex(a => a.id == MUST_SHOW_ID);
    let targetApp = null;
    let otherApps = [...allVisible];

    if (targetIdx !== -1) {
      // 如果找到了（且兼容），将其从数组中取出，不参与随机打乱
      targetApp = otherApps.splice(targetIdx, 1)[0];
    }

    // 3. 对剩下的应用进行随机洗牌
    otherApps.sort(() => 0.5 - Math.random());

    // 4. 截取前 29 个（为指定应用腾出一个位置）
    let result = otherApps.slice(0, 29);

    // 5. 将指定应用插入到第 3 个位置 (数组索引为 2)
    if (targetApp) {
      // 如果结果数组长度至少有 2 个，插在索引 2；否则插在末尾
      const insertPos = Math.min(2, result.length);
      result.splice(insertPos, 0, targetApp);
    }

    homeAppsCache = result;
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

function openDevWindow(detail) { }

init();