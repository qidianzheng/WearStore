/* js/ui.js */
import { escapeHtml, isAppCompatible, getBestMatchVersion, apiMap, DEFAULT_ICON } from './utils.js';

let globalZIndex = 1350;

// 全局图片错误处理
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
  card.onclick = () => onClickCallback(app);
  return card;
}

// 历史版本简易卡片
function createHistoryCard(appVersionData, onClickCallback) {
  const card = document.createElement('div');
  card.className = 'history-simple-card';

  card.innerHTML = `
        <div class="history-content">
            <div class="history-name">${escapeHtml(appVersionData.name)}</div>
            <div class="history-ver">${escapeHtml(appVersionData.version)} <span style="opacity:0.6">| ${escapeHtml(appVersionData.size || '未知')}</span></div>
        </div>
        <span class="material-symbols-rounded card-action-icon color-primary">arrow_forward</span>
    `;
  card.onclick = () => onClickCallback(appVersionData);
  return card;
}

// 打开历史版本窗口 (支持堆叠)
function openHistoryModal(rootApp) {
  let allVersions = [];

  // 主版本
  allVersions.push({
    ...rootApp,
    isSpecificVersion: true
  });

  // 历史版本
  if (rootApp.historyVersion && rootApp.historyVersion.length > 0) {
    rootApp.historyVersion.forEach(v => {
      allVersions.push({
        ...rootApp,
        version: v.version,
        code: v.code,
        size: v.size,
        minSdk: v.minSdk,
        downloadUrl: v.downloadUrl,
        password: v.password,
        isRecommended: v.isRecommended,
        isSpecificVersion: true
      });
    });
  }

  // 排序
  allVersions.sort((a, b) => (parseInt(b.code) || 0) - (parseInt(a.code) || 0));

  // 计算层级
  let maxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => {
    const z = parseInt(window.getComputedStyle(el).zIndex) || 1300;
    if (z > maxZ) maxZ = z;
  });
  const newZIndex = maxZ + 2;

  // 动态创建
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.zIndex = newZIndex;

  // 🔥 修复关键：给历史窗口也加上 data-package
  // 这样当历史窗口在顶层时，URL Hash 依然是 #app=com.xxx，不会变成空白，防止状态丢失
  modalOverlay.setAttribute('data-package', rootApp.package);
  modalOverlay.setAttribute('data-type', 'history');

  modalOverlay.innerHTML = `
    <div class="modal">
      <div class="dev-modal-layout">
        <div class="window-header">
          <span id="historyModalTitle">历史版本 - ${escapeHtml(rootApp.name)}</span>
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
      // 点击历史项，直接堆叠打开新窗口
      renderAppModal(target);
    });
    container.appendChild(card);
  });

  const closeBtn = modalOverlay.querySelector('.header-close-img');
  const closeFunc = () => {
    modalOverlay.classList.remove('active');
    setTimeout(() => {
      modalOverlay.remove();

      // 关闭后恢复上一层的 Hash
      const remainingModals = Array.from(document.querySelectorAll('.modal-overlay.active'))
        .sort((a, b) => (parseInt(window.getComputedStyle(a).zIndex) || 0) - (parseInt(window.getComputedStyle(b).zIndex) || 0));

      if (remainingModals.length > 0) {
        const topModal = remainingModals[remainingModals.length - 1];
        const pkg = topModal.getAttribute('data-package');
        if (pkg) history.replaceState(null, null, `#app=${pkg}`);
        else history.replaceState(null, null, ' ');
      } else {
        history.replaceState(null, null, ' ');
        document.body.style.overflow = '';
      }
    }, 300);
  };
  closeBtn.onclick = closeFunc;

  document.body.appendChild(modalOverlay);
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalOverlay.classList.add('active'), 10);
}

