import { escapeHtml, isAppCompatible, getBestMatchVersion, apiMap, DEFAULT_ICON } from './utils.js';

let globalZIndex = 1350;
const appNavigationStack = [];

window.handleImgError = function (img) {
  img.onerror = null;
  img.src = DEFAULT_ICON;
  img.classList.add('image-error');
};

export function createCard(app, onClickCallback) {
  const card = document.createElement('div');
  card.className = 'card';
  const devText = app.developer ? escapeHtml(app.developer) : '未知开发者';
  card.innerHTML = `
        <img src="${escapeHtml(app.icon)}" class="card-icon" alt="${escapeHtml(app.name)}" loading="lazy" onerror="handleImgError(this)">
        <div class="card-content">
            <div class="card-title">${escapeHtml(app.name)}</div>
            <div class="card-dev-name">${devText}</div>
        </div>
        <span class="material-symbols-rounded card-action-icon color-primary">arrow_forward</span>
    `;
  card.onclick = () => {
    const code = app.code ? app.code : '0';
    const ver = app.version ? encodeURIComponent(app.version) : 'unknown';
    window.location.hash = `app=${app.package}+${ver}+${code}`;
  };
  return card;
}

function createHistoryCard(appVersionData, onClickCallback) {
  const card = document.createElement('div');
  card.className = 'history-simple-card';
  const codeStr = appVersionData.code ? ` (${appVersionData.code})` : '';

  card.innerHTML = `
        <div class="history-content">
            <div class="history-name">${escapeHtml(appVersionData.name)}</div>
            <div class="history-ver">${escapeHtml(appVersionData.version)}${codeStr}</div>
        </div>
        <span class="material-symbols-rounded card-action-icon color-primary">arrow_forward</span>
    `;
  card.onclick = () => onClickCallback(appVersionData);
  return card;
}

// 动态渲染开发者窗口
export function renderDevModal(title, appsList) {
  let maxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => {
    const z = parseInt(window.getComputedStyle(el).zIndex) || 1300;
    if (z > maxZ) maxZ = z;
  });

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.zIndex = maxZ + 10;
  modalOverlay.setAttribute('data-type', 'dev');
  modalOverlay.setAttribute('data-dynamic', 'true');
  modalOverlay.setAttribute('data-dev-name', title);

  modalOverlay.innerHTML = `
    <div class="modal">
      <div class="dev-modal-layout">
        <div class="window-header">
          <span id="devModalTitle">${escapeHtml(title)}</span>
          <span class="material-symbols-rounded unified-close-btn header-close-img">close</span>
        </div>
        <div class="dev-content">
          <div class="cards-grid" id="devAppsContainer_Dynamic"></div>
        </div>
      </div>
    </div>
    `;

  const container = modalOverlay.querySelector('#devAppsContainer_Dynamic');
  if (appsList.length === 0) {
    container.innerHTML = '<div class="no-result-tip">该开发者暂无其他应用</div>';
  } else {
    appsList.forEach(app => {
      const card = createCard(app);
      container.appendChild(card);
    });
  }

  modalOverlay.querySelector('.header-close-img').onclick = () => history.back();

  document.body.appendChild(modalOverlay);
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalOverlay.classList.add('active'), 10);
}

// 动态渲染分类窗口
export function renderCategoryModal(title, appsList) {
  let maxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => {
    const z = parseInt(window.getComputedStyle(el).zIndex) || 1300;
    if (z > maxZ) maxZ = z;
  });

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.zIndex = maxZ + 10;
  modalOverlay.setAttribute('data-type', 'category');
  modalOverlay.setAttribute('data-name', title);
  modalOverlay.setAttribute('data-dynamic', 'true');

  modalOverlay.innerHTML = `
    <div class="modal">
      <div class="dev-modal-layout">
        <div class="window-header">
          <span id="categoryWindowTitle">${escapeHtml(title)}</span>
          <span class="material-symbols-rounded unified-close-btn header-close-img">close</span>
        </div>
        <div class="dev-content">
          <div class="cards-grid" id="categoryAppsContainer_Dynamic"></div>
        </div>
      </div>
    </div>
    `;

  const container = modalOverlay.querySelector('#categoryAppsContainer_Dynamic');
  if (appsList.length === 0) {
    container.innerHTML = '<div class="no-result-tip">暂无相关应用</div>';
  } else {
    appsList.forEach(app => {
      const card = createCard(app);
      container.appendChild(card);
    });
  }

  modalOverlay.querySelector('.header-close-img').onclick = () => history.back();

  document.body.appendChild(modalOverlay);
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalOverlay.classList.add('active'), 10);
}

