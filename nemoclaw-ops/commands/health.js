// commands/health.js — Connectivity checks for all services
const https = require('https');
const { getClient } = require('../lib/supabase');
const { sendMessage, sendTyping } = require('../lib/telegram');

/**
 * Handle /health command
 */
async function handleHealth(chatId) {
  await sendTyping(chatId);

  const checks = await runAllChecks();

  const lines = [];
  lines.push('🏥 *Health Check*\n');

  for (const check of checks) {
    const icon = check.ok ? '✅' : '❌';
    lines.push(`${icon} *${check.name}* — ${check.ok ? 'OK' : 'FAIL'}${check.detail ? ` (${check.detail})` : ''}`);
    if (check.latency) {
      lines.push(`   Latency: ${check.latency}ms`);
    }
  }

  const allOk = checks.every((c) => c.ok);
  lines.push(`\n${allOk ? '✅ All systems operational' : '⚠️ Issues detected'}`);

  await sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });

  return checks;
}

/**
 * Run all health checks (also used by cron)
 */
async function runAllChecks() {
  const checks = await Promise.all([
    checkSupabase(),
    checkVercel(),
    checkNvidiaApi(),
  ]);
  return checks;
}

/**
 * Check Supabase connectivity
 */
async function checkSupabase() {
  const start = Date.now();
  try {
    const supabase = getClient();
    // Simple query to verify connectivity
    const { error } = await supabase
      .from('nv_profiles')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;
    return { name: 'Supabase', ok: true, latency: Date.now() - start };
  } catch (err) {
    return { name: 'Supabase', ok: false, detail: err.message, latency: Date.now() - start };
  }
}

/**
 * Check Vercel app response
 */
async function checkVercel() {
  const start = Date.now();
  try {
    const url = process.env.SUPABASE_URL
      ? process.env.SUPABASE_URL.replace('supabase.co', 'vercel.app')
      : null;

    // Just check if neuronvault site responds
    const status = await httpsHead('https://neuronvault.vercel.app');
    return {
      name: 'Vercel App',
      ok: status >= 200 && status < 400,
      detail: `HTTP ${status}`,
      latency: Date.now() - start,
    };
  } catch (err) {
    return { name: 'Vercel App', ok: false, detail: err.message, latency: Date.now() - start };
  }
}

/**
 * Check NVIDIA API endpoint
 */
async function checkNvidiaApi() {
  const start = Date.now();
  try {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return { name: 'NVIDIA API', ok: false, detail: 'No API key configured' };
    }

    // Hit the models endpoint to verify connectivity
    const status = await httpsGet('https://integrate.api.nvidia.com/v1/models', {
      Authorization: `Bearer ${apiKey}`,
    });
    return {
      name: 'NVIDIA API',
      ok: status >= 200 && status < 400,
      detail: `HTTP ${status}`,
      latency: Date.now() - start,
    };
  } catch (err) {
    return { name: 'NVIDIA API', ok: false, detail: err.message, latency: Date.now() - start };
  }
}

/**
 * HTTPS HEAD request — returns status code
 */
function httpsHead(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'HEAD',
        timeout: 10000,
      },
      (res) => resolve(res.statusCode)
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

/**
 * HTTPS GET request — returns status code
 */
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers,
        timeout: 10000,
      },
      (res) => {
        // Consume body so socket is freed
        res.on('data', () => {});
        res.on('end', () => resolve(res.statusCode));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

module.exports = { handleHealth, runAllChecks };