// 渲染应用详情页
export function renderAppModal(app) {
  // 🔥 核心修改：移除所有防重检查
  // 只要调用，就无脑弹窗，实现无限堆叠

  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;

  let displayData = app;
  if (!app.isSpecificVersion) {
    const bestVer = getBestMatchVersion(app, userApi);
    displayData = bestVer ? bestVer : app;
  }

  const isCompat = (userApi === 0) || (userApi >= (parseInt(displayData.minSdk) || 0));

  if (window.location.hash !== `#app=${app.package}`) {
    window.location.hash = `app=${app.package}`;
  }

  // 计算层级
  let currentMaxZ = 1300;
  document.querySelectorAll('.modal-overlay').forEach(el => {
    const z = parseInt(window.getComputedStyle(el).zIndex) || 0;
    if (z > currentMaxZ) currentMaxZ = z;
  });
  globalZIndex = currentMaxZ + 2;

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.zIndex = globalZIndex;
  modalOverlay.setAttribute('data-id', app.id);
  modalOverlay.setAttribute('data-package', app.package);
  modalOverlay.setAttribute('data-code', displayData.code || '');

  const screenshotsHtml = (app.screenshots || []).map(src =>
    `<img src="${escapeHtml(src)}" class="screenshot" loading="lazy" onerror="handleImgError(this)">`
  ).join('');

  const compatWarning = !isCompat ?
    `<div class="modal-warning-row"><div class="compat-warning-box">WearStore未向您提供此应用，您需要 Android ${apiMap[displayData.minSdk] || displayData.minSdk}+ 才能使用此应用</div></div>` : '';

  let dlUrl = displayData.downloadUrl;

  const devText = app.developer ? escapeHtml(app.developer) : '未知开发者';
  const minSdkNum = displayData.minSdk || displayData.minSDK || 0;
  const displayVer = displayData.version || '未知';
  const displayCode = displayData.code ? String(displayData.code) : '';
  const displaySize = displayData.size || '未知';
  const pwd = displayData.password || app.password;

  const passwordHtml = pwd ?
    `<div class="password-box" title="点击复制密码" id="copyPwdBtn">
       <span class="material-symbols-rounded" style="font-size:16px">key</span>
       <span>密码: ${escapeHtml(pwd)}</span>
     </div>` : '';

  const phoneLink = app.phoneLink;
  const phoneHtml = phoneLink ?
    `<div class="btn-icon-square" id="phoneBtn" title="下载手机配套应用">
       <span class="material-symbols-rounded">smartphone</span>
     </div>` : '';

  const fullVersionString = displayCode ? `${escapeHtml(displayVer)} (${escapeHtml(displayCode)})` : escapeHtml(displayVer);
  const recommendBadge = displayData.isRecommended ? `<span class="badge-recommend">推荐</span>` : '';
  const catText = app.category ? escapeHtml(app.category) : '应用';

  const contributorName = app.contributor;
  const contributorHtml = contributorName ?
    `<div class="contributor-card">
          <span class="material-symbols-rounded" style="font-size:20px; color:#ef4444;">favorite</span>
          <span style="font-size:0.9rem; color:var(--text-secondary);">投稿人：</span>
          <span style="font-size:0.95rem; font-weight:600; color:var(--text-main);">${escapeHtml(contributorName)}</span>
      </div>` : '';

  const devName = app.developer ? escapeHtml(app.developer) : '未知开发者';
  const modName = app.modAuthor ? escapeHtml(app.modAuthor) : null;
  let devInfoHtml = modName ?
    `<span class="author-link" data-name="${devName}" data-type="original">${devName}</span>
       <span style="color:var(--text-secondary); font-size:0.9em; font-weight:400;">
           (由 <span class="author-link" data-name="${modName}" data-type="mod">${modName}</span> 修改)
       </span>` :
    `<span class="author-link" data-name="${devName}" data-type="original">${devName}</span>`;

  let recommendHtml = '';
  if (window.allApps) {
    let targetApps = [];
    if (app.recommendIds && Array.isArray(app.recommendIds)) {
      targetApps = window.allApps.filter(a => app.recommendIds.includes(a.id));
      targetApps.sort((a, b) => app.recommendIds.indexOf(a.id) - app.recommendIds.indexOf(b.id));
    } else if (app.recommendId) {
      const t = window.allApps.find(a => a.id === app.recommendId);
      if (t) targetApps.push(t);
    } else if (app.recommendPackage) {
      targetApps = window.allApps.filter(a => a.package === app.recommendPackage && a.id !== app.id);
    }

    if (targetApps.length > 0) {
      recommendHtml += `<div class="recommend-container">`;
      targetApps.forEach((targetApp, index) => {
        let reasonText = '';
        if (targetApps.length === 1 && app.recommendReason) reasonText = ` - ${app.recommendReason}`;
        const sizeInfo = targetApp.size ? ` (${targetApp.size})` : '';
        const displayText = `${targetApp.name}${reasonText}${sizeInfo}`;
        recommendHtml += `
                <div class="recommend-card">
                    <div class="recommend-icon-wrapper"><span class="material-symbols-rounded" style="font-size:20px; color:var(--text-secondary);">info</span></div>
                    <div class="recommend-content recommend-click-item" data-target-id="${targetApp.id}">
                        <div class="recommend-title">类似应用</div>
                        <div class="recommend-desc">${escapeHtml(displayText)}</div>
                        <div class="recommend-btn">查看</div>
                    </div>
                </div>
              `;
        if (index < targetApps.length - 1) recommendHtml += `<div class="recommend-divider"></div>`;
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
                    <div class="modal-close-wrapper">
                        <button class="btn-close-new close-btn-img">
                            <span class="material-symbols-rounded" style="font-size:28px;">close</span>
                        </button>
                    </div>
                </div>
                ${compatWarning}
                <div class="modal-action-bar">
                    <div class="btn-download-rect" id="downloadBtn">
                        <span class="material-symbols-rounded">download</span>
                        <span>下载</span>
                    </div>
                    ${passwordHtml}
                    ${phoneHtml}
                    <div class="btn-icon-square" id="historyBtn" title="历史版本">
                        <span class="material-symbols-rounded">history</span>
                    </div>
                    <div class="btn-icon-square" id="shareBtn" title="复制链接">
                        <span class="material-symbols-rounded">share</span>
                    </div>
                </div>
            </div>
            <div class="modal-content">
                ${recommendHtml}
                ${contributorHtml}
                <div class="section-title">详细信息</div>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">版本 ${recommendBadge}</span><span class="detail-value">${fullVersionString}</span></div>
                    <div class="detail-item"><span class="detail-label">大小</span><span class="detail-value">${escapeHtml(displaySize)}</span></div>
                    <div class="detail-item"><span class="detail-label">最低兼容</span><span class="detail-value">Android ${apiMap[minSdkNum] || minSdkNum}+</span></div>
                    <div class="detail-item"><span class="detail-label">应用分类</span><span class="detail-value">${catText}</span></div>
                    <div class="detail-item" style="grid-column: 1 / -1;"><span class="detail-label">包名</span><span class="detail-value" style="font-size: 0.85rem; word-break: break-all;">${escapeHtml(app.package)}</span></div>
                </div>
                <div class="section-title">应用简介</div>
                <p class="app-description">${escapeHtml(app.description || '暂无描述')}</p>
                <div class="section-title">应用截图</div>
                <div class="screenshots-wrapper">
                    <button class="scroll-btn left"><span class="material-symbols-rounded">chevron_left</span></button>
                    <div class="screenshots-container">${screenshotsHtml}</div>
                    <button class="scroll-btn right"><span class="material-symbols-rounded">chevron_right</span></button>
                </div>
            </div>
        </div>
    `;

  // --- 事件绑定 ---

  const recommendItems = modalOverlay.querySelectorAll('.recommend-click-item');
  recommendItems.forEach(item => {
    item.onclick = () => {
      const targetId = parseInt(item.getAttribute('data-target-id'));
      const targetApp = window.allApps.find(a => a.id === targetId);
      if (targetApp) renderAppModal(targetApp);
    };
  });

  modalOverlay.querySelector('#historyBtn').onclick = () => {
    if (window.allApps) {
      const rootApp = window.allApps.find(a => a.id === app.id) ||
        window.allApps.find(a => a.package === app.package && a.historyVersion);
      if (rootApp) openHistoryModal(rootApp);
    }
  };

  if (phoneHtml) {
    modalOverlay.querySelector('#phoneBtn').onclick = () => {
      const link = document.createElement('a');
      link.href = phoneLink;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  }

  const closeBtn = modalOverlay.querySelector('.close-btn-img');
  const closeFunc = () => {
    modalOverlay.classList.remove('active');
    setTimeout(() => {
      modalOverlay.remove();

      // 关闭后，寻找剩下的最顶层窗口，恢复 Hash
      const remainingModals = Array.from(document.querySelectorAll('.modal-overlay.active'))
        .sort((a, b) => (parseInt(window.getComputedStyle(a).zIndex) || 0) - (parseInt(window.getComputedStyle(b).zIndex) || 0));

      if (remainingModals.length > 0) {
        const topModal = remainingModals[remainingModals.length - 1];
        // 获取包名，历史窗口现在也有包名了，所以逻辑统一
        const pkg = topModal.getAttribute('data-package');
        if (pkg) {
          history.replaceState(null, null, `#app=${pkg}`);
        } else {
          // 如果是开发者窗口(无pkg)，清空
          history.replaceState(null, null, ' ');
        }
      } else {
        // 全部关闭，回主页
        history.replaceState(null, null, ' ');
        document.body.style.overflow = '';
      }
    }, 300);
  };
  closeBtn.onclick = closeFunc;

  const downloadBtn = modalOverlay.querySelector('#downloadBtn');
  downloadBtn.onclick = () => {
    if (dlUrl && dlUrl.trim() !== '') {
      const link = document.createElement('a');
      link.href = dlUrl.trim();
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      showToast('该版本暂无下载链接', 'error');
    }
  };

  const pwdBtn = modalOverlay.querySelector('#copyPwdBtn');
  if (pwdBtn) {
    pwdBtn.onclick = () => {
      navigator.clipboard.writeText(pwd).then(() => {
        showToast('密码已复制');
      }).catch(() => showToast('复制失败', 'error'));
    };
  }

  const authorLinks = modalOverlay.querySelectorAll('.author-link');
  authorLinks.forEach(link => {
    link.onclick = (e) => {
      e.stopPropagation();
      const name = link.getAttribute('data-name');
      const type = link.getAttribute('data-type');
      window.dispatchEvent(new CustomEvent('open-dev-modal', {
        detail: { name: name, type: type }
      }));
    };
  });

  modalOverlay.querySelector('#shareBtn').onclick = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showToast('链接已复制到剪贴板');
    }).catch(() => {
      showToast('复制失败，请手动复制', 'error');
    });
  };

  const scrollContainer = modalOverlay.querySelector('.screenshots-container');
  const leftBtn = modalOverlay.querySelector('.scroll-btn.left');
  const rightBtn = modalOverlay.querySelector('.scroll-btn.right');

  if (app.screenshots && app.screenshots.length > 0) {
    leftBtn.onclick = () => scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
    rightBtn.onclick = () => scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
  } else {
    leftBtn.style.display = 'none';
    rightBtn.style.display = 'none';
    scrollContainer.innerHTML = '<span style="color:var(--text-secondary);font-size:0.9rem;">暂无截图</span>';
  }

  document.body.appendChild(modalOverlay);
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalOverlay.classList.add('active'), 10);
}

// Toast
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
    container.innerHTML = '<div class="no-result-tip">未找到适合您手表的应用。</div>';
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
                WearStore 未向您提供此应用，您需要 Android ${reqVer}+ 才能使用此应用
            </div>
        </div>
    `;
  container.appendChild(card);
}