chrome.runtime.onStartup.addListener(() => {
  resetSessionData();
});

chrome.runtime.onInstalled.addListener(() => {
  resetSessionData();
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

    const { year, month, day } = getDates();

    chrome.storage.local.get(['sessionTraffic', 'daily', 'monthly', 'yearly', 'total'], (res) => {
      const sessionTraffic = (res.sessionTraffic || 0) + bytes;
      const daily = res.daily || {};
      const monthly = res.monthly || {};
      const yearly = res.yearly || {};
      const total = (res.total || 0) + bytes;

      daily[day] = (daily[day] || 0) + bytes;
      monthly[month] = (monthly[month] || 0) + bytes;
      yearly[year] = (yearly[year] || 0) + bytes;

      chrome.storage.local.set({
        sessionTraffic,
        daily,
        monthly,
        yearly,
        total
      });
    });
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);
