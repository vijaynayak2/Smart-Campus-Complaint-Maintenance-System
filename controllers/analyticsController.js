const db = require('../config/db');

/**
 * Get Comprehensive Analytics Data for Admin Dashboard & Charts
 * GET /api/analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    // 1. Basic Counts
    const [totalRows] = await db.query('SELECT COUNT(*) AS total FROM complaints');
    const [statusRows] = await db.query(
      'SELECT status, COUNT(*) AS count FROM complaints GROUP BY status'
    );
    const [categoryRows] = await db.query(
      'SELECT category, COUNT(*) AS count FROM complaints GROUP BY category ORDER BY count DESC'
    );
    const [priorityRows] = await db.query(
      'SELECT priority, COUNT(*) AS count FROM complaints GROUP BY priority'
    );
    const [locationRows] = await db.query(
      'SELECT location, COUNT(*) AS count FROM complaints GROUP BY location ORDER BY count DESC LIMIT 8'
    );

    // Map status counts
    const statusMap = {
      Submitted: 0,
      Assigned: 0,
      'In Progress': 0,
      Resolved: 0,
      Verified: 0
    };
    statusRows.forEach(row => {
      statusMap[row.status] = Number(row.count);
    });

    const total = Number(totalRows[0].total) || 0;
    const resolvedTotal = (statusMap['Resolved'] || 0) + (statusMap['Verified'] || 0);
    const resolutionRate = total > 0 ? Math.round((resolvedTotal / total) * 100) : 0;

    // 2. Average Resolution Time (in hours)
    // Compute from resolved complaints
    const [timeRows] = await db.query(`
      SELECT created_at, resolved_at 
      FROM complaints 
      WHERE resolved_at IS NOT NULL
    `);

    let avgHours = 0;
    if (timeRows && timeRows.length > 0) {
      let totalDiffMs = 0;
      let validCount = 0;
      timeRows.forEach(r => {
        if (r.created_at && r.resolved_at) {
          const start = new Date(r.created_at).getTime();
          const end = new Date(r.resolved_at).getTime();
          if (end >= start) {
            totalDiffMs += (end - start);
            validCount++;
          }
        }
      });
      if (validCount > 0) {
        avgHours = Math.round((totalDiffMs / validCount / (1000 * 60 * 60)) * 10) / 10;
      }
    }

    // 3. User & Staff Counts
    const [userCountRows] = await db.query(
      'SELECT role, COUNT(*) AS count FROM users GROUP BY role'
    );
    let totalUsers = 0;
    let totalStaff = 0;
    userCountRows.forEach(r => {
      totalUsers += Number(r.count);
      if (r.role === 'staff') totalStaff = Number(r.count);
    });

    // 4. Monthly Trends (Past 6 Months)
    // Generate last 6 months buckets
    const months = [];
    const monthCounts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthLabel = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      months.push({ label: monthLabel, year, month });
      monthCounts.push(0);
    }

    // Fetch all complaints with created_at to count in months
    const [allDates] = await db.query('SELECT created_at FROM complaints');
    allDates.forEach(item => {
      if (item.created_at) {
        const itemDate = new Date(item.created_at);
        const y = itemDate.getFullYear();
        const m = itemDate.getMonth() + 1;
        const idx = months.findIndex(bucket => bucket.year === y && bucket.month === m);
        if (idx !== -1) {
          monthCounts[idx]++;
        }
      }
    });

    // 5. Recent Activity Feed (Last 6 updates)
    const [recentActivity] = await db.query(`
      SELECT 
        cu.id, 
        cu.complaint_id, 
        cu.status, 
        cu.remarks, 
        cu.created_at,
        c.complaint_code,
        c.title AS complaint_title,
        u.name AS user_name,
        u.role AS user_role
      FROM complaint_updates cu
      JOIN complaints c ON cu.complaint_id = c.id
      JOIN users u ON cu.user_id = u.id
      ORDER BY cu.created_at DESC
      LIMIT 6
    `);

    return res.json({
      success: true,
      summary: {
        total,
        submitted: statusMap['Submitted'] || 0,
        assigned: statusMap['Assigned'] || 0,
        in_progress: statusMap['In Progress'] || 0,
        resolved: statusMap['Resolved'] || 0,
        verified: statusMap['Verified'] || 0,
        active_pending: (statusMap['Submitted'] || 0) + (statusMap['Assigned'] || 0) + (statusMap['In Progress'] || 0),
        resolution_rate: resolutionRate,
        avg_resolution_hours: avgHours,
        total_users: totalUsers,
        total_staff: totalStaff
      },
      charts: {
        byCategory: {
          labels: categoryRows.map(r => r.category),
          data: categoryRows.map(r => Number(r.count))
        },
        byStatus: {
          labels: ['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Verified'],
          data: [
            statusMap['Submitted'] || 0,
            statusMap['Assigned'] || 0,
            statusMap['In Progress'] || 0,
            statusMap['Resolved'] || 0,
            statusMap['Verified'] || 0
          ]
        },
        byPriority: {
          labels: ['Critical', 'High', 'Medium', 'Low'],
          data: [
            Number((priorityRows.find(r => r.priority === 'Critical') || {}).count || 0),
            Number((priorityRows.find(r => r.priority === 'High') || {}).count || 0),
            Number((priorityRows.find(r => r.priority === 'Medium') || {}).count || 0),
            Number((priorityRows.find(r => r.priority === 'Low') || {}).count || 0)
          ]
        },
        byLocation: {
          labels: locationRows.map(r => r.location),
          data: locationRows.map(r => Number(r.count))
        },
        monthlyTrends: {
          labels: months.map(m => m.label),
          data: monthCounts
        }
      },
      recentActivity
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate analytics data.'
    });
  }
};
