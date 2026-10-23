/**
 * Chart.js Analytics Controller for AJIET CampusFix Admin
 */
const CampusAnalytics = (function() {
  let charts = {
    category: null,
    status: null,
    trend: null,
    location: null
  };

  async function loadAnalytics() {
    try {
      const res = await API.get('/api/analytics');
      if (!res.success) throw new Error(res.message);

      updateMetrics(res.summary);
      renderCharts(res.charts);
      renderRecentActivity(res.recentActivity);
    } catch (err) {
      console.error('Analytics load error:', err);
      showToast('Failed to load campus analytics data', 'error');
    }
  }

  function updateMetrics(summary) {
    if (!summary) return;

    const elTotal = document.getElementById('metricTotal');
    const elActive = document.getElementById('metricActive');
    const elResolved = document.getElementById('metricResolved');
    const elRate = document.getElementById('metricRate');
    const elAvgTime = document.getElementById('metricAvgTime');
    const elStaffCount = document.getElementById('metricStaffCount');

    if (elTotal) elTotal.textContent = summary.total;
    if (elActive) elActive.textContent = summary.active_pending;
    if (elResolved) elResolved.textContent = (summary.resolved || 0) + (summary.verified || 0);
    if (elRate) elRate.textContent = `${summary.resolution_rate}%`;
    if (elAvgTime) elAvgTime.textContent = `${summary.avg_resolution_hours} hrs`;
    if (elStaffCount) elStaffCount.textContent = summary.total_staff;
  }

  function renderCharts(data) {
    if (!data) return;

    // Destroy existing chart instances before re-rendering
    Object.keys(charts).forEach(key => {
      if (charts[key]) {
        charts[key].destroy();
        charts[key] = null;
      }
    });

    // 1. Status Distribution (Doughnut Chart)
    const ctxStatus = document.getElementById('chartStatus');
    if (ctxStatus) {
      charts.status = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: data.byStatus.labels,
          datasets: [{
            data: data.byStatus.data,
            backgroundColor: [
              '#38bdf8', // Submitted (Sky Blue)
              '#c084fc', // Assigned (Purple)
              '#fbbf24', // In Progress (Amber)
              '#34d399', // Resolved (Emerald)
              '#2dd4bf'  // Verified (Teal)
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 12, font: { size: 11 } }
            }
          },
          cutout: '65%'
        }
      });
    }

    // 2. Complaints by Category (Bar Chart)
    const ctxCat = document.getElementById('chartCategory');
    if (ctxCat) {
      charts.category = new Chart(ctxCat, {
        type: 'bar',
        data: {
          labels: data.byCategory.labels,
          datasets: [{
            label: 'Complaints',
            data: data.byCategory.data,
            backgroundColor: [
              '#3b82f6', '#0ea5e9', '#06b6d4', '#10b981',
              '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'
            ],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            },
            x: {
              ticks: { font: { size: 10 } }
            }
          }
        }
      });
    }

    // 3. Monthly Trends (Line Chart)
    const ctxTrend = document.getElementById('chartTrends');
    if (ctxTrend) {
      charts.trend = new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: data.monthlyTrends.labels,
          datasets: [{
            label: 'Monthly Registered Complaints',
            data: data.monthlyTrends.data,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#2563eb',
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          }
        }
      });
    }

    // 4. Complaints by Location (Horizontal Bar Chart)
    const ctxLoc = document.getElementById('chartLocation');
    if (ctxLoc) {
      charts.location = new Chart(ctxLoc, {
        type: 'bar',
        data: {
          labels: data.byLocation.labels,
          datasets: [{
            label: 'Reported Issues',
            data: data.byLocation.data,
            backgroundColor: '#0d9488',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            },
            y: {
              ticks: { font: { size: 11 } }
            }
          }
        }
      });
    }
  }

  function renderRecentActivity(list) {
    const container = document.getElementById('analyticsActivityFeed');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="text-muted small py-3 text-center">No recent activity recorded.</div>';
      return;
    }

    container.innerHTML = list.map(item => {
      const timeStr = new Date(item.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
      });
      return `
        <div class="d-flex align-items-start gap-2 py-2 border-bottom">
          <span class="badge bg-light text-primary border small">${item.complaint_code}</span>
          <div class="flex-grow-1" style="font-size: 0.82rem;">
            <strong class="text-dark">${item.status}</strong> - ${item.remarks || 'Status changed'}
            <div class="text-muted" style="font-size: 0.72rem;">By ${item.user_name} (${item.user_role}) • ${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  return {
    init: loadAnalytics,
    refresh: loadAnalytics
  };
})();