export function openHistoryModal(rootApp) {
  let allVersions = [];
  allVersions.push({ ...rootApp, isSpecificVersion: true });
  if (rootApp.historyVersion && rootApp.historyVersion.length > 0) {
    rootApp.historyVersion.forEach(v => {
      allVersions.push({ ...rootApp, ...v, isSpecificVersion: true });
    });
  }
  allVersions.sort((a, b) => (parseInt(b.code) || 0) - (parseInt(a.code) || 0));

  let maxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => {
    const z = parseInt(window.getComputedStyle(el).zIndex) || 1300;
    if (z > maxZ) maxZ = z;
  });

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.zIndex = maxZ + 10;
  modalOverlay.setAttribute('data-package', rootApp.package);
  modalOverlay.setAttribute('data-type', 'history');
  modalOverlay.setAttribute('data-dynamic', 'true');

  modalOverlay.innerHTML = `
    <div class="modal">
      <div class="dev-modal-layout">
        <div class="window-header">
          <span id="historyModalTitle">历史版本</span>
          <span class="material-symbols-rounded unified-close-btn header-close-img">close</span>
        </div>
        <div class="dev-content">
          <div class="simplified-grid" id="historyAppsContainer_Dynamic"></div>
        </div>
      </div>
    </div>
    `;

  const container = modalOverlay.querySelector('#historyAppsContainer_Dynamic');
  allVersions.forEach(verApp => {
    const card = createHistoryCard(verApp, (target) => {
      const code = target.code ? target.code : '0';
      const ver = target.version ? encodeURIComponent(target.version) : 'unknown';
      window.location.hash = `app=${target.package}+${ver}+${code}`;
    });
    container.appendChild(card);
  });

  modalOverlay.querySelector('.header-close-img').onclick = () => history.back();

  document.body.appendChild(modalOverlay);
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalOverlay.classList.add('active'), 10);
}

