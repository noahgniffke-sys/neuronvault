// commands/deploy.js — Vercel deployment trigger with approval workflow
const https = require('https');
const { getClient } = require('../lib/supabase');
const { sendMessage, sendInlineKeyboard, editMessageText } = require('../lib/telegram');

// In-memory pending deploys (keyed by task ID)
const pendingDeploys = new Map();

/**
 * Initiate a deploy — sends approval request with inline buttons
 */
async function handleDeploy(chatId, args) {
  const target = args || 'neuronvault';
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK;

  if (!hookUrl) {
    await sendMessage(chatId, '⚠️ VERCEL_DEPLOY_HOOK not configured.');
    return;
  }

  // Create a task record in Supabase
  const taskId = Date.now().toString(36);
  const supabase = getClient();

  try {
    await supabase.from('nemoclaw_tasks').insert({
      id: taskId,
      type: 'deploy',
      target,
      status: 'pending_approval',
      requested_at: new Date().toISOString(),
      requested_by: chatId.toString(),
    });
  } catch (err) {
    console.error('[deploy] Supabase insert error:', err.message);
    // Continue even if Supabase is down — the deploy can still work
  }

  pendingDeploys.set(taskId, { target, hookUrl, chatId });

  await sendInlineKeyboard(
    chatId,
    `🚀 Deploy "${target}" to Vercel?\n\nThis will trigger a production deployment.`,
    [
      [
        { text: '✅ Approve', callback_data: `deploy_approve:${taskId}` },
        { text: '❌ Cancel', callback_data: `deploy_cancel:${taskId}` },
      ],
    ]
  );
}

/**
 * Handle approval/cancellation callback
 */
async function handleDeployCallback(callbackData, chatId, messageId) {
  const [action, taskId] = callbackData.split(':');
  const pending = pendingDeploys.get(taskId);

  if (!pending) {
    await editMessageText(chatId, messageId, '⚠️ Deploy request expired or not found.');
    return;
  }

  pendingDeploys.delete(taskId);

  if (action === 'deploy_cancel') {
    await updateTaskStatus(taskId, 'cancelled');
    await editMessageText(chatId, messageId, `❌ Deploy "${pending.target}" cancelled.`);
    return;
  }

  // Approved — trigger deploy
  await editMessageText(chatId, messageId, `⏳ Deploying "${pending.target}"...`);
  await updateTaskStatus(taskId, 'in_progress');

  try {
    const result = await triggerDeployHook(pending.hookUrl);
    await updateTaskStatus(taskId, 'completed');
    await editMessageText(
      chatId,
      messageId,
      `✅ Deploy "${pending.target}" triggered successfully.\n\nJob ID: ${result.id || 'N/A'}\nURL: ${result.url || 'pending'}`
    );
  } catch (err) {
    await updateTaskStatus(taskId, 'failed');
    await editMessageText(
      chatId,
      messageId,
      `❌ Deploy "${pending.target}" failed: ${err.message}`
    );
  }
}

/**
 * POST to Vercel Deploy Hook
 */
function triggerDeployHook(hookUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(hookUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Length': 0 },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ status: 'ok', raw: body });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Update task status in Supabase
 */
async function updateTaskStatus(taskId, status) {
  try {
    const supabase = getClient();
    await supabase
      .from('nemoclaw_tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId);
  } catch (err) {
    console.error('[deploy] Task status update error:', err.message);
  }
}

module.exports = { handleDeploy, handleDeployCallback };
