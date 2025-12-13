/* js/ui.js */
import { escapeHtml, isAppCompatible, getBestMatchVersion, apiMap, DEFAULT_ICON } from './utils.js';

let globalZIndex = 1350;

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

export function renderAppModal(app) {
  const existingModal = document.querySelector(`.modal-overlay[data-package="${app.package}"]`);
  if (existingModal) return;

  const userApi = parseInt(localStorage.getItem('userApiLevel')) || 0;
  const bestVer = getBestMatchVersion(app, userApi);
  const isCompat = !!bestVer;
  const displayData = isCompat ? bestVer : app;

  if (window.location.hash !== `#app=${app.package}`) {
    window.location.hash = `app=${app.package}`;
  }

  globalZIndex++;
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.zIndex = globalZIndex;
  modalOverlay.setAttribute('data-package', app.package);

  const screenshotsHtml = (app.screenshots || []).map(src =>
    `<img src="${escapeHtml(src)}" class="screenshot" loading="lazy" onerror="handleImgError(this)">`
  ).join('');

  const compatWarning = !isCompat ?
    `<div class="modal-warning-row"><div class="compat-warning-box">此应用不兼容您的手表 (Android ${apiMap[userApi] || userApi})</div></div>` : '';

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

  // 版本显示格式
  let fullVersionString = displayCode ? `${escapeHtml(displayVer)} (${escapeHtml(displayCode)})` : escapeHtml(displayVer);
  if (displayData.isRecommended) {
    fullVersionString += ` <span class="badge-recommend">推荐</span>`;
  }

  // --- 新增：投稿人逻辑 ---
  const contributorName = app.contributor;
  const contributorHtml = contributorName ?
    `<div class="detail-item">
          <span class="detail-label">
              <span class="material-symbols-rounded" style="font-size:14px; color:var(--primary-color);">favorite</span> 
              投稿
          </span>
          <span class="detail-value">${escapeHtml(contributorName)}</span>
      </div>` : '';
  // -----------------------

  modalOverlay.innerHTML = `
        <div class="modal">
            <div class="modal-new-header">
                <img class="modal-new-icon" src="${escapeHtml(app.icon)}" onerror="handleImgError(this)">
                <div class="modal-new-info">
                    <div class="modal-new-title">${escapeHtml(app.name)}</div>
                    <div class="modal-new-dev" id="modalDevLink">${devText}</div>
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
                <div class="btn-icon-square" id="shareBtn" title="复制链接">
                    <span class="material-symbols-rounded">share</span>
                </div>
            </div>

            <div class="modal-content">
                <div class="section-title" style="margin-top: 0;">详细信息</div>
                <div class="detail-grid" style="margin-top: 10px;">
                    <div class="detail-item">
                        <span class="detail-label">版本</span>
                        <span class="detail-value">${fullVersionString}</span>
                    </div>
                    <div class="detail-item"><span class="detail-label">大小</span><span class="detail-value">${escapeHtml(displaySize)}</span></div>
                    <div class="detail-item"><span class="detail-label">最低兼容</span><span class="detail-value">Android ${apiMap[minSdkNum] || minSdkNum}+</span></div>
                    
                    <!-- 投稿人显示在这里 -->
                    ${contributorHtml}

                    <div class="detail-item" style="grid-column: 1 / -1;"><span class="detail-label">包名</span><span class="detail-value" style="font-size: 0.85rem; word-break: break-all;">${escapeHtml(app.package)}</span></div>
                </div>

                <div class="section-title">应用简介</div>
                <p style="color: var(--text-secondary); line-height: 1.6;">${escapeHtml(app.description || '暂无描述')}</p>

                <div class="section-title">应用截图</div>
                
                <div class="screenshots-wrapper">
                    <button class="scroll-btn left"><span class="material-symbols-rounded">chevron_left</span></button>
                    <div class="screenshots-container">
                        ${screenshotsHtml}
                    </div>
                    <button class="scroll-btn right"><span class="material-symbols-rounded">chevron_right</span></button>
                </div>
            </div>
        </div>
    `;

  // 事件绑定
  const downloadBtn = modalOverlay.querySelector('#downloadBtn');
  downloadBtn.onclick = () => {
    if (dlUrl && dlUrl.trim() !== '') {
      let finalUrl = dlUrl.trim();
      const link = document.createElement('a');
      link.href = finalUrl;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('抱歉，该版本暂无下载链接。\n请检查是否选中了没有资源的旧版本。');
    }
  };

  const pwdBtn = modalOverlay.querySelector('#copyPwdBtn');
  if (pwdBtn) {
    pwdBtn.onclick = () => {
      navigator.clipboard.writeText(pwd).then(() => {
        alert('密码已复制: ' + pwd);
      }).catch(() => alert('复制失败'));
    };
  }

  const closeBtn = modalOverlay.querySelector('.close-btn-img');
  const closeFunc = () => {
    modalOverlay.classList.remove('active');
    if (window.location.hash.includes(app.package)) {
      history.replaceState(null, null, ' ');
    }
    setTimeout(() => modalOverlay.remove(), 300);
    document.body.style.overflow = '';
  };
  closeBtn.onclick = closeFunc;
  modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeFunc(); };

  modalOverlay.querySelector('#modalDevLink').onclick = () => {
    if (app.developer) {
      closeFunc();
      const event = new CustomEvent('open-dev-modal', { detail: app.developer });
      window.dispatchEvent(event);
    }
  };

  modalOverlay.querySelector('#shareBtn').onclick = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('应用链接已复制到剪贴板');
    }).catch(() => {
      alert('复制失败，请手动复制浏览器地址栏');
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

// --- 渲染不兼容提示卡片 (已更新逻辑) ---
export function renderIncompatibleCard(app, container) {
  container.innerHTML = '';

  // 1. 遍历所有版本，寻找绝对最低的 minSdk
  let lowestMinSdk = parseInt(app.minSdk || 999);
  if (app.historyVersion && app.historyVersion.length > 0) {
    app.historyVersion.forEach(v => {
      const vSdk = parseInt(v.minSdk || 999);
      if (vSdk < lowestMinSdk) {
        lowestMinSdk = vSdk;
      }
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
                WearStore未向您提供此应用，您需要 Android ${reqVer}+ 才能使用此应用
            </div>
        </div>
    `;
  container.appendChild(card);
}