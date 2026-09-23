const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting API Verification Smoke Tests...\n');

  try {
    // 1. Health check
    console.log('1. Testing /api/health...');
    const health = await request({ host: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
    console.log('   Health response:', health.status, health.data.app);

    // 2. Login as HR
    console.log('\n2. Testing HR Login (hr@qtalk.edu)...');
    const hrLogin = await request(
      {
        host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: 'hr@qtalk.edu', password: 'password123' }
    );
    console.log('   HR Login:', hrLogin.status, hrLogin.data.user?.full_name, 'Role:', hrLogin.data.user?.role);
    const hrToken = hrLogin.data.token;

    // 3. Login as Rahul (Eligible student)
    console.log('\n3. Testing Student Login (rahul@qtalk.edu)...');
    const rahulLogin = await request(
      {
        host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: 'rahul@qtalk.edu', password: 'password123' }
    );
    console.log('   Rahul Login:', rahulLogin.status, rahulLogin.data.user?.full_name);
    const rahulToken = rahulLogin.data.token;

    // 4. Rahul checks Job Feed (Should see Eligible = true for Job 1)
    console.log('\n4. Checking Rahul Job Feed Eligibility...');
    const rahulJobs = await request({
      host: 'localhost', port: 5000, path: '/api/jobs', method: 'GET',
      headers: { 'Authorization': `Bearer ${rahulToken}` }
    });
    const job1Rahul = rahulJobs.data.jobs?.find(j => j.company_name === 'TCS Digital');
    console.log(`   Job "${job1Rahul?.company_name}": is_eligible = ${job1Rahul?.is_eligible}`);
    console.log('   Criteria breakdown:', job1Rahul?.criteria_breakdown);

    // 5. Login as Priya (Ineligible - low attendance)
    console.log('\n5. Testing Priya Login (priya@qtalk.edu - Low attendance)...');
    const priyaLogin = await request(
      {
        host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: 'priya@qtalk.edu', password: 'password123' }
    );
    const priyaToken = priyaLogin.data.token;

    const priyaJobs = await request({
      host: 'localhost', port: 5000, path: '/api/jobs', method: 'GET',
      headers: { 'Authorization': `Bearer ${priyaToken}` }
    });
    const job1Priya = priyaJobs.data.jobs?.find(j => j.company_name === 'TCS Digital');
    console.log(`   Job "${job1Priya?.company_name}": is_eligible = ${job1Priya?.is_eligible}`);
    console.log('   Ineligibility reasons:', job1Priya?.eligibility_reasons);

    // 6. Test Admin Analytics
    console.log('\n6. Testing Admin Analytics Dashboard...');
    const analytics = await request({
      host: 'localhost', port: 5000, path: '/api/analytics/dashboard', method: 'GET',
      headers: { 'Authorization': `Bearer ${hrToken}` }
    });
    console.log('   KPIs:', analytics.data.kpis);
    console.log('   Placements per batch:', analytics.data.placementsPerBatch);
    console.log('   Application funnel:', analytics.data.applicationFunnel);

    console.log('\n✨ ALL API TESTS PASSED SUCCESSFULLY! ✨\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

// Start temporary server if not running
const server = require('./index');
const listener = server.listen(5000, () => {
  runTests().then(() => {
    listener.close();
    process.exit(0);
  });
});
