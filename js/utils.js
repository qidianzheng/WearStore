export const DEFAULT_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzEwYjk4MSI+PHBhdGggZD0iTTE3LjUyIDkuNDhsMS4zOC0yLjM5YS41MS41MSAwIDAgMSAuNzItLjE4LjUxLjUxIDAgMCAxIC4xOC43MmwtMS4zOSAyLjQxQTEwIDEwIDAgMCAxIDIyIDE1djFjMCAxLjQ2LS40IDIuODItMS4xIDRIMUMuMSAyMCAzIDE4LjU0IDMgMTd2LTFhMTAgMTAgMCAwIDEgNC41OS04bC0xLjM5LTIuNDFhLjUyLjUyIDAgMCAxIC45LS41NGwxLjM4IDIuMzlhOS44NiA5Ljg2IDAgMCAxIDkuMDQgMHpNOCAxNWExIDEgMCAxIDAgMCAyIDEgMSAwIDAgMCAwLTJ6bTggMWExIDEgMCAxIDAgMC0yIDEgMSAwIDAgMCAwIDJ6Ii8+PC9zdmc+";

export const apiMap = {
  14: "4.0", 15: "4.0.3", 16: "4.1", 17: "4.2", 18: "4.3", 19: "4.4", 20: "4.4W", 21: "5.0", 22: "5.1", 23: "6.0", 24: "7.0", 25: "7.1", 26: "8.0", 27: "8.1", 28: "9", 29: "10", 30: "11", 31: "12", 32: "12L", 33: "13", 34: "14", 35: "15", 36: "16"
};

export const categoryHash = {
  "系统工具": "tools", "效率办公": "efficiency", "健康运动": "health", "通讯社交": "social", "影音娱乐": "media", "学习充电": "education", "生活服务": "life", "休闲游戏": "games", "表盘美化": "watchface", "其他": "other"
};

export function getCategoryByHash(hashKey) {
  return Object.keys(categoryHash).find(key => categoryHash[key] === hashKey);
}

export function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function isAppGloballyCompatible(app, userApi) {
  if (!userApi || userApi === 0) return true;
  const uApi = parseInt(userApi);
  if (uApi >= parseInt(app.minSdk || 0)) return true;
  if (app.historyVersion && Array.isArray(app.historyVersion)) {
    return app.historyVersion.some(v => uApi >= parseInt(v.minSdk || 0));
  }
  return false;
}

export function getBestMatchVersion(app, userApi) {
  let all = [{ ...app, isSpecificVersion: true }];
  if (app.historyVersion && Array.isArray(app.historyVersion)) {
    app.historyVersion.forEach(v => all.push({ ...app, ...v, isSpecificVersion: true }));
  }
  if (!userApi || userApi === 0) return all[0];
  const uApi = parseInt(userApi);
  const compat = all.filter(v => uApi >= parseInt(v.minSdk || 0));
  if (compat.length === 0) return null;
  return compat.sort((a, b) => parseInt(b.code || 0) - parseInt(a.code || 0))[0];
}

export function calculateMatchRatio(term, targetName) {
  const t = term.toLowerCase(), n = targetName.toLowerCase();
  if (!n.includes(t)) return 0;
  return t.length / n.length;
}

export function findAppByPrecision(allApps, pkg, ver, code) {
  const candidates = allApps.filter(a => a.package === pkg);
  if (candidates.length === 0) return null;
  if (!code || !ver || ver === 'unknown') return candidates[0];
  const targetCode = String(code), targetVer = decodeURIComponent(ver);
  for (const app of candidates) {
    if (String(app.code) === targetCode && app.version === targetVer) return { ...app, isSpecificVersion: true };
    if (app.historyVersion) {
      const match = app.historyVersion.find(v => String(v.code) === targetCode && v.version === targetVer);
      if (match) return { ...app, ...match, isSpecificVersion: true };
    }
  }
  return candidates[0];
}

export function setPageTitle(title) { document.title = title; }