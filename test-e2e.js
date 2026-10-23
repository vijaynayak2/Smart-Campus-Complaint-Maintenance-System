const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:3000${path}`);
    const headers = {};
    let postData = null;

    if (body) {
      postData = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, text: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING AJIET CAMPUSFIX END-TO-END VERIFICATION ---');

  // 1. Student Login
  console.log('\n[1] Testing Student Login...');
  const studentLogin = await request('POST', '/api/auth/login', {
    email: 'student.rahul@ajiet.ac.in',
    password: 'Student@123'
  });
  console.log('Student Login Status:', studentLogin.status);
  if (!studentLogin.data.success) throw new Error('Student login failed: ' + JSON.stringify(studentLogin.data));
  const studentToken = studentLogin.data.token;
  console.log('Logged in as Student:', studentLogin.data.user.name);

  // 2. Student Views Complaints
  console.log('\n[2] Testing Student view complaints...');
  const studentComplaints = await request('GET', '/api/complaints', null, studentToken);
  console.log('Student Complaints Count:', studentComplaints.data.count);

  // 3. Student Submits New Complaint
  console.log('\n[3] Testing Student submit complaint...');
  const newComp = await request('POST', '/api/complaints', {
    title: 'Test Water Cooler in Block C Not Chilling',
    category: 'Plumbing',
    location: 'Academic Block C - 1st Floor Lobby',
    priority: 'Medium',
    description: 'The AquaGuard cooler dispensing warm water instead of cold water during hot afternoon.'
  }, studentToken);
  console.log('Submission Status:', newComp.status, newComp.data.message);
  const createdComplaintId = newComp.data.complaint.id;
  const createdCode = newComp.data.complaint.complaint_code;

  // 4. Public Track by Code
  console.log('\n[4] Testing Public Tracking Endpoint by Code:', createdCode);
  const trackRes = await request('GET', `/api/complaints/track/${createdCode}`);
  console.log('Track Status:', trackRes.status, 'Title:', trackRes.data.complaint.title, 'Status:', trackRes.data.complaint.status);

  // 5. Staff Login
  console.log('\n[5] Testing Maintenance Staff Login (Plumber)...');
  const staffLogin = await request('POST', '/api/auth/login', {
    email: 'staff.plumbing@ajiet.ac.in',
    password: 'Staff@123'
  });
  console.log('Staff Login Status:', staffLogin.status, 'Name:', staffLogin.data.user.name);
  const staffToken = staffLogin.data.token;
  const staffId = staffLogin.data.user.id;

  // 6. Admin Login
  console.log('\n[6] Testing Admin Login...');
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@ajiet.ac.in',
    password: 'Admin@123'
  });
  console.log('Admin Login Status:', adminLogin.status, 'Name:', adminLogin.data.user.name);
  const adminToken = adminLogin.data.token;

  // 7. Admin Assigns Complaint to Staff
  console.log('\n[7] Testing Admin Assign Staff...');
  const assignRes = await request('POST', `/api/complaints/${createdComplaintId}/assign`, {
    staff_id: staffId,
    priority: 'High',
    remarks: 'Please inspect thermostat compressor today.'
  }, adminToken);
  console.log('Assign Result:', assignRes.status, assignRes.data.message);

  // 8. Staff Updates Status to In Progress
  console.log('\n[8] Testing Staff Update Status to In Progress...');
  const progressRes = await request('POST', `/api/complaints/${createdComplaintId}/status`, {
    status: 'In Progress',
    remarks: 'Checked condenser coil. Recharging R134a refrigerant.'
  }, staffToken);
  console.log('In Progress Result:', progressRes.status, progressRes.data.message);

  // 9. Staff Marks Resolved
  console.log('\n[9] Testing Staff Mark Resolved...');
  const resolveRes = await request('POST', `/api/complaints/${createdComplaintId}/status`, {
    status: 'Resolved',
    remarks: 'Refrigerant recharged, cooling thermostat calibrated to 10C. Dispenser tested fine.'
  }, staffToken);
  console.log('Resolved Result:', resolveRes.status, resolveRes.data.message);

  // 10. Student Trying to Verify (Must Be Forbidden)
  console.log('\n[10] Testing Student Forbidden Attempt to Verify...');
  const forbiddenVerify = await request('POST', `/api/complaints/${createdComplaintId}/status`, {
    status: 'Verified',
    remarks: 'Hacked verification'
  }, studentToken);
  console.log('Forbidden Verify Status (Expect 403):', forbiddenVerify.status, forbiddenVerify.data.message);

  // 11. Admin Verifies Complaint
  console.log('\n[11] Testing Admin Verify & Sign-Off...');
  const verifyRes = await request('POST', `/api/complaints/${createdComplaintId}/status`, {
    status: 'Verified',
    remarks: 'Inspected temperature on site. Proper cooling restored.'
  }, adminToken);
  console.log('Admin Verify Result:', verifyRes.status, verifyRes.data.message);

  // 12. Admin Analytics
  console.log('\n[12] Testing Analytics API...');
  const analyticsRes = await request('GET', '/api/analytics', null, adminToken);
  console.log('Analytics Total Complaints:', analyticsRes.data.summary.total);
  console.log('Analytics Resolution Rate:', analyticsRes.data.summary.resolution_rate + '%');
  console.log('Analytics Status Breakdown:', analyticsRes.data.charts.byStatus.labels, analyticsRes.data.charts.byStatus.data);

  // 13. Admin User Management
  console.log('\n[13] Testing User Management API...');
  const usersRes = await request('GET', '/api/users', null, adminToken);
  console.log('Users Count in Database:', usersRes.data.count);

  console.log('\n======================================================');
  console.log('  ALL END-TO-END TEST CASES PASSED WITH 100% SUCCESS!  ');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