export function renderAppModal(app) {
  let maxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => {
    const z = parseInt(window.getComputedStyle(el).zIndex) || 1300;
    if (z > maxZ) maxZ = z;
  });
  globalZIndex = maxZ + 2;

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.zIndex = globalZIndex;

  const currentCode = app.code ? String(app.code) : '0';
  const currentVer = app.version || 'unknown';

  modalOverlay.setAttribute('data-id', app.id);
  modalOverlay.setAttribute('data-package', app.package);
  modalOverlay.setAttribute('data-version', currentVer);
  modalOverlay.setAttribute('data-code', currentCode);
  modalOverlay.setAttribute('data-dynamic', 'true');

  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  let displayData = app;
  if (!app.isSpecificVersion) {
    const bestVer = getBestMatchVersion(app, userApi);
    displayData = bestVer ? bestVer : app;
  }
  const isCompat = (userApi === 0) || (userApi >= (parseInt(displayData.minSdk) || 0));

  // --- 开发者逻辑：完善未知开发者不可点击 ---
  const getAuthorHtml = (name, type) => {
    const displayName = name ? escapeHtml(name).trim() : '未知开发者';
    if (!name || displayName === '未知开发者' || displayName === '') {
      return `<span style="color:var(--text-secondary); cursor:default;">未知开发者</span>`;
    }
    return `<span class="author-link" data-name="${displayName}" data-type="${type}">${displayName}</span>`;
  };

  const devRaw = app.developer;
  const modRaw = app.modAuthor;
  let devInfoHtml = modRaw
    ? `${getAuthorHtml(devRaw, 'original')} <span style="color:var(--text-secondary); font-size:0.9em; font-weight:400;">(由 ${getAuthorHtml(modRaw, 'mod')} 修改)</span>`
    : getAuthorHtml(devRaw, 'original');

  // --- 截图与警告 ---
  const screenshotsHtml = (app.screenshots || []).map(src =>
    `<img src="${escapeHtml(src)}" class="screenshot" loading="lazy" onerror="handleImgError(this)">`
  ).join('');

  const compatWarning = !isCompat ?
    `<div class="modal-warning-row"><div class="compat-warning-box">WearStore未向您提供此应用，您需要 Android ${apiMap[displayData.minSdk] || displayData.minSdk}+ 才能使用此应用</div></div>` : '';

  // --- 按钮逻辑 ---
  let dlUrl = displayData.downloadUrl;
  const minSdkNum = displayData.minSdk || 0;
  const displayVer = displayData.version || '未知';
  const displayCode = displayData.code ? String(displayData.code) : '';
  const displaySize = displayData.size || '未知';
  const pwd = displayData.password || app.password;

  const passwordHtml = pwd ? `<div class="password-box" title="点击复制密码" id="copyPwdBtn"><span class="material-symbols-rounded" style="font-size:16px">key</span><span>密码: ${escapeHtml(pwd)}</span></div>` : '';
  const phoneHtml = app.phoneLink ? `<div class="btn-icon-square" id="phoneBtn" title="下载手机配套应用"><span class="material-symbols-rounded">smartphone</span></div>` : '';
  const historyHtml = (app.historyVersion && app.historyVersion.length > 0) ? `<div class="btn-icon-square" id="historyBtn" title="历史版本"><span class="material-symbols-rounded">history</span></div>` : '';

  const fullVersionString = displayCode ? `${escapeHtml(displayVer)} (${escapeHtml(displayCode)})` : escapeHtml(displayVer);
  const recommendBadge = displayData.isRecommended ? `<span class="badge-recommend">推荐</span>` : '';

  // --- 投稿人与推荐 ---
  const contributorHtml = app.contributor ? `<div class="contributor-card"><span class="material-symbols-rounded" style="font-size:20px; color:#ef4444;">favorite</span><span style="font-size:0.9rem; color:var(--text-secondary);">投稿人：</span><span style="font-size:0.95rem; font-weight:600; color:var(--text-main);">${escapeHtml(app.contributor)}</span></div>` : '';

  let recommendHtml = '';
  if (window.allApps) {
    let targetApps = [];
    if (app.recommendIds) {
      targetApps = window.allApps.filter(a => app.recommendIds.includes(a.id));
    } else if (app.recommendPackage) {
      targetApps = window.allApps.filter(a => a.package === app.recommendPackage && a.id !== app.id);
    }
    if (targetApps.length > 0) {
      recommendHtml = `<div class="recommend-container"><div class="recommend-header-styled"><span class="material-symbols-rounded">info</span><span>您可能喜欢的应用</span></div>`;
      targetApps.forEach((t, idx) => {
        recommendHtml += `<div class="recommend-card recommend-click-item" data-target-id="${t.id}"><img src="${escapeHtml(t.icon)}" class="recommend-app-icon" onerror="handleImgError(this)"><div class="recommend-content"><div class="recommend-title">${escapeHtml(t.name)}</div><div class="recommend-desc">${escapeHtml(t.developer || '应用')}</div><div class="recommend-link">查看</div></div></div>`;
        if (idx < targetApps.length - 1) recommendHtml += `<div class="recommend-divider"></div>`;
      });
      recommendHtml += `</div>`;
    }
  }

  modalOverlay.innerHTML = `
    <div class="modal">
      <div class="modal-fixed-top">
        <div class="modal-new-header">
          <img class="modal-new-icon" src="${escapeHtml(app.icon)}" onerror="handleImgError(this)">
          <div class="modal-new-info">
            <div class="modal-new-title">${escapeHtml(app.name)}</div>
            <div class="modal-new-dev">${devInfoHtml}</div>
          </div>
          <div class="modal-close-wrapper"><button class="btn-close-new close-btn-img"><span class="material-symbols-rounded" style="font-size:28px;">close</span></button></div>
        </div>
        ${compatWarning}
        <div class="modal-action-bar">
          <div class="btn-download-rect" id="downloadBtn"><span class="material-symbols-rounded">download</span><span>下载</span></div>
          ${passwordHtml}${phoneHtml}${historyHtml}
          <div class="btn-icon-square" id="shareBtn" title="复制链接"><span class="material-symbols-rounded">share</span></div>
        </div>
      </div>
      <div class="modal-content">
        ${recommendHtml}${contributorHtml}
        <div class="section-title" style="margin-top:0">详细信息</div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">版本 ${recommendBadge}</span><span class="detail-value">${fullVersionString}</span></div>
          <div class="detail-item"><span class="detail-label">大小</span><span class="detail-value">${escapeHtml(displaySize)}</span></div>
          <div class="detail-item"><span class="detail-label">最低兼容</span><span class="detail-value">Android ${apiMap[minSdkNum] || minSdkNum}+</span></div>
          <div class="detail-item"><span class="detail-label">应用分类</span><span class="detail-value">${escapeHtml(app.category || '应用')}</span></div>
          <div class="detail-item" style="grid-column: 1 / -1;"><span class="detail-label">包名</span><span class="detail-value" style="font-size: 0.85rem; word-break: break-all;">${escapeHtml(app.package)}</span></div>
        </div>
        <div class="section-title">应用简介</div>
        <p class="app-description">${escapeHtml(app.description || '暂无描述')}</p>
        <div class="section-title">应用截图</div>
        <div class="screenshots-wrapper">
          <button class="scroll-btn left"><span class="material-symbols-rounded">chevron_left</span></button>
          <div class="screenshots-container">${screenshotsHtml || '<span style="color:var(--text-secondary);font-size:0.9rem;">暂无截图</span>'}</div>
          <button class="scroll-btn right"><span class="material-symbols-rounded">chevron_right</span></button>
        </div>
      </div>
    </div>`;

  // --- 事件绑定 ---
  modalOverlay.querySelector('.close-btn-img').onclick = () => history.back();

  modalOverlay.querySelectorAll('.author-link').forEach(link => {
    link.onclick = (e) => {
      e.stopPropagation();
      const name = link.getAttribute('data-name');
      const type = link.getAttribute('data-type');
      window.location.hash = `dev=${encodeURIComponent(name)}${type === 'mod' ? '&type=mod' : ''}`;
    };
  });

  const downloadBtn = modalOverlay.querySelector('#downloadBtn');
  downloadBtn.onclick = () => {
    if (dlUrl) {
      const a = document.createElement('a'); a.href = dlUrl; a.target = '_blank'; a.click();
    } else {
      showToast('该版本暂无下载链接', 'error');
    }
  };

  if (pwd) {
    modalOverlay.querySelector('#copyPwdBtn').onclick = () => {
      navigator.clipboard.writeText(pwd).then(() => showToast('密码已复制')).catch(() => showToast('复制失败', 'error'));
    };
  }

  if (app.phoneLink) {
    modalOverlay.querySelector('#phoneBtn').onclick = () => {
      window.open(app.phoneLink, '_blank');
    };
  }

  if (historyHtml) {
    modalOverlay.querySelector('#historyBtn').onclick = () => {
      window.location.hash = `history=${app.package}+${app.id}`;
    };
  }

  modalOverlay.querySelector('#shareBtn').onclick = () => {
    navigator.clipboard.writeText(window.location.href).then(() => showToast('链接已复制')).catch(() => showToast('复制失败', 'error'));
  };

  const sc = modalOverlay.querySelector('.screenshots-container');
  if (app.screenshots && app.screenshots.length > 0) {
    modalOverlay.querySelector('.scroll-btn.left').onclick = () => sc.scrollBy({ left: -300, behavior: 'smooth' });
    modalOverlay.querySelector('.scroll-btn.right').onclick = () => sc.scrollBy({ left: 300, behavior: 'smooth' });
  }

  modalOverlay.querySelectorAll('.recommend-click-item').forEach(item => {
    item.onclick = () => {
      const tId = item.getAttribute('data-target-id');
      const tApp = window.allApps.find(a => String(a.id) === tId);
      if (tApp) {
        window.location.hash = `app=${tApp.package}+${encodeURIComponent(tApp.version || 'unknown')}+${tApp.code || 0}`;
      }
    };
  });

  document.body.appendChild(modalOverlay);
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalOverlay.classList.add('active'), 10);
}

