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
  // 1. 提取主版本链接/密码
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

  // 排序：推荐优先 > code 大优先
  compatibleVersions.sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    return b.code - a.code;
  });

  return compatibleVersions[0];
}