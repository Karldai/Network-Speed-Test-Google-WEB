// 监听插件启动与安装/升级事件，确保历史数据平滑继承
chrome.runtime.onStartup.addListener(() => {
  resetSessionData();
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.get(['sessionTraffic', 'daily', 'monthly', 'yearly', 'domainTraffic', 'total'], (res) => {
      chrome.storage.local.set({
        sessionTraffic: res.sessionTraffic || 0,
        daily: res.daily || {},
        monthly: res.monthly || {},
        yearly: res.yearly || {},
        domainTraffic: res.domainTraffic || {},
        total: res.total || 0
      });
    });
  } else if (details.reason === 'update') {
    // 覆盖更新时，历史 daily, monthly, yearly, domainTraffic 数据自动无缝继承
    chrome.storage.local.get(['sessionTraffic', 'daily', 'monthly', 'yearly', 'domainTraffic', 'total'], (res) => {
      console.log('v2.1 升级成功：历史流量与域名统计数据已完美继承');
    });
  }
});

function resetSessionData() {
  chrome.storage.local.set({ sessionTraffic: 0 });
}

function getDates() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const day = `${month}-${String(now.getDate()).padStart(2, '0')}`;
  return { year, month, day };
}

chrome.webRequest.onCompleted.addListener(
  (details) => {
    let bytes = 0;
    if (details.responseHeaders) {
      details.responseHeaders.forEach((h) => {
        if (h.name.toLowerCase() === 'content-length') {
          bytes += parseInt(h.value, 10) || 0;
        }
      });
    }

    if (bytes <= 0) return;

    let domain = '未知来源';
    try {
      const urlObj = new URL(details.url);
      domain = urlObj.hostname || '未知来源';
    } catch (e) {
      domain = '未知来源';
    }

    const { year, month, day } = getDates();

    chrome.storage.local.get(['sessionTraffic', 'daily', 'monthly', 'yearly', 'domainTraffic', 'total'], (res) => {
      const sessionTraffic = (res.sessionTraffic || 0) + bytes;
      const daily = res.daily || {};
      const monthly = res.monthly || {};
      const yearly = res.yearly || {};
      const domainTraffic = res.domainTraffic || {};
      const total = (res.total || 0) + bytes;

      daily[day] = (daily[day] || 0) + bytes;
      monthly[month] = (monthly[month] || 0) + bytes;
      yearly[year] = (yearly[year] || 0) + bytes;
      domainTraffic[domain] = (domainTraffic[domain] || 0) + bytes;

      chrome.storage.local.set({
        sessionTraffic,
        daily,
        monthly,
        yearly,
        domainTraffic,
        total
      });
    });
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);