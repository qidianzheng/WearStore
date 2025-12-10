/* js/data.js */
export async function fetchApps() {
  try {
    // 使用相对路径获取 data 目录下的 json
    const response = await fetch('./data/data.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("加载应用数据失败:", error);
    return [];
  }
}