// Toast Function
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  const iconName = type === 'error' ? 'error' : 'check_circle';
  const iconColor = type === 'error' ? '#ef4444' : 'var(--primary-color)';
  toast.innerHTML = `
        <span class="material-symbols-rounded toast-icon" style="color:${iconColor}">${iconName}</span>
        <span class="toast-text">${escapeHtml(message)}</span>
        <span class="material-symbols-rounded toast-close">close</span>
    `;
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.onclick = () => removeToast(toast);
  container.appendChild(toast);
  const autoCloseTimer = setTimeout(() => removeToast(toast), 5000);
  function removeToast(el) {
    clearTimeout(autoCloseTimer);
    el.classList.add('hiding');
    el.addEventListener('transitionend', () => { if (el.parentElement) el.remove(); });
  }
}

export function renderCardList(apps, container) {
  container.innerHTML = '';
  if (apps.length === 0) {
    container.innerHTML = '<div class="no-result-tip">暂无应用。</div>';
    return;
  }
  apps.forEach(app => {
    container.appendChild(createCard(app, renderAppModal));
  });
}

export function renderIncompatibleCard(app, container) {
  container.innerHTML = '';
  let lowestMinSdk = parseInt(app.minSdk || 999);
  if (app.historyVersion && app.historyVersion.length > 0) {
    app.historyVersion.forEach(v => {
      const vSdk = parseInt(v.minSdk || 999);
      if (vSdk < lowestMinSdk) lowestMinSdk = vSdk;
    });
  }
  const reqVer = apiMap[lowestMinSdk] || lowestMinSdk;
  const card = document.createElement('div');
  card.className = 'incompatible-card';
  card.innerHTML = `
        <img src="${escapeHtml(app.icon)}" class="incompatible-icon" onerror="handleImgError(this)">
        <div class="incompatible-content">
            <div class="incompatible-title">在找“${escapeHtml(app.name)}”吗？</div>
            <div class="incompatible-reason">
                此应用无法在您的手表上使用，您需要 Android ${reqVer}+ 才能使用此应用
            </div>
        </div>
    `;
  container.appendChild(card);
}