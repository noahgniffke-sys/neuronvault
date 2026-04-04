// index.js — NemoClaw Ops Sidecar: Unified Telegram bridge + ops commands
// Replaces telegram-bridge.js with added ops routing, approval workflows, and cron jobs

const https = require('https');
const { execSync, spawn } = require('child_process');
const path = require('path');
const cron = require('node-cron');

const {
  sendMessage,
  sendTyping,
  sendInlineKeyboard,
  answerCallbackQuery,
  getUpdates,
} = require('./lib/telegram');

// Ops command handlers
const { handleDeploy, handleDeployCallback } = require('./commands/deploy');
const { handleStatus } = require('./commands/status');
const { handleStats, generateDigest } = require('./commands/stats');
const { handleHealth, runAllChecks } = require('./commands/health');
const { handleLogs } = require('./commands/logs');

// ─── Config ──────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const SANDBOX_NAME = process.env.SANDBOX_NAME || 'my-assistant';
const BRAIN_API_URL = process.env.BRAIN_API_URL;
const BRAIN_API_KEY = process.env.BRAIN_API_KEY;

// Paths relative to the NemoClaw installation on the Pi
const NEMOCLAW_BASE = path.resolve(__dirname, '..');
const BIN_LIB = path.join(NEMOCLAW_BASE, 'bin', 'lib');

// Owner chat ID — discovered from first message if not set
let NOAH_CHAT_ID = process.env.NOAH_CHAT_ID || null;

// ─── Rate Limiting & State ───────────────────────────────────────────────────

const RATE_LIMIT_MS = 5000;
const lastMessageTime = new Map();
const busyChats = new Set();
let updateOffset = 0;

// ─── Sandbox Helpers (replicated from existing bridge) ───────────────────────

let resolveOpenshell;
let shellQuote;
let validateName;

try {
  resolveOpenshell = require(path.join(BIN_LIB, 'resolve-openshell'));
  const shellLib = require(path.join(BIN_LIB, 'shell'));
  shellQuote = shellLib.shellQuote || shellLib.quote;
  const nameLib = require(path.join(BIN_LIB, 'names'));
  validateName = nameLib.validateName || nameLib.validate;
} catch (err) {
  console.warn('[init] Could not load bin/lib helpers:', err.message);
  console.warn('[init] Sandbox forwarding will use fallback exec method');

  // Fallback implementations
  resolveOpenshell = null;
  shellQuote = (s) => `'${s.replace(/'/g, "'\\''")}'`;
  validateName = (n) => /^[a-zA-Z0-9_-]+$/.test(n);
}

/**
 * Run a message through the NemoClaw agent in the sandbox via SSH/openshell
 */
