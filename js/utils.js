/* js/utils.js */

export const DEFAULT_ICON = "./assets/WearStore.png";

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
  // 1. 提取主版本的链接和密码 (作为后备)
  const mainDownloadUrl = app.downloadUrl || app.realPath || "";
  const mainPassword = app.password || "";

  // 2. 构造主版本对象
  let allVersions = [
    {
      version: app.version,
      code: parseInt(app.code || 0), // 确保是数字
      size: app.size,
      minSdk: parseInt(app.minSdk || 0),
      downloadUrl: mainDownloadUrl,
      password: mainPassword
    }
  ];

  // 3. 处理历史版本
  if (app.historyVersion && app.historyVersion.length > 0) {
    app.historyVersion.forEach(v => {
      // 回退机制：如果历史版本没有链接，借用主版本链接
      let vUrl = v.downloadUrl || v.realPath || "";
      if (vUrl === "") vUrl = mainDownloadUrl;

      let vPwd = v.password || "";
      if (vPwd === "") vPwd = mainPassword;

      allVersions.push({
        version: v.version,
        code: parseInt(v.code || 0), // 确保是数字
        size: v.size,
        minSdk: parseInt(v.minSdk || 0),
        downloadUrl: vUrl,
        password: vPwd
      });
    });
  }

  // 如果用户没选版本，默认返回最新的（通常是第一个）
  if (!userApi || userApi === 0) return allVersions[0];

  // 4. 筛选出所有兼容的版本
  const compatibleVersions = allVersions.filter(v => userApi >= v.minSdk);

  if (compatibleVersions.length === 0) return null;

  // 5. 关键修改：按 code (版本号) 倒序排列
  // 逻辑：只要能在我的系统上运行，我要最新的那个版本，而不是 minSdk 最高的那个。
  compatibleVersions.sort((a, b) => b.code - a.code);

  return compatibleVersions[0];
}