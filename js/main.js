import { fetchApps } from './data.js';
import { renderCardList, renderAppModal, renderIncompatibleCard, openHistoryModal, renderDevModal, renderCategoryModal, renderMenuModal } from './ui.js';
import { isAppGloballyCompatible, apiMap, escapeHtml, categoryHash, getCategoryByHash, findAppByPrecision, setPageTitle, calculateMatchRatio } from './utils.js';
import Fuse from './fuse.mjs';

const elements = {
  container: document.getElementById('cardsContainer'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  searchSuggestions: document.getElementById('searchSuggestions'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  menuBtn: document.getElementById('menuBtn'),
  welcomeModal: document.getElementById('welcomeModalOverlay'),
  versionGrid: document.getElementById('versionGrid'),
};

let allApps = [];
let fuse;
let homeAppsCache = null;

async function init() {
  initTheme();
  allApps = await fetchApps();
  window.allApps = allApps;
  initFuse();
  bindEvents();
  checkHashLink();
  checkUserVersion(); // 初始化版本按钮
  if (!window.location.hash && elements.searchInput.value === '') renderRandomHome();
}

function initFuse() {
  const options = {
    includeScore: true, threshold: 0.3, location: 0, distance: 100, ignoreLocation: true,
    keys: [{ name: 'name', weight: 1.0 }, { name: 'keywords', weight: 0.7 }]
  };
  fuse = new Fuse(allApps, options);
}

function bindEvents() {
  if (elements.searchBtn) elements.searchBtn.onclick = performSearch;
  if (elements.searchInput) {
    elements.searchInput.onkeyup = (e) => { if (e.key === 'Enter') { elements.searchSuggestions.classList.remove('active'); performSearch(); } };
    elements.searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val.trim().length > 0) elements.clearSearchBtn.style.display = 'block';
      else { elements.clearSearchBtn.style.display = 'none'; renderRandomHome(); }
      showSuggestions(val.trim());
    });
  }
  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.onclick = (e) => {
      e.preventDefault(); elements.searchInput.value = ''; elements.clearSearchBtn.style.display = 'none';
      elements.searchSuggestions.classList.remove('active'); renderRandomHome(); window.location.hash = '';
    };
  }
  if (elements.menuBtn) elements.menuBtn.onclick = () => { window.location.hash = 'menu'; };
  document.addEventListener('click', (e) => { if (!e.target.closest('.search-container')) elements.searchSuggestions.classList.remove('active'); });
  window.addEventListener('hashchange', checkHashLink);
}