async function runAgentInSandbox(userMessage) {
  return new Promise((resolve, reject) => {
    const timeout = 120000; // 2 minutes

    let cmd, args;

    if (resolveOpenshell) {
      // Use openshell binary (same as original bridge)
      try {
        const openshellPath = resolveOpenshell();
        const escaped = shellQuote(userMessage);
        cmd = openshellPath;
        args = [SANDBOX_NAME, 'bash', '-c', `echo ${escaped} | nemoclaw-agent`];
      } catch (err) {
        // Fall back to SSH
        console.warn('[sandbox] openshell resolve failed, using ssh:', err.message);
        cmd = 'ssh';
        args = [SANDBOX_NAME, 'bash', '-c', `echo ${shellQuote(userMessage)} | nemoclaw-agent`];
      }
    } else {
      // Fallback: try direct SSH to sandbox
      cmd = 'ssh';
      args = [SANDBOX_NAME, 'bash', '-c', `echo ${shellQuote(userMessage)} | nemoclaw-agent`];
    }

    let stdout = '';
    let stderr = '';
    let finished = false;

    const proc = spawn(cmd, args, {
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (data) => (stdout += data.toString()));
    proc.stderr.on('data', (data) => (stderr += data.toString()));

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        proc.kill('SIGTERM');
        reject(new Error('Sandbox timeout (2 min)'));
      }
    }, timeout);

    proc.on('close', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);

      const output = stdout.trim() || stderr.trim();
      if (code === 0 && output) {
        resolve(output);
      } else if (output) {
        resolve(output); // Return output even on non-zero exit
      } else {
        reject(new Error(`Sandbox exited with code ${code}, no output`));
      }
    });

    proc.on('error', (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ─── Brain API Integration ───────────────────────────────────────────────────

/**
 * Search Brain knowledge base
 */
async function brainSearch(query) {
  return brainApiCall('/api/brain/search', { query });
}

/**
 * Save to Brain knowledge base
 */
async function brainSave(content, metadata = {}) {
  return brainApiCall('/api/brain/save', { content, metadata });
}

/**
 * Brain API helper
 */
function brainApiCall(endpoint, body) {
  return new Promise((resolve, reject) => {
    if (!BRAIN_API_URL || !BRAIN_API_KEY) {
      reject(new Error('Brain API not configured'));
      return;
    }

    const data = JSON.stringify(body);
    const url = new URL(endpoint, BRAIN_API_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Authorization: `Bearer ${BRAIN_API_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let chunks = '';
      res.on('data', (chunk) => (chunks += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(chunks));
        } catch {
          resolve({ raw: chunks });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ─── Command Routing ─────────────────────────────────────────────────────────

const COMMANDS = {
  // Original bridge commands
  '/start': handleStart,
  '/reset': handleReset,
  '/brain': handleBrain,
  '/save': handleSave,
  '/recall': handleRecall,

  // New ops commands
  '/deploy': (chatId, args) => handleDeploy(chatId, args),
  '/status': (chatId) => handleStatus(chatId),
  '/stats': (chatId) => handleStats(chatId),
  '/health': (chatId) => handleHealth(chatId),
  '/logs': (chatId, args) => handleLogs(chatId, args),
  '/approve': handleApprove,
  '/help': handleHelp,
};

async function handleStart(chatId) {
  await sendMessage(
    chatId,
    '🐙 *NemoClaw Ops Sidecar*\n\n' +
      'I bridge your messages to the NemoClaw agent and handle ops commands.\n\n' +
      '*Chat Commands:*\n' +
      '/start — This message\n' +
      '/reset — Reset agent conversation\n' +
      '/brain <query> — Search knowledge base\n' +
      '/save <content> — Save to knowledge base\n' +
      '/recall <query> — Recall from knowledge base\n\n' +
      '*Ops Commands:*\n' +
      '/deploy [target] — Trigger Vercel deploy\n' +
      '/status — PM2 + Uptime Kuma status\n' +
      '/stats — NeuronVault metrics\n' +
      '/health — Service connectivity check\n' +
      '/logs [service] [lines] — PM2 logs\n' +
      '/help — Show this message\n\n' +
      'Any other message is forwarded to the NemoClaw agent.',
    { parse_mode: 'Markdown' }
  );
}

async function handleReset(chatId) {
  try {
    await runAgentInSandbox('/reset');
    await sendMessage(chatId, '🔄 Agent conversation reset.');
  } catch (err) {
    await sendMessage(chatId, `❌ Reset failed: ${err.message}`);
  }
}

async function handleBrain(chatId, query) {
  if (!query) {
    await sendMessage(chatId, 'Usage: /brain <search query>');
    return;
  }

  await sendTyping(chatId);

  try {
    const result = await brainSearch(query);
    if (result.results && result.results.length > 0) {
      const formatted = result.results
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.content || r.text || JSON.stringify(r)}`)
        .join('\n\n');
      await sendMessage(chatId, `🧠 *Brain Search Results:*\n\n${formatted}`, {
        parse_mode: 'Markdown',
      });
    } else {
      await sendMessage(chatId, '🧠 No results found in knowledge base.');
    }
  } catch (err) {
    await sendMessage(chatId, `❌ Brain search failed: ${err.message}`);
  }
}

async function handleSave(chatId, content) {
  if (!content) {
    await sendMessage(chatId, 'Usage: /save <content to save>');
    return;
  }

  await sendTyping(chatId);

  try {
    const result = await brainSave(content, {
      source: 'telegram',
      saved_by: chatId.toString(),
      saved_at: new Date().toISOString(),
    });
    await sendMessage(chatId, '🧠 Saved to knowledge base.');
  } catch (err) {
    await sendMessage(chatId, `❌ Save failed: ${err.message}`);
  }
}

async function handleRecall(chatId, query) {
  // Recall is the same as brain search but with friendlier language
  if (!query) {
    await sendMessage(chatId, 'Usage: /recall <what to remember>');
    return;
  }

  await sendTyping(chatId);

  try {
    const result = await brainSearch(query);
    if (result.results && result.results.length > 0) {
      const top = result.results[0];
      const content = top.content || top.text || JSON.stringify(top);
      await sendMessage(chatId, `💡 *Recalled:*\n\n${content}`, {
        parse_mode: 'Markdown',
      });
    } else {
      await sendMessage(chatId, "🤔 I don't recall anything about that.");
    }
  } catch (err) {
    await sendMessage(chatId, `❌ Recall failed: ${err.message}`);
  }
}

async function handleApprove(chatId, taskId) {
  if (!taskId) {
    await sendMessage(chatId, 'Usage: /approve <task_id>');
    return;
  }
  // Manual approval — trigger deploy callback directly
  await handleDeployCallback(`deploy_approve:${taskId.trim()}`, chatId, null);
}

async function handleHelp(chatId) {
  await handleStart(chatId);
}

// ─── Message Processing ──────────────────────────────────────────────────────

async function processMessage(msg) {
  const chatId = msg.chat?.id;
  const text = msg.text?.trim();

  if (!chatId || !text) return;

  // Discover/store owner chat ID from first message
  if (!NOAH_CHAT_ID) {
    NOAH_CHAT_ID = chatId.toString();
    console.log(`[bridge] Owner chat ID discovered: ${NOAH_CHAT_ID}`);
  }

  // Rate limiting
  const now = Date.now();
  const lastTime = lastMessageTime.get(chatId) || 0;
  if (now - lastTime < RATE_LIMIT_MS) {
    console.log(`[bridge] Rate limited chat ${chatId}`);
    return;
  }
  lastMessageTime.set(chatId, now);

  // Check if this is a command
  if (text.startsWith('/')) {
    const spaceIdx = text.indexOf(' ');
    const command = spaceIdx === -1 ? text.toLowerCase() : text.slice(0, spaceIdx).toLowerCase();
    const args = spaceIdx === -1 ? '' : text.slice(spaceIdx + 1).trim();

    // Strip @botname suffix from commands (e.g. /status@trident_nemoclaw_bot)
    const cleanCommand = command.split('@')[0];

    const handler = COMMANDS[cleanCommand];
    if (handler) {
      try {
        await handler(chatId, args);
      } catch (err) {
        console.error(`[command] ${cleanCommand} error:`, err);
        await sendMessage(chatId, `❌ Command failed: ${err.message}`);
      }
      return;
    }
  }

  // Not a command — forward to NemoClaw agent
  await forwardToAgent(chatId, text);
}

/**
 * Forward a message to the sandbox agent
 */
async function forwardToAgent(chatId, text) {
  // Busy check — one message at a time per chat
  if (busyChats.has(chatId)) {
    await sendMessage(chatId, '⏳ Still processing your last message...');
    return;
  }

  busyChats.add(chatId);
  await sendTyping(chatId);

  try {
    const response = await runAgentInSandbox(text);
    await sendMessage(chatId, response);
  } catch (err) {
    console.error(`[agent] Error:`, err);
    await sendMessage(chatId, `❌ Agent error: ${err.message}`);
  } finally {
    busyChats.delete(chatId);
  }
}

// ─── Callback Query Handling (Inline Keyboard Buttons) ───────────────────────

async function processCallbackQuery(query) {
  const callbackId = query.id;
  const data = query.data;
  const chatId = query.message?.chat?.id;
  const messageId = query.message?.message_id;

  if (!data || !chatId) {
    await answerCallbackQuery(callbackId, 'Invalid callback');
    return;
  }

  try {
    if (data.startsWith('deploy_approve:') || data.startsWith('deploy_cancel:')) {
      await handleDeployCallback(data, chatId, messageId);
      await answerCallbackQuery(callbackId, data.startsWith('deploy_approve') ? 'Approved!' : 'Cancelled');
    } else {
      await answerCallbackQuery(callbackId, 'Unknown action');
    }
  } catch (err) {
    console.error('[callback] Error:', err);
    await answerCallbackQuery(callbackId, `Error: ${err.message}`);
  }
}

// ─── Cron Jobs ───────────────────────────────────────────────────────────────

function setupCronJobs() {
  // Every 6 hours: health check, alert if anything is down
  cron.schedule('0 */6 * * *', async () => {
    console.log('[cron] Running 6-hourly health check');
    try {
      const checks = await runAllChecks();
      const failures = checks.filter((c) => !c.ok);

      if (failures.length > 0 && NOAH_CHAT_ID) {
        const lines = ['🚨 *Health Alert*\n'];
        for (const f of failures) {
          lines.push(`❌ *${f.name}* — ${f.detail || 'FAIL'}`);
        }
        await sendMessage(NOAH_CHAT_ID, lines.join('\n'), { parse_mode: 'Markdown' });
      } else {
        console.log('[cron] Health check passed — all services OK');
      }
    } catch (err) {
      console.error('[cron] Health check error:', err);
    }
  });

  // Daily at 8 AM: stats digest
  cron.schedule('0 8 * * *', async () => {
    console.log('[cron] Running daily digest');
    try {
      if (NOAH_CHAT_ID) {
        const digest = await generateDigest();
        await sendMessage(NOAH_CHAT_ID, digest, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      console.error('[cron] Daily digest error:', err);
    }
  });

  // Hourly: check for failed tasks in Supabase
  cron.schedule('0 * * * *', async () => {
    console.log('[cron] Checking for failed tasks');
    try {
      const { getClient } = require('./lib/supabase');
      const supabase = getClient();

      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: failedTasks, error } = await supabase
        .from('nemoclaw_tasks')
        .select('*')
        .eq('status', 'failed')
        .gte('updated_at', since);

      if (error) throw error;

      if (failedTasks && failedTasks.length > 0 && NOAH_CHAT_ID) {
        const lines = [`⚠️ *${failedTasks.length} Failed Task(s) (last hour)*\n`];
        for (const task of failedTasks) {
          lines.push(`• ${task.type}: ${task.target || 'N/A'} (${task.id})`);
        }
        await sendMessage(NOAH_CHAT_ID, lines.join('\n'), { parse_mode: 'Markdown' });
      }
    } catch (err) {
      // Supabase might not be configured yet — just log
      console.error('[cron] Failed tasks check error:', err.message);
    }
  });

  console.log('[cron] Scheduled: health check (6h), daily digest (8am), failed tasks (1h)');
}

// ─── Main Polling Loop ───────────────────────────────────────────────────────

async function pollLoop() {
  console.log('[bridge] Starting long-poll loop...');

  while (true) {
    try {
      const response = await getUpdates(updateOffset, 30);

      if (!response.ok) {
        console.error('[bridge] getUpdates failed:', response.description);
        await sleep(5000);
        continue;
      }

      const updates = response.result || [];

      for (const update of updates) {
        updateOffset = update.update_id + 1;

        try {
          if (update.message) {
            await processMessage(update.message);
          } else if (update.callback_query) {
            await processCallbackQuery(update.callback_query);
          }
        } catch (err) {
          console.error('[bridge] Update processing error:', err);
        }
      }
    } catch (err) {
      console.error('[bridge] Poll error:', err.message);
      await sleep(5000);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Startup ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== NemoClaw Ops Sidecar ===');
  console.log(`[init] Bot token: ${BOT_TOKEN ? '***' + BOT_TOKEN.slice(-6) : 'MISSING'}`);
  console.log(`[init] NVIDIA API: ${NVIDIA_API_KEY ? 'configured' : 'MISSING'}`);
  console.log(`[init] Sandbox: ${SANDBOX_NAME}`);
  console.log(`[init] Brain API: ${BRAIN_API_URL || 'not configured'}`);
  console.log(`[init] Supabase: ${process.env.SUPABASE_URL ? 'configured' : 'not configured'}`);
  console.log(`[init] Deploy hook: ${process.env.VERCEL_DEPLOY_HOOK ? 'configured' : 'not configured'}`);
  console.log(`[init] Owner chat: ${NOAH_CHAT_ID || 'will discover from first message'}`);

  if (!BOT_TOKEN) {
    console.error('[FATAL] TELEGRAM_BOT_TOKEN is required');
    process.exit(1);
  }

  // Set up cron jobs
  setupCronJobs();

  // Start polling
  await pollLoop();
}

main().catch((err) => {
  console.error('[FATAL] Unhandled error:', err);
  process.exit(1);
});
