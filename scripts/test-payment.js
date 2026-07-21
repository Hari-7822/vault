import http from 'http';
import https from 'https';

const BASE_URL = process.env.TEST_BASE_URL || 'https://dimdot.onrender.com';
const API = `${BASE_URL}/api`;

const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'admin001@email.com';
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASS || 'admin@001';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin001@email.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASS || 'admin@001';

function request(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const payload = body ? JSON.stringify(body) : null;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}


async function run() {
  console.log('\n🧪 Payment Integration Tests');
  console.log('═'.repeat(50));
  console.log(`  Server: ${BASE_URL}\n`);

  console.log('1️⃣  Admin Login');
  const adminRes = await request('POST', `${API}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const adminToken = adminRes.body?.token;
  assert('Admin login returns token', !!adminToken, `status ${adminRes.status}`);
  if (!adminToken) {
    console.log('\n⚠️  Cannot continue without admin token. Check ADMIN credentials.\n');
    process.exit(1);
  }

  console.log('\n2️⃣  Customer Login');
  const custRes = await request('POST', `${API}/auth/login`, {
    email: CUSTOMER_EMAIL,
    password: CUSTOMER_PASSWORD,
  });
  const custToken = custRes.body?.token;
  assert('Customer login returns token', !!custToken, `status ${custRes.status}`);
  if (!custToken) {
    console.log('\n⚠️  Cannot continue without customer token. Check CUSTOMER credentials.\n');
    process.exit(1);
  }

  console.log('\n3️⃣  Admin Enables Weekend Payment');
  const enableRes = await request(
    'PUT',
    `${API}/settings/isWeekendPaymentEnabled`,
    { value: true, description: 'Enable payment for the week' },
    adminToken
  );
  assert(
    'Setting updated to true',
    enableRes.status === 200 && enableRes.body?.value === true,
    JSON.stringify(enableRes.body)
  );

  console.log('\n4️⃣  Customer — GET /billing/current');
  const billingRes = await request('GET', `${API}/billing/current`, null, custToken);
  assert('Returns 200', billingRes.status === 200);
  assert(
    'Response has isWeekendPaymentEnabled',
    billingRes.body?.isWeekendPaymentEnabled !== undefined
  );
  assert(
    'isWeekendPaymentEnabled is true',
    billingRes.body?.isWeekendPaymentEnabled === true
  );

  const invoice = billingRes.body?.currentInvoice;
  const hasInvoice = invoice && invoice.amount > 0;

  if (hasInvoice) {
    assert('currentInvoice has amount > 0', true);
    assert(
      'currentInvoice has orders array',
      Array.isArray(invoice.orders) && invoice.orders.length > 0
    );
    console.log(`     → Invoice amount: ₹${invoice.amount}`);
    console.log(`     → Orders count:   ${invoice.orders?.length || 0}`);
  } else {
    console.log(
      '  ⚠️  No pending invoice found. Skipping create-order & verify tests.'
    );
    console.log(
      '     → To create test data, run:\n' +
        '       POST /api/subscriptions/admin/mark-delivered\n' +
        '       { "userId": "<customer_id>", "paymentCollected": false }\n'
    );
  }

  if (hasInvoice) {
    console.log('\n5️⃣  Customer — POST /billing/create-order');
    const createRes = await request(
      'POST',
      `${API}/billing/create-order`,
      { amount: invoice.amount },
      custToken
    );
    assert('Returns 200', createRes.status === 200);
    assert('Response has success: true', createRes.body?.success === true);
    assert(
      'orderId starts with order_',
      typeof createRes.body?.orderId === 'string' &&
        createRes.body.orderId.startsWith('order_')
    );
    assert('keyId starts with rzp_test_', createRes.body?.keyId?.startsWith('rzp_test_'));
    assert(
      'amount in paise matches',
      createRes.body?.amount === Math.round(invoice.amount * 100)
    );

    const razorpayOrderId = createRes.body?.orderId;
    console.log(`     → Razorpay Order: ${razorpayOrderId}`);
    console.log(`     → Amount (paise): ${createRes.body?.amount}`);

    console.log('\n6️⃣  Customer — POST /billing/verify-payment (bad signature → 400)');
    const orderIds = invoice.orders.map((o) => o.orderId).filter(Boolean);
    const verifyRes = await request(
      'POST',
      `${API}/billing/verify-payment`,
      {
        razorpayOrderId: razorpayOrderId || 'order_fake',
        razorpayPaymentId: 'pay_test_fake123',
        razorpaySignature: 'invalid_signature_for_testing',
        orderIds,
      },
      custToken
    );
    assert(
      'Rejects bad signature with 400',
      verifyRes.status === 400,
      `got ${verifyRes.status}`
    );
    assert(
      'Error message mentions verification failed',
      (verifyRes.body?.message || '').toLowerCase().includes('verification failed')
    );

    console.log('\n6️⃣b Customer — POST /billing/verify-payment (missing params → 400)');
    const missingRes = await request(
      'POST',
      `${API}/billing/verify-payment`,
      { razorpayOrderId: 'order_fake' }, 
      custToken
    );
    assert(
      'Rejects missing params with 400',
      missingRes.status === 400,
      `got ${missingRes.status}`
    );
  }

  console.log('\n7️⃣  Edge Case — create-order with amount: 0');
  const zeroRes = await request(
    'POST',
    `${API}/billing/create-order`,
    { amount: 0 },
    custToken
  );
  assert('Rejects zero amount with 400', zeroRes.status === 400);

  console.log('\n7️⃣b Edge Case — create-order with negative amount');
  const negRes = await request(
    'POST',
    `${API}/billing/create-order`,
    { amount: -50 },
    custToken
  );
  assert('Rejects negative amount with 400', negRes.status === 400);

  console.log('\n8️⃣  Admin Disables Weekend Payment (cleanup)');
  const disableRes = await request(
    'PUT',
    `${API}/settings/isWeekendPaymentEnabled`,
    { value: false },
    adminToken
  );
  assert(
    'Setting updated to false',
    disableRes.status === 200,
    JSON.stringify(disableRes.body)
  );

  console.log('\n9️⃣  Customer — billing/current (payment disabled)');
  const billingOff = await request('GET', `${API}/billing/current`, null, custToken);
  assert(
    'isWeekendPaymentEnabled is false after disable',
    billingOff.body?.isWeekendPaymentEnabled === false
  );

  console.log('\n' + '═'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(50) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('\n💥 Unexpected error:', err.message);
  process.exit(1);
});