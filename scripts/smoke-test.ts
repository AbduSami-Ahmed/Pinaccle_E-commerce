/**
 * ==============================================================================
 * PINNACLE E-COMMERCE - PRODUCTION SMOKE TEST RUNNER
 * Verifies live endpoint responsiveness, database connectivity, and security headers.
 * Usage: npx ts-node scripts/smoke-test.ts [BASE_URL]
 * ==============================================================================
 */

const targetBaseUrl = process.argv[2] || process.env.TARGET_URL || 'http://localhost:4000';
const isHttps = targetBaseUrl.startsWith('https://');

interface CheckResult {
  name: string;
  url: string;
  status: 'PASS' | 'FAIL';
  statusCode: number;
  durationMs: number;
  details?: string;
}

const checks: CheckResult[] = [];

async function performCheck(
  name: string,
  path: string,
  validator: (res: Response, bodyText: string) => Promise<{ pass: boolean; details?: string }>,
) {
  const url = `${targetBaseUrl.replace(/\/$/, '')}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Pinnacle-SmokeTest-Agent/1.0',
        Accept: 'application/json, text/html, */*',
      },
    });
    const durationMs = Date.now() - start;
    const bodyText = await res.text();
    const validation = await validator(res, bodyText);

    checks.push({
      name,
      url,
      status: validation.pass ? 'PASS' : 'FAIL',
      statusCode: res.status,
      durationMs,
      details: validation.details,
    });
  } catch (err: any) {
    const durationMs = Date.now() - start;
    checks.push({
      name,
      url,
      status: 'FAIL',
      statusCode: 0,
      durationMs,
      details: `Network/Fetch Error: ${err.message}`,
    });
  }
}

async function runSmokeTests() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Production Smoke Tests against: ${targetBaseUrl}`);
  console.log(`======================================================\n`);

  // 1. API Health Check
  await performCheck('API Health & Database Probe', '/api/v1/health', async (res, body) => {
    if (res.status !== 200) {
      return { pass: false, details: `Expected 200, got ${res.status}` };
    }
    try {
      const json = JSON.parse(body);
      const isOk = json.status === 'ok' || json.status === 'healthy';
      return {
        pass: isOk,
        details: isOk ? `Status: ${json.status}` : `Unexpected body: ${body}`,
      };
    } catch {
      return { pass: false, details: 'Response was not valid JSON' };
    }
  });

  // 2. Security Headers on API
  await performCheck('API Security Headers Verification', '/api/v1/health', async (res) => {
    const nosniff = res.headers.get('x-content-type-options');
    const xss = res.headers.get('x-xss-protection');
    const hsts = res.headers.get('strict-transport-security');

    const issues: string[] = [];
    if (nosniff !== 'nosniff') issues.push('Missing/invalid X-Content-Type-Options: nosniff');
    if (isHttps && !hsts) issues.push('Missing Strict-Transport-Security on HTTPS');

    return {
      pass: issues.length === 0,
      details: issues.length === 0 ? 'All security headers present' : issues.join(', '),
    };
  });

  // 3. Catalog Search Endpoint
  await performCheck('Catalog Search Query Probe', '/api/v1/storefront/search?pageSize=1', async (res, body) => {
    if (res.status !== 200) {
      return { pass: false, details: `Expected 200, got ${res.status}` };
    }
    try {
      const json = JSON.parse(body);
      const hasData = Array.isArray(json.data);
      return {
        pass: hasData,
        details: `Returned ${json.data?.length ?? 0} items (Total: ${json.meta?.total ?? 'N/A'})`,
      };
    } catch {
      return { pass: false, details: 'Failed to parse JSON response' };
    }
  });

  // 4. Rate Limiter Probe
  await performCheck('Rate Limiting Response Headers', '/api/v1/storefront/search?pageSize=1', async (res) => {
    const limitHeader = res.headers.get('x-ratelimit-limit');
    const remainingHeader = res.headers.get('x-ratelimit-remaining');

    const pass = limitHeader !== null;
    return {
      pass,
      details: pass
        ? `Limit: ${limitHeader}, Remaining: ${remainingHeader}`
        : 'X-RateLimit headers not returned by reverse proxy/app',
    };
  });

  // 5. Output Summary Table
  console.log('Test Results:');
  console.log('--------------------------------------------------------------------------------------------------');
  let failures = 0;
  for (const c of checks) {
    const symbol = c.status === 'PASS' ? '✅' : '❌';
    console.log(
      `${symbol} [${c.status}] ${c.name.padEnd(35)} | HTTP ${String(c.statusCode).padEnd(3)} | ${String(c.durationMs).padStart(4)}ms | ${c.details || ''}`,
    );
    if (c.status === 'FAIL') failures++;
  }
  console.log('--------------------------------------------------------------------------------------------------');

  if (failures > 0) {
    console.error(`\n❌ SMOKE TEST FAILED: ${failures} check(s) did not pass. Deployment validation failed.\n`);
    process.exit(1);
  } else {
    console.log(`\n✅ ALL SMOKE TESTS PASSED: Target environment is responsive and operational.\n`);
    process.exit(0);
  }
}

runSmokeTests();