function checkHashLink() {
  const hash = window.location.hash;
  const decodedHash = decodeURIComponent(hash);

  const activeModals = Array.from(document.querySelectorAll('.modal-overlay[data-dynamic="true"]'))
    .sort((a, b) => (parseInt(window.getComputedStyle(a).zIndex) || 0) - (parseInt(window.getComputedStyle(b).zIndex) || 0));

  if (!hash || hash === '#') {
    closeAllModalsForce();
    const searchTerm = elements.searchInput.value.trim();
    if (searchTerm !== "") {
      performSearch(searchTerm);
      setPageTitle(`搜索: ${searchTerm}`);
    } else {
      renderRandomHome();
      setPageTitle("WearStore - 发现心动的手表软件");
    }
    return;
  }

  // 🔥 核心修复：智能堆栈逻辑（增加对 #list= 的支持）
  const existingModal = activeModals.find(m => {
    if (hash === '#menu') return m.getAttribute('data-type') === 'menu';

    // 处理分类页
    if (decodedHash.startsWith('#category=')) {
      const catName = getCategoryByHash(hash.split('=')[1]);
      return m.getAttribute('data-type') === 'category' && m.getAttribute('data-name') === catName;
    }

    if (decodedHash.startsWith('#list=')) {
      const type = hash.split('=')[1];
      const listTitle = (type === 'new') ? "最新上架" : "最近更新";
      return m.getAttribute('data-type') === 'category' && m.getAttribute('data-name') === listTitle;
    }

    // 处理应用详情
    if (hash.startsWith('#app=')) {
      const parts = hash.substring(5).split('+');
      return m.getAttribute('data-package') === parts[0] &&
        m.getAttribute('data-version') === decodeURIComponent(parts[1] || 'unknown') &&
        m.getAttribute('data-code') === (parts[2] || '0') &&
        m.getAttribute('data-type') !== 'history';
    }

    // 处理开发者和历史记录
    if (decodedHash.startsWith('#dev=')) {
      const devName = decodedHash.substring(5).split('&type=')[0];
      return m.getAttribute('data-type') === 'dev' && m.getAttribute('data-dev-name') === devName;
    }
    if (hash.startsWith('#history=')) {
      return m.getAttribute('data-type') === 'history' && m.getAttribute('data-package') === hash.split('=')[1].split('+')[0];
    }
    return false;
  });

  if (existingModal) {
    const idx = activeModals.indexOf(existingModal);
    for (let i = activeModals.length - 1; i > idx; i--) {
      const el = activeModals[i];
      el.classList.remove('active');
      setTimeout(() => el.remove(), 300);
    }
    existingModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    return; // 找到了就不再重新渲染，保留滚动位置
  }

  // --- 以下为渲染新页面的逻辑 ---
  if (hash === '#menu') {
    const categories = Array.from(new Set(allApps.map(app => app.category || "其他"))).sort();
    renderMenuModal(categories);
    setPageTitle("WearStore - 菜单");
  }
  else if (hash.startsWith('#app=')) {
    const parts = hash.substring(5).split('+');
    const target = findAppByPrecision(allApps, parts[0], parts[1], parts[2]);
    if (target) {
      renderAppModal(target);
      setPageTitle(`WearStore - ${target.name}`);
    }
  }
  // 列表页 (最新/更新)
  else if (decodedHash.startsWith('#list=')) {
    const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
    const type = hash.split('=')[1];
    let sorted = allApps.filter(a => isAppGloballyCompatible(a, userApi));
    if (type === 'new') {
      sorted.sort((a, b) => (b.addedTime || 0) - (a.addedTime || 0));
      renderCategoryModal("最新上架", sorted.slice(0, 15));
    } else {
      sorted.sort((a, b) => new Date(b.updateTime || 0) - new Date(a.updateTime || 0));
      renderCategoryModal("最近更新", sorted.slice(0, 15));
    }
  }
  else if (decodedHash.startsWith('#category=')) {
    const catName = getCategoryByHash(hash.split('=')[1]);
    if (catName) {
      const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
      const filtered = allApps.filter(a => (a.category || "其他") === catName && isAppGloballyCompatible(a, userApi));
      renderCategoryModal(catName, filtered);
      setPageTitle(catName);
    }
  }
  else if (decodedHash.startsWith('#dev=')) {
    const name = decodedHash.substring(5).split('&type=')[0];
    const type = decodedHash.includes('&type=mod') ? 'mod' : 'original';
    renderDevModal(name, type === 'mod' ? allApps.filter(a => a.modAuthor === name || a.developer === name) : allApps.filter(a => a.developer === name && !a.modAuthor));
  }
  else if (hash.startsWith('#history=')) {
    const parts = hash.split('=')[1].split('+');
    let app = allApps.find(a => String(a.id) === parts[1]) || allApps.find(a => a.package === parts[0]);
    if (app) openHistoryModal(app);
  }
}

function performSearch(term) {
  if (!term || typeof term !== 'string') term = elements.searchInput.value.trim();
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  if (!term) { renderRandomHome(); return; }
  let fuseResults = fuse.search(term);
  const candidates = fuseResults.filter(r => r.score < 0.5 || r.item.name.toLowerCase().includes(term.toLowerCase()));
  if (candidates.length === 0) { renderCardList([], elements.container); return; }
  candidates.sort((a, b) => {
    const query = term.toLowerCase();
    const aMatch = a.item.name.toLowerCase().includes(query), bMatch = b.item.name.toLowerCase().includes(query);
    if (aMatch && !bMatch) return -1; if (!aMatch && bMatch) return 1;
    if (aMatch && bMatch) return (query.length / b.item.name.length) - (query.length / a.item.name.length);
    return a.score - b.score;
  });
  const sorted = candidates.map(r => r.item), topApp = sorted[0], ratio = calculateMatchRatio(term, topApp.name);
  if (!isAppGloballyCompatible(topApp, userApi) && ratio >= 0.6) { renderIncompatibleCard(topApp, elements.container); return; }
  renderCardList(sorted.filter(app => isAppGloballyCompatible(app, userApi)), elements.container);
}

