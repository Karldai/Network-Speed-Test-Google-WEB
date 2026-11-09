let currentTab = 'day';
let chartInstance = null;

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateUI() {
  const now = new Date();
  const yearStr = now.getFullYear().toString();
  const monthStr = `${yearStr}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dayStr = `${monthStr}-${String(now.getDate()).padStart(2, '0')}`;

  chrome.storage.local.get(['sessionTraffic', 'daily', 'monthly', 'yearly', 'domainTraffic'], (res) => {
    const session = res.sessionTraffic || 0;
    const daily = res.daily || {};
    const monthly = res.monthly || {};
    const yearly = res.yearly || {};
    const domainTraffic = res.domainTraffic || {};

    document.getElementById('session-badge').innerText = `本次会话: ${formatBytes(session)}`;
    document.getElementById('today-traffic').innerText = formatBytes(daily[dayStr] || 0);
    document.getElementById('month-traffic').innerText = formatBytes(monthly[monthStr] || 0);
    document.getElementById('year-traffic').innerText = formatBytes(yearly[yearStr] || 0);

    if (currentTab === 'domain') {
      renderDomainList(domainTraffic);
    } else {
      renderChart(currentTab, { daily, monthly, yearly });
    }
  });
}

function renderDomainList(domainTraffic) {
  const listContainer = document.getElementById('domain-list');
  listContainer.innerHTML = '';

  const sortedDomains = Object.entries(domainTraffic)
    .sort((a, b) => b[1] - a[1]);

  if (sortedDomains.length === 0) {
    listContainer.innerHTML = '<div class="empty-tip">暂无域名流量数据</div>';
    return;
  }

  sortedDomains.forEach(([domain, bytes]) => {
    const item = document.createElement('div');
    item.className = 'domain-item';
    item.innerHTML = `
      <span class="domain-name">${domain}</span>
      <span class="domain-val">${formatBytes(bytes)}</span>
    `;
    listContainer.appendChild(item);
  });
}

function renderChart(type, data) {
  const ctx = document.getElementById('trafficChart').getContext('2d');
  let labels = [];
  let chartData = [];

  if (type === 'day') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      labels.push(key.slice(5));
      chartData.push(((data.daily[key] || 0) / (1024 * 1024)).toFixed(2));
    }
  } else if (type === 'month') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labels.push(key);
      chartData.push(((data.monthly[key] || 0) / (1024 * 1024)).toFixed(2));
    }
  } else {
    const currentYear = new Date().getFullYear();
    for (let i = 2; i >= 0; i--) {
      const key = (currentYear - i).toString();
      labels.push(key);
      chartData.push(((data.yearly[key] || 0) / (1024 * 1024)).toFixed(2));
    }
  }

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '流量 (MB)',
        data: chartData,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
        x: { grid: { display: false } }
      }
    }
  });
}

document.getElementById('tab-day').addEventListener('click', (e) => switchTab('day', e.target));
document.getElementById('tab-month').addEventListener('click', (e) => switchTab('month', e.target));
document.getElementById('tab-year').addEventListener('click', (e) => switchTab('year', e.target));
document.getElementById('tab-domain').addEventListener('click', (e) => switchTab('domain', e.target));

function switchTab(type, targetBtn) {
  currentTab = type;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  targetBtn.classList.add('active');

  const chartBox = document.getElementById('chart-box');
  const domainBox = document.getElementById('domain-box');

  if (type === 'domain') {
    chartBox.style.display = 'none';
    domainBox.style.display = 'block';
  } else {
    chartBox.style.display = 'block';
    domainBox.style.display = 'none';
  }

  updateUI();
}

document.getElementById('btn-clear').addEventListener('click', () => {
  const type = document.getElementById('clear-type').value;

  if (type === 'session') {
    chrome.storage.local.set({ sessionTraffic: 0 }, updateUI);
  } else if (type === 'today') {
    const today = new Date().toISOString().split('T')[0];
    chrome.storage.local.get(['daily'], (res) => {
      const daily = res.daily || {};
      delete daily[today];
      chrome.storage.local.set({ daily }, updateUI);
    });
  } else if (type === 'domain') {
    chrome.storage.local.set({ domainTraffic: {} }, updateUI);
  } else if (type === 'all') {
    if (confirm('确认清空所有历史流量记录？')) {
      chrome.storage.local.clear(updateUI);
    }
  }
});

document.addEventListener('DOMContentLoaded', updateUI);