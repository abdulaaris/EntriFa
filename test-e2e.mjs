// Automated Integration & Security Verification Script for EntriFa
const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('==================================================');
  console.log(' Starting EntriFa SaaS Automated Verification');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Health Check
  const healthRes = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
  assert(healthRes.status === 'online', 'Health endpoint reports online status');

  // 2. Super Admin Login
  const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'superadmin', password: 'admin123' })
  }).then(r => r.json());
  assert(adminLogin.user?.role === 'SUPER_ADMIN', 'Super Admin logged in successfully');
  const adminToken = adminLogin.token;

  // 3. Client Admin Login (iFa Traders)
  const clientLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@ifatraders.com', password: 'client123' })
  }).then(r => r.json());
  assert(clientLogin.user?.role === 'CLIENT_ADMIN', 'Client Admin (iFa Traders) logged in successfully');
  assert(clientLogin.tenant?.name === 'iFa Traders', 'Tenant workspace identified as iFa Traders');
  const clientToken = clientLogin.token;

  // 4. Staff Login (Salman - Sales)
  const staffLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'sales@ifatraders.com', password: 'staff123' })
  }).then(r => r.json());
  assert(staffLogin.user?.role === 'STAFF', 'Staff user logged in with role STAFF');
  assert(staffLogin.user?.permissions?.customers?.view === true, 'Staff has customers:view permission');

  // 5. Tenant Isolation Verification
  // Metro Grocers client admin
  const metroLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'suresh@metrogrocers.com', password: 'client123' })
  }).then(r => r.json());
  const metroToken = metroLogin.token;

  // iFa Traders has customer "cust_rashid". Metro Grocers attempts to fetch it:
  const crossTenantAttempt = await fetch(`${BASE_URL}/api/customers/cust_rashid`, {
    headers: { Authorization: `Bearer ${metroToken}` }
  });
  assert(crossTenantAttempt.status === 404, 'Cross-tenant IDOR attack blocked (status 404)');

  // 6. Dynamic Module Gatekeeper Verification
  // Metro Grocers does NOT have "invoices" module enabled.
  const moduleBlockedAttempt = await fetch(`${BASE_URL}/api/invoices`, {
    headers: { Authorization: `Bearer ${metroToken}` }
  });
  const blockJson = await moduleBlockedAttempt.json();
  assert(moduleBlockedAttempt.status === 403, 'Disabled module is blocked at API level with 403 Forbidden');
  assert(blockJson.isModuleBlocked === true, 'Module Gatekeeper flagged isModuleBlocked = true');

  // 7. Digital Ledger Running Balance Test:
  // Prompt requirement:
  // "Opening Balance: ₹10,000
  //  GIVE ₹2,000 -> Balance = ₹12,000
  //  GET ₹5,000 -> Balance = ₹7,000
  //  All calculations must update automatically."
  const testCustomer = await fetch(`${BASE_URL}/api/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clientToken}`
    },
    body: JSON.stringify({
      name: 'Verification Customer Test',
      mobile: '+91 99999 12345',
      openingBalance: 10000
    })
  }).then(r => r.json());
  assert(testCustomer.currentBalance === 10000, 'Customer created with Opening Balance ₹10,000');

  // GIVE ₹2,000
  const giveTxn = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clientToken}`
    },
    body: JSON.stringify({
      customerId: testCustomer.id,
      type: 'GIVE',
      amount: 2000,
      description: 'Test Credit Given'
    })
  }).then(r => r.json());
  assert(giveTxn.newBalance === 12000, 'GIVE ₹2,000 -> Running Balance updated to ₹12,000');

  // GET ₹5,000
  const getTxn = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clientToken}`
    },
    body: JSON.stringify({
      customerId: testCustomer.id,
      type: 'GET',
      amount: 5000,
      description: 'Test Payment Received'
    })
  }).then(r => r.json());
  assert(getTxn.newBalance === 7000, 'GET ₹5,000 -> Running Balance updated to ₹7,000');

  // 8. Super Admin Impersonation Test ("Login as Client")
  const impersonateRes = await fetch(`${BASE_URL}/api/auth/impersonate/tenant_ifa_traders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  }).then(r => r.json());
  assert(impersonateRes.user?.isImpersonating === true, 'Super Admin successfully generated Client Impersonation token');
  assert(impersonateRes.tenant?.id === 'tenant_ifa_traders', 'Impersonation token scoped to target tenant');

  // 9. Day Book and P&L Reports Verification
  const daybookRes = await fetch(`${BASE_URL}/api/reports/daybook`, {
    headers: { Authorization: `Bearer ${clientToken}` }
  }).then(r => r.json());
  assert(Array.isArray(daybookRes.entries) && daybookRes.entries.length > 0, 'Day Book report successfully calculated daily entries');

  const pnlRes = await fetch(`${BASE_URL}/api/reports/pnl`, {
    headers: { Authorization: `Bearer ${clientToken}` }
  }).then(r => r.json());
  assert(typeof pnlRes.netProfit === 'number', 'P&L report successfully computed net profit');

  console.log('\n==================================================');
  console.log(` Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
