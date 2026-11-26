// 监听插件启动与安装/升级事件，确保历史数据平滑继承
chrome.runtime.onStartup.addListener(() => {
  resetSessionData();
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.get([
      'sessionTraffic', 'sessionUpload', 'sessionDownload',
      'daily', 'dailyUpload', 'dailyDownload',
      'monthly', 'monthlyUpload', 'monthlyDownload',
      'yearly', 'yearlyUpload', 'yearlyDownload',
      'sessionDomainTraffic', 'domainTraffic', 'total', 'totalUpload', 'totalDownload'
    ], (res) => {
      chrome.storage.local.set({
        sessionTraffic: res.sessionTraffic || 0,
        sessionUpload: res.sessionUpload || 0,
        sessionDownload: res.sessionDownload || 0,
        daily: res.daily || {},
        dailyUpload: res.dailyUpload || {},
        dailyDownload: res.dailyDownload || {},
        monthly: res.monthly || {},
        monthlyUpload: res.monthlyUpload || {},
        monthlyDownload: res.monthlyDownload || {},
        yearly: res.yearly || {},
        yearlyUpload: res.yearlyUpload || {},
        yearlyDownload: res.yearlyDownload || {},
        sessionDomainTraffic: res.sessionDomainTraffic || {},
        domainTraffic: res.domainTraffic || {},
        total: res.total || 0,
        totalUpload: res.totalUpload || 0,
        totalDownload: res.totalDownload || 0
      });
    });
  } else if (details.reason === 'update') {
    // 覆盖更新时，历史数据自动继承
    chrome.storage.local.get(['daily', 'monthly', 'yearly', 'domainTraffic'], (res) => {
      console.log('v2.3 升级成功：历史数据已无缝继承，新增上下行独立统计');
    });
  }
});

function resetSessionData() {
  chrome.storage.local.set({ 
    sessionTraffic: 0,
    sessionUpload: 0,
    sessionDownload: 0,
    sessionDomainTraffic: {}
  });
}

function getDates() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const day = `${month}-${String(now.getDate()).padStart(2, '0')}`;
  return { year, month, day };
}

// 计算请求体字节大小 (上行 Upload)
function calculateRequestBodySize(requestBody) {
  if (!requestBody) return 0;
  let bytes = 0;
  if (requestBody.raw) {
    requestBody.raw.forEach((item) => {
      if (item.bytes) {
        bytes += item.bytes.byteLength || 0;
      }
    });
  } else if (requestBody.formData) {
    for (const key in requestBody.formData) {
      const values = requestBody.formData[key];
      if (Array.isArray(values)) {
        values.forEach((val) => {
          bytes += new Blob([key + '=' + val]).size;
        });
      }
    }
  }
  return bytes;
}