function showSuggestions(term) {
  if (!term) { elements.searchSuggestions.innerHTML = ''; elements.searchSuggestions.classList.remove('active'); return; }
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0, query = term.toLowerCase();
  const filtered = fuse.search(term).filter(r => {
    const name = (r.item.name || "").toLowerCase();
    let kw = typeof r.item.keywords === 'string' ? r.item.keywords.toLowerCase() : (Array.isArray(r.item.keywords) ? r.item.keywords.join(' ').toLowerCase() : "");
    return name.includes(query) || kw.includes(query) || r.score < 0.1;
  }).sort((a, b) => {
    const aIn = (a.item.name || "").toLowerCase().includes(query), bIn = (b.item.name || "").toLowerCase().includes(query);
    if (aIn && !bIn) return -1; if (!aIn && bIn) return 1; return a.score - b.score;
  });
  const matches = filtered.map(r => r.item).filter(a => isAppGloballyCompatible(a, userApi)).slice(0, 5);
  if (matches.length === 0) { elements.searchSuggestions.classList.remove('active'); return; }
  elements.searchSuggestions.innerHTML = matches.map(app => `
    <div class="suggestion-item" onclick="window.location.hash='app=${app.package}+${encodeURIComponent(app.version || 'unknown')}+${app.code || 0}'">
        <img src="${escapeHtml(app.icon)}" class="suggestion-icon" onerror="handleImgError(this)">
        <div class="suggestion-info"><span class="suggestion-name">${escapeHtml(app.name)}</span><span class="suggestion-dev">${escapeHtml(app.developer || '未知开发者')}</span></div>
    </div>`).join('');
  elements.searchSuggestions.classList.add('active');
}

function renderRandomHome() {
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  const MUST_SHOW_ID = 1287852515; // 始终展示的应用 ID

  if (!homeAppsCache) {
    // 1. 过滤掉该 API 系统下完全无法运行的应用
    let allVisible = allApps.filter(a => isAppGloballyCompatible(a, userApi));

    // 2. 尝试从列表中找出这个“必须展示”的应用
    const targetIdx = allVisible.findIndex(a => String(a.id) === String(MUST_SHOW_ID));
    let targetApp = null;
    let otherApps = [...allVisible];

    if (targetIdx !== -1) {
      // 如果找到了，先把它从“随机池”里抽出来，防止它重复出现
      targetApp = otherApps.splice(targetIdx, 1)[0];
    }

    // 3. 将剩下的应用打乱顺序
    otherApps.sort(() => 0.5 - Math.random());

    // 4. 截取前 29 个位置
    let result = otherApps.slice(0, 29);

    // 5. 将特定应用插入到第 3 个位置（即数组索引 2）
    if (targetApp) {
      // 如果列表长度不足 2，就插在最后；否则插在索引 2
      const insertPos = Math.min(2, result.length);
      result.splice(insertPos, 0, targetApp);
    }

    homeAppsCache = result;
  }

  // 执行渲染
  renderCardList(homeAppsCache, elements.container);
}

function closeAllModalsForce() {
  document.querySelectorAll('.modal-overlay[data-dynamic="true"]').forEach(m => { m.classList.remove('active'); setTimeout(() => m.remove(), 300); });
  if (elements.welcomeModal) elements.welcomeModal.classList.remove('active');
  document.body.style.overflow = '';
}

function initTheme() {
  const saved = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', saved);
}

function checkUserVersion() {
  const savedApi = localStorage.getItem('userApiLevel');
  elements.versionGrid.innerHTML = '';
  for (let i = 14; i <= 36; i++) {
    const btn = document.createElement('div');
    btn.className = `version-btn ${savedApi == i ? 'selected' : ''}`;
    btn.innerHTML = `Android ${apiMap[i] || '?'}<span class="api-tag">API ${i}</span>`;
    btn.onclick = () => {
      // 1. 存储并重置缓存
      localStorage.setItem('userApiLevel', i);
      homeAppsCache = null;

      // 2. 更新选中样式 (立即反馈)
      Array.from(elements.versionGrid.children).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      // 3. 更新界面文字 (包括菜单里的安卓版本文字)
      const menuVerText = document.querySelector('#menuVer .menu-action-sub');
      if (menuVerText) menuVerText.textContent = `Android ${apiMap[i]}`;

      // 4. 关闭欢迎页并刷新内容
      setTimeout(() => {
        elements.welcomeModal.classList.remove('active');
        if (elements.searchInput.value) performSearch(); else renderRandomHome();
        document.body.style.overflow = '';
      }, 200);
    };
    elements.versionGrid.appendChild(btn);
  }
  if (!savedApi) { elements.welcomeModal.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

init();