export const DEFAULT_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzEwYjk4MSI+PHBhdGggZD0iTTE3LjUyIDkuNDhsMS4zOC0yLjM5YS41MS41MSAwIDAgMSAuNzItLjE4LjUxLjUxIDAgMCAxIC4xOC43MmwtMS4zOSAyLjQxQTEwIDEwIDAgMCAxIDIyIDE1djFjMCAxLjQ2LS40IDIuODItMS4xIDRIMUMuMSAyMCAzIDE4LjU0IDMgMTd2LTFhMTAgMTAgMCAwIDEgNC41OS04bC0xLjM5LTIuNDFhLjUyLjUyIDAgMCAxIC45LS41NGwxLjM4IDIuMzlhOS44NiA5Ljg2IDAgMCAxIDkuMDQgMHpNOCAxNWExIDEgMCAxIDAgMCAyIDEgMSAwIDAgMCAwLTJ6bTggMWExIDEgMCAxIDAgMC0yIDEgMSAwIDAgMCAwIDJ6Ii8+PC9zdmc+";

export const apiMap = {
  14: "4.0", 15: "4.0.3", 16: "4.1", 17: "4.2", 18: "4.3",
  19: "4.4", 20: "4.4W",
  21: "5.0", 22: "5.1",
  23: "6.0",
  24: "7.0", 25: "7.1",
  26: "8.0", 27: "8.1",
  28: "9",
  29: "10",
  30: "11",
  31: "12", 32: "12L",
  33: "13",
  34: "14",
  35: "15", 36: "16"
};

export const categoryHash = {
  "系统工具": "tools",
  "效率办公": "efficiency",
  "健康运动": "health",
  "通讯社交": "social",
  "影音娱乐": "media",
  "学习充电": "education",
  "生活服务": "life",
  "休闲游戏": "games",
  "表盘美化": "watchface"
};

export function getCategoryByHash(hashKey) {
  return Object.keys(categoryHash).find(key => categoryHash[key] === hashKey);
}

export function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function isAppCompatible(app, userApi) {
  if (!userApi || userApi === 0) return true;
  const bestMatch = getBestMatchVersion(app, userApi);
  return bestMatch !== null;
}

export function getBestMatchVersion(app, userApi) {
  const mainDownloadUrl = app.downloadUrl || app.realPath || "";
  const mainPassword = app.password || "";

  let allVersions = [
    {
      version: app.version,
      code: parseInt(app.code || 0),
      size: app.size,
      minSdk: parseInt(app.minSdk || 0),
      downloadUrl: mainDownloadUrl,
      password: mainPassword,
      isRecommended: app.isRecommended === true
    }
  ];

  if (app.historyVersion && app.historyVersion.length > 0) {
    app.historyVersion.forEach(v => {
      let vUrl = v.downloadUrl || v.realPath || "";
      if (vUrl === "") vUrl = mainDownloadUrl;

      let vPwd = v.password || "";
      if (vPwd === "") vPwd = mainPassword;

      allVersions.push({
        version: v.version,
        code: parseInt(v.code || 0),
        size: v.size,
        minSdk: parseInt(v.minSdk || 0),
        downloadUrl: vUrl,
        password: vPwd,
        isRecommended: v.isRecommended === true
      });
    });
  }

  if (!userApi || userApi === 0) return allVersions[0];

  const compatibleVersions = allVersions.filter(v => userApi >= v.minSdk);

  if (compatibleVersions.length === 0) return null;

  compatibleVersions.sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    return b.code - a.code;
  });

  return compatibleVersions[0];
}

export function findAppByPrecision(allApps, pkg, ver, code) {
  const candidates = allApps.filter(a => a.package === pkg);

  if (candidates.length === 0) return null;

  if (!code || !ver) return candidates[0];

  const targetCode = parseInt(code);
  const targetVer = decodeURIComponent(ver);

  // 2. 遍历所有候选者，寻找严格匹配项
  for (const app of candidates) {
    const appCode = parseInt(app.code || 0);
    if (appCode === targetCode && app.version === targetVer) {
      return { ...app, isSpecificVersion: true };
    }

    if (app.historyVersion && app.historyVersion.length > 0) {
      const historyMatch = app.historyVersion.find(v =>
        parseInt(v.code || 0) === targetCode && v.version === targetVer
      );

      if (historyMatch) {
        // 找到了历史版本匹配
        return {
          ...app,
          ...historyMatch,
          isSpecificVersion: true
        };
      }
    }
  }

  // 3. 如果遍历完所有同包名应用都没找到完全匹配的 Code+Ver
  return candidates[0];
}

export function setPageTitle(title) {
  document.title = title;
}