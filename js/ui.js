import { escapeHtml, isAppGloballyCompatible, getBestMatchVersion, apiMap, DEFAULT_ICON, categoryHash } from './utils.js';

let globalZIndex = 1350;

/**
 * 智能返回/关闭函数
 */
function smartBack() {
  const active = document.querySelectorAll('.modal-overlay[data-dynamic="true"].active');
  if (active.length > 1) history.back();
  else window.location.hash = '';
}

window.handleImgError = function (img) {
  img.onerror = null;
  img.src = DEFAULT_ICON;
  img.classList.add('image-error');
};

/**
 * 创建应用卡片
 */
export function createCard(app) {
  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  const bestData = getBestMatchVersion(app, userApi) || app;

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
        <img src="${escapeHtml(app.icon)}" class="card-icon" onerror="handleImgError(this)">
        <div class="card-content">
            <div class="card-title">${escapeHtml(app.name)}</div>
            <div class="card-dev-name">${escapeHtml(app.developer || '未知开发者')}</div>
        </div>
        <span class="material-symbols-rounded card-action-icon color-primary">arrow_forward</span>`;

  card.onclick = () => {
    window.location.hash = `app=${app.package}+${encodeURIComponent(bestData.version || 'unknown')}+${bestData.code || 0}`;
  };
  return card;
}

export function renderDevModal(title, appsList) { createWindow(title, appsList, 'dev', 'data-dev-name'); }
export function renderCategoryModal(title, appsList) { createWindow(title, appsList, 'category', 'data-name'); }

function createWindow(title, list, type, attr) {
  let maxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => maxZ = Math.max(maxZ, parseInt(window.getComputedStyle(el).zIndex) || 1300));
  const m = document.createElement('div');
  m.className = 'modal-overlay'; m.style.zIndex = maxZ + 10;
  m.setAttribute('data-type', type); m.setAttribute(attr, title); m.setAttribute('data-dynamic', 'true');
  m.innerHTML = `<div class="modal"><div class="dev-modal-layout"><div class="window-header"><span>${escapeHtml(title)}</span><span class="material-symbols-rounded header-close-img">close</span></div><div class="dev-content"><div class="cards-grid"></div></div></div></div>`;
  const container = m.querySelector('.cards-grid');
  if (list.length === 0) container.innerHTML = '<div class="no-result-tip">暂无应用</div>';
  else list.forEach(app => container.appendChild(createCard(app)));
  m.querySelector('.header-close-img').onclick = () => smartBack();
  document.body.appendChild(m); document.body.style.overflow = 'hidden';
  setTimeout(() => m.classList.add('active'), 10);
}

export function openHistoryModal(rootApp) {
  let all = [{ ...rootApp, isSpecificVersion: true }];
  if (rootApp.historyVersion) rootApp.historyVersion.forEach(v => all.push({ ...rootApp, ...v, isSpecificVersion: true }));
  all.sort((a, b) => (parseInt(b.code) || 0) - (parseInt(a.code) || 0));
  let maxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => maxZ = Math.max(maxZ, parseInt(window.getComputedStyle(el).zIndex) || 1300));
  const m = document.createElement('div');
  m.className = 'modal-overlay'; m.style.zIndex = maxZ + 10;
  m.setAttribute('data-package', rootApp.package); m.setAttribute('data-type', 'history'); m.setAttribute('data-dynamic', 'true');
  m.innerHTML = `<div class="modal"><div class="dev-modal-layout"><div class="window-header"><span>历史版本</span><span class="material-symbols-rounded header-close-img">close</span></div><div class="dev-content"><div class="simplified-grid"></div></div></div></div>`;
  const container = m.querySelector('.simplified-grid');
  all.forEach(v => {
    const card = document.createElement('div');
    card.className = 'history-simple-card';
    card.innerHTML = `<div class="history-content"><div class="history-name">${escapeHtml(v.name)}</div><div class="history-ver">${escapeHtml(v.version)} (${v.code || 0})</div></div><span class="material-symbols-rounded card-action-icon color-primary">arrow_forward</span>`;
    card.onclick = () => { window.location.hash = `app=${v.package}+${encodeURIComponent(v.version || 'unknown')}+${v.code || 0}`; };
    container.appendChild(card);
  });
  m.querySelector('.header-close-img').onclick = () => smartBack();
  document.body.appendChild(m); document.body.style.overflow = 'hidden';
  setTimeout(() => m.classList.add('active'), 10);
}

export function renderMenuModal(categories) {
  let maxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => maxZ = Math.max(maxZ, parseInt(window.getComputedStyle(el).zIndex) || 1300));
  const m = document.createElement('div');
  m.className = 'modal-overlay'; m.style.zIndex = maxZ + 10; m.setAttribute('data-type', 'menu'); m.setAttribute('data-dynamic', 'true');

  const catConfig = { "系统工具": { icon: "build", color: "color-slate" }, "效率办公": { icon: "work", color: "color-blue" }, "健康运动": { icon: "fitness_center", color: "color-red" }, "通讯社交": { icon: "forum", color: "color-green" }, "影音娱乐": { icon: "movie", color: "color-purple" }, "学习充电": { icon: "school", color: "color-orange" }, "生活服务": { icon: "storefront", color: "color-cyan" }, "休闲游戏": { icon: "sports_esports", color: "color-pink" }, "表盘美化": { icon: "watch", color: "color-indigo" }, "其他": { icon: "more_horiz", color: "color-normal" } };
  const api = localStorage.getItem('userApiLevel'), apiText = api && apiMap[api] ? `Android ${apiMap[api]}` : '点击选择';
  const curTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const themeIcon = curTheme === 'dark' ? 'brightness_5' : 'dark_mode', themeLabel = curTheme === 'dark' ? '浅色模式' : '深色模式', themeColor = curTheme === 'dark' ? 'color-normal' : 'color-gold';

  m.innerHTML = `<div class="modal"><div class="menu-modal-layout"><div class="window-header"><span>菜单</span><span class="material-symbols-rounded header-close-img">close</span></div><div class="menu-content"><div class="menu-top-grid"><div id="menuVer" class="menu-action-card"><span class="material-symbols-rounded menu-action-icon color-primary">android</span><div class="menu-action-text-group"><span class="menu-action-label">安卓版本</span><span class="menu-action-sub">${apiText}</span></div></div><div id="menuTheme" class="menu-action-card"><span class="material-symbols-rounded menu-action-icon ${themeColor}">${themeIcon}</span><div class="menu-action-text-group"><span class="menu-action-label">${themeLabel}</span><span class="menu-action-sub">切换视觉风格</span></div></div><div class="menu-action-card" onclick="window.location.hash='list=new'"><span class="material-symbols-rounded menu-action-icon color-gold">new_releases</span><div class="menu-action-text-group"><span class="menu-action-label">最新上架</span><span class="menu-action-sub">查看新入库</span></div></div><div class="menu-action-card" onclick="window.location.hash='list=recent'"><span class="material-symbols-rounded menu-action-icon color-blue">update</span><div class="menu-action-text-group"><span class="menu-action-label">最近更新</span><span class="menu-action-sub">查看版本升级</span></div></div><div class="menu-action-card" onclick="window.open('https://wj.qq.com/s2/25513095/8cde/', '_blank')"><span class="material-symbols-rounded menu-action-icon color-purple">rate_review</span><div class="menu-action-text-group"><span class="menu-action-label">综合服务</span><span class="menu-action-sub">软件提交/举报侵权/意见反馈</span></div></div></div><div class="menu-separator"></div><div class="menu-category-grid"></div></div></div></div>`;
  const catGrid = m.querySelector('.menu-category-grid');
  categories.forEach(cat => {
    const config = catConfig[cat] || { icon: "folder", color: "color-normal" };
    const btn = document.createElement('div');
    btn.className = 'category-btn-new';
    btn.innerHTML = `<span class="material-symbols-rounded category-icon-img ${config.color}">${config.icon}</span><span class="category-text">${escapeHtml(cat)}</span>`;
    btn.onclick = () => { window.location.hash = `category=${categoryHash[cat] || 'other'}`; };
    catGrid.appendChild(btn);
  });
  m.querySelector('.header-close-img').onclick = () => smartBack();
  m.querySelector('#menuVer').onclick = () => { const w = document.getElementById('welcomeModalOverlay'); w.style.zIndex = parseInt(m.style.zIndex) + 10; w.classList.add('active'); };
  m.querySelector('#menuTheme').onclick = () => { const next = curTheme === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next); localStorage.setItem('theme', next); m.remove(); renderMenuModal(categories); };
  document.body.appendChild(m); document.body.style.overflow = 'hidden';
  setTimeout(() => m.classList.add('active'), 10);
}

export function renderAppModal(app) {
  let maxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => maxZ = Math.max(maxZ, parseInt(window.getComputedStyle(el).zIndex) || 1300));

  const m = document.createElement('div');
  m.className = 'modal-overlay';
  m.style.zIndex = maxZ + 2;
  m.setAttribute('data-package', app.package);
  m.setAttribute('data-dynamic', 'true');

  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  // 获取当前 API 下该 App 的最佳匹配版本
  let data = app.isSpecificVersion ? app : (getBestMatchVersion(app, userApi) || app);

  m.setAttribute('data-version', data.version || 'unknown');
  m.setAttribute('data-code', data.code || '0');

  const isCompat = !userApi || userApi >= parseInt(data.minSdk || 0);

  // 开发者显示逻辑
  const getAuthorHtml = (n, t) => {
    const dn = n ? escapeHtml(n).trim() : '未知开发者';
    if (!n || dn === '未知开发者' || dn === '') return `<span style="color:var(--text-secondary); cursor:default;">未知开发者</span>`;
    return `<span class="author-link" data-name="${dn}" data-type="${t}">${dn}</span>`;
  };

  // 1. 顶部 Header 部分 (图标 + 软件信息 + 关闭)
  const headerHtml = `
        <div class="modal-new-header">
            <img class="modal-new-icon" src="${escapeHtml(app.icon)}" onerror="handleImgError(this)">
            <div class="modal-new-info">
                <div class="modal-new-title">${escapeHtml(app.name)}</div>
                <div class="modal-new-dev">${app.modAuthor ? getAuthorHtml(app.developer, 'original') + ' <span style="font-size:0.8em; font-weight:normal;">(由 ' + getAuthorHtml(app.modAuthor, 'mod') + ' 修改)</span>' : getAuthorHtml(app.developer, 'original')}</div>
            </div>
            <button class="btn-close-new"><span class="material-symbols-rounded">close</span></button>
        </div>
    `;

  // 2. 不兼容信息 (修复文字内容)
  const reqVer = apiMap[data.minSdk] || data.minSdk;
  const warningHtml = !isCompat ? `<div class="modal-warning-row"><div class="compat-warning-box">此应用无法在您的手表上使用，您需要 Android ${reqVer}+才能使用此应用。</div></div>` : '';

  // 3. 操作栏 (下载按钮、密码、手机配套、分享)
  const hasUrl = data.downloadUrl && data.downloadUrl.trim() !== "";
  const downloadBtnHtml = hasUrl
    ? `<div class="btn-download-rect" id="dlBtn"><span class="material-symbols-rounded">download</span><span>下载</span></div>`
    : `<div class="btn-download-rect" id="dlBtn" style="background:var(--input-border); color:var(--text-secondary); cursor:not-allowed; box-shadow:none; opacity:0.7;"><span class="material-symbols-rounded">block</span><span>暂无下载链接</span></div>`;

  const actionBarHtml = `
        <div class="modal-action-bar">
            ${downloadBtnHtml}
            ${data.password ? `<div class="password-box" id="pwdBtn" title="点击复制"><span class="material-symbols-rounded" style="font-size:16px">key</span><span>${escapeHtml(data.password)}</span></div>` : ''}
            ${app.phoneLink ? `<div class="btn-icon-square" id="phBtn" title="手机配套应用"><span class="material-symbols-rounded">smartphone</span></div>` : ''}
            ${(app.historyVersion && app.historyVersion.length > 0) ? `<div class="btn-icon-square" id="hiBtn" title="历史版本"><span class="material-symbols-rounded">history</span></div>` : ''}
            <div class="btn-icon-square" id="shBtn" title="分享链接"><span class="material-symbols-rounded">share</span></div>
        </div>
    `;

  // 4. 推荐应用 (您可能喜欢的应用)
  let recommendHtml = '';
  if (window.allApps) {
    let targetApps = [];
    if (app.recommendIds) targetApps = window.allApps.filter(a => app.recommendIds.includes(a.id));
    else if (app.recommendPackage) targetApps = window.allApps.filter(a => a.package === app.recommendPackage && a.id !== app.id);

    if (targetApps.length > 0) {
      recommendHtml = `<div class="recommend-container"><div class="recommend-header-styled"><span class="material-symbols-rounded">info</span><span>您可能喜欢的应用</span></div>`;
      targetApps.forEach((t, idx) => {
        recommendHtml += `
        <div class="recommend-card recommend-click-item" data-target-id="${t.id}">
            <img src="${escapeHtml(t.icon)}" class="recommend-app-icon" onerror="handleImgError(this)">
            <div class="recommend-content">
                <!-- 第一行：应用名称 -->
                <div class="recommend-title">${escapeHtml(t.name)}</div>
                <!-- 第二行：应用大小 -->
                <div class="recommend-size">${escapeHtml(t.size || '未知大小')}</div>
                <!-- 第三行：查看按钮 -->
                <div class="recommend-link">查看</div>
            </div>
        </div>
    `;
        if (idx < targetApps.length - 1) recommendHtml += `<div class="recommend-divider"></div>`;
      });
      recommendHtml += `</div>`;
    }
  }

  // 5. 投稿人
  const contributorHtml = app.contributor ? `<div class="contributor-card"><span class="material-symbols-rounded" style="font-size:20px; color:#ef4444;">favorite</span><span style="font-size:0.9rem; color:var(--text-secondary);">投稿人：</span><span style="font-size:0.95rem; font-weight:600;">${escapeHtml(app.contributor)}</span></div>` : '';

  // 6. 应用截图
  const screenshotsHtml = (app.screenshots || []).map(src => `<img src="${escapeHtml(src)}" class="screenshot" loading="lazy" onerror="handleImgError(this)">`).join('');

  // --- 组装模态框 ---
  m.innerHTML = `
        <div class="modal">
            <div class="modal-fixed-top">
                ${headerHtml}
                ${warningHtml}
                ${actionBarHtml}
            </div>
            <div class="modal-content">
                ${recommendHtml}
                ${contributorHtml}
                
                <div class="section-title">应用简介</div>
                <p class="app-description">${escapeHtml(app.description || '暂无描述')}</p>

                <div class="section-title">详细信息</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">版本</span><span class="detail-value">${escapeHtml(data.version)} (${data.code || 0})</span></div>
                    <div class="detail-item"><span class="detail-label">大小</span><span class="detail-value">${escapeHtml(data.size || '未知')}</span></div>
                    <div class="detail-item"><span class="detail-label">最低兼容</span><span class="detail-value">Android ${apiMap[data.minSdk] || data.minSdk}+</span></div>
                    <div class="detail-item"><span class="detail-label">分类</span><span class="detail-value">${escapeHtml(app.category || '应用')}</span></div>
                    <div class="detail-item" style="grid-column: 1 / -1;"><span class="detail-label">包名</span><span class="detail-value" style="font-size:0.8rem; word-break:break-all;">${app.package}</span></div>
                </div>

                <div class="section-title">应用截图</div>
                <div class="screenshots-wrapper">
                    <button class="scroll-btn left"><span class="material-symbols-rounded">chevron_left</span></button>
                    <div class="screenshots-container">${screenshotsHtml || '<span style="color:var(--text-secondary);font-size:0.9rem;">暂无截图</span>'}</div>
                    <button class="scroll-btn right"><span class="material-symbols-rounded">chevron_right</span></button>
                </div>
            </div>
        </div>
    `;

  // 事件绑定逻辑
  m.querySelector('.btn-close-new').onclick = () => smartBack();
  if (hasUrl) m.querySelector('#dlBtn').onclick = () => window.open(data.downloadUrl, '_blank');
  if (data.password) m.querySelector('#pwdBtn').onclick = () => { navigator.clipboard.writeText(data.password); showToast('密码已复制'); };
  if (app.phoneLink) m.querySelector('#phBtn').onclick = () => window.open(app.phoneLink, '_blank');
  if (m.querySelector('#hiBtn')) m.querySelector('#hiBtn').onclick = () => { window.location.hash = `history=${app.package}+${app.id}`; };
  m.querySelector('#shBtn').onclick = () => { navigator.clipboard.writeText(window.location.href); showToast('链接已复制'); };
  m.querySelectorAll('.author-link').forEach(link => {
    link.onclick = (e) => { e.stopPropagation(); window.location.hash = `dev=${encodeURIComponent(link.dataset.name)}${link.dataset.type === 'mod' ? '&type=mod' : ''}`; };
  });
  m.querySelectorAll('.recommend-click-item').forEach(item => {
    item.onclick = () => {
      const tId = item.getAttribute('data-target-id');
      const tApp = window.allApps.find(a => String(a.id) === tId);
      if (tApp) window.location.hash = `app=${tApp.package}+${encodeURIComponent(tApp.version || 'unknown')}+${tApp.code || 0}`;
    };
  });

  const sc = m.querySelector('.screenshots-container');
  if (app.screenshots && app.screenshots.length > 0) {
    m.querySelector('.scroll-btn.left').onclick = () => sc.scrollBy({ left: -300, behavior: 'smooth' });
    m.querySelector('.scroll-btn.right').onclick = () => sc.scrollBy({ left: 300, behavior: 'smooth' });
  } else {
    m.querySelectorAll('.scroll-btn').forEach(b => b.style.display = 'none');
  }

  document.body.appendChild(m);
  document.body.style.overflow = 'hidden';
  setTimeout(() => m.classList.add('active'), 10);
}

function showToast(msg) {
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `<span class="toast-text">${msg}</span>`;
  const container = document.getElementById('toast-container');
  if (container) {
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2000);
  }
}

export function renderCardList(apps, container) {
  container.innerHTML = '';
  if (apps.length === 0) container.innerHTML = '<div class="no-result-tip">暂无应用</div>';
  else apps.forEach(app => container.appendChild(createCard(app)));
}

export function renderIncompatibleCard(app, container) {
  container.innerHTML = '';
  let sdks = [parseInt(app.minSdk || 999)];
  if (app.historyVersion) app.historyVersion.forEach(v => sdks.push(parseInt(v.minSdk || 999)));
  const minSdk = Math.min(...sdks), req = apiMap[minSdk] || minSdk;
  const card = document.createElement('div');
  card.className = 'incompatible-card';
  card.innerHTML = `<img src="${escapeHtml(app.icon)}" class="incompatible-icon" onerror="handleImgError(this)"><div class="incompatible-content"><div class="incompatible-title">在找“${escapeHtml(app.name)}”吗？</div><div class="incompatible-reason">此应用无法在您的手表上使用，您需要 Android ${req}+才能使用此应用。</div></div>`;
  container.appendChild(card);
}