// 1. 监听上行流量 (Upload)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // 估算请求行 + 请求体大小
    let uploadBytes = new Blob([details.url]).size + 200; // 基础请求头估算约 200B
    uploadBytes += calculateRequestBodySize(details.requestBody);

    if (uploadBytes <= 0) return;

    let domain = '未知来源';
    try {
      domain = new URL(details.url).hostname || '未知来源';
    } catch (e) {
      domain = '未知来源';
    }

    const { year, month, day } = getDates();

    chrome.storage.local.get([
      'sessionTraffic', 'sessionUpload',
      'daily', 'dailyUpload',
      'monthly', 'monthlyUpload',
      'yearly', 'yearlyUpload',
      'sessionDomainTraffic', 'domainTraffic',
      'total', 'totalUpload'
    ], (res) => {
      const sessionTraffic = (res.sessionTraffic || 0) + uploadBytes;
      const sessionUpload = (res.sessionUpload || 0) + uploadBytes;
      
      const daily = res.daily || {};
      const dailyUpload = res.dailyUpload || {};
      const monthly = res.monthly || {};
      const monthlyUpload = res.monthlyUpload || {};
      const yearly = res.yearly || {};
      const yearlyUpload = res.yearlyUpload || {};
      
      const sessionDomainTraffic = res.sessionDomainTraffic || {};
      const domainTraffic = res.domainTraffic || {};
      
      const total = (res.total || 0) + uploadBytes;
      const totalUpload = (res.totalUpload || 0) + uploadBytes;

      daily[day] = (daily[day] || 0) + uploadBytes;
      dailyUpload[day] = (dailyUpload[day] || 0) + uploadBytes;
      
      monthly[month] = (monthly[month] || 0) + uploadBytes;
      monthlyUpload[month] = (monthlyUpload[month] || 0) + uploadBytes;
      
      yearly[year] = (yearly[year] || 0) + uploadBytes;
      yearlyUpload[year] = (yearlyUpload[year] || 0) + uploadBytes;

      sessionDomainTraffic[domain] = (sessionDomainTraffic[domain] || 0) + uploadBytes;
      domainTraffic[domain] = (domainTraffic[domain] || 0) + uploadBytes;

      chrome.storage.local.set({
        sessionTraffic, sessionUpload,
        daily, dailyUpload,
        monthly, monthlyUpload,
        yearly, yearlyUpload,
        sessionDomainTraffic, domainTraffic,
        total, totalUpload
      });
    });
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// 2. 监听下行流量 (Download)
chrome.webRequest.onCompleted.addListener(
  (details) => {
    let downloadBytes = 0;
    if (details.responseHeaders) {
      details.responseHeaders.forEach((h) => {
        if (h.name.toLowerCase() === 'content-length') {
          downloadBytes += parseInt(h.value, 10) || 0;
        }
      });
    }

    if (downloadBytes <= 0) return;

    let domain = '未知来源';
    try {
      domain = new URL(details.url).hostname || '未知来源';
    } catch (e) {
      domain = '未知来源';
    }

    const { year, month, day } = getDates();

    chrome.storage.local.get([
      'sessionTraffic', 'sessionDownload',
      'daily', 'dailyDownload',
      'monthly', 'monthlyDownload',
      'yearly', 'yearlyDownload',
      'sessionDomainTraffic', 'domainTraffic',
      'total', 'totalDownload'
    ], (res) => {
      const sessionTraffic = (res.sessionTraffic || 0) + downloadBytes;
      const sessionDownload = (res.sessionDownload || 0) + downloadBytes;
      
      const daily = res.daily || {};
      const dailyDownload = res.dailyDownload || {};
      const monthly = res.monthly || {};
      const monthlyDownload = res.monthlyDownload || {};
      const yearly = res.yearly || {};
      const yearlyDownload = res.yearlyDownload || {};
      
      const sessionDomainTraffic = res.sessionDomainTraffic || {};
      const domainTraffic = res.domainTraffic || {};
      
      const total = (res.total || 0) + downloadBytes;
      const totalDownload = (res.totalDownload || 0) + downloadBytes;

      daily[day] = (daily[day] || 0) + downloadBytes;
      dailyDownload[day] = (dailyDownload[day] || 0) + downloadBytes;
      
      monthly[month] = (monthly[month] || 0) + downloadBytes;
      monthlyDownload[month] = (monthlyDownload[month] || 0) + downloadBytes;
      
      yearly[year] = (yearly[year] || 0) + downloadBytes;
      yearlyDownload[year] = (yearlyDownload[year] || 0) + downloadBytes;

      sessionDomainTraffic[domain] = (sessionDomainTraffic[domain] || 0) + downloadBytes;
      domainTraffic[domain] = (domainTraffic[domain] || 0) + downloadBytes;

      chrome.storage.local.set({
        sessionTraffic, sessionDownload,
        daily, dailyDownload,
        monthly, monthlyDownload,
        yearly, yearlyDownload,
        sessionDomainTraffic, domainTraffic,
        total, totalDownload
      });
    });
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);