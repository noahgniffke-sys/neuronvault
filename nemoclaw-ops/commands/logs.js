// commands/logs.js — PM2 log tailing
const { execSync } = require('child_process');
const { sendMessage, sendTyping } = require('../lib/telegram');

/**
 * Handle /logs command
 * Usage: /logs [service_name] [lines]
 * Example: /logs nemoclaw-ops 50
 */
async function handleLogs(chatId, args) {
  await sendTyping(chatId);

  const parts = (args || '').trim().split(/\s+/);
  const service = parts[0] || 'all';
  const lineCount = parseInt(parts[1], 10) || 20;

  // Cap at 50 lines to avoid Telegram message limits
  const lines = Math.min(lineCount, 50);

  try {
    let cmd;
    if (service === 'all') {
      cmd = `pm2 logs --nostream --lines ${lines} 2>&1`;
    } else {
      // Sanitize service name to prevent injection
      const safeName = service.replace(/[^a-zA-Z0-9_-]/g, '');
      cmd = `pm2 logs ${safeName} --nostream --lines ${lines} 2>&1`;
    }

    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 15000,
    });

    const trimmed = output.trim();
    if (!trimmed) {
      await sendMessage(chatId, `📋 No logs found for "${service}".`);
      return;
    }

    // Format as code block
    await sendMessage(
      chatId,
      `📋 *Logs: ${service}* (last ${lines} lines)\n\n\`\`\`\n${trimmed}\n\`\`\``,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    await sendMessage(
      chatId,
      `❌ Failed to fetch logs: ${err.message}`
    );
  }
}

module.exports = { handleLogs };
