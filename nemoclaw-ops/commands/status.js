// commands/status.js — PM2 process status + Uptime Kuma check
const { execSync } = require('child_process');
const http = require('http');
const { sendMessage, sendTyping } = require('../lib/telegram');

/**
 * Handle /status command
 */
async function handleStatus(chatId) {
  await sendTyping(chatId);

  const lines = [];
  lines.push('📊 *System Status*\n');

  // PM2 process list
  try {
    const pm2Raw = execSync('pm2 jlist', {
      encoding: 'utf-8',
      timeout: 10000,
    });
    const processes = JSON.parse(pm2Raw);

    if (processes.length === 0) {
      lines.push('*PM2 Processes:* None running');
    } else {
      lines.push('*PM2 Processes:*');
      for (const proc of processes) {
        const status = proc.pm2_env?.status || 'unknown';
        const icon = status === 'online' ? '🟢' : status === 'stopped' ? '🔴' : '🟡';
        const uptime = proc.pm2_env?.pm_uptime
          ? formatUptime(Date.now() - proc.pm2_env.pm_uptime)
          : 'N/A';
        const memory = proc.monit?.memory
          ? `${Math.round(proc.monit.memory / 1024 / 1024)}MB`
          : 'N/A';
        const cpu = proc.monit?.cpu !== undefined ? `${proc.monit.cpu}%` : 'N/A';
        const restarts = proc.pm2_env?.restart_time || 0;

        lines.push(
          `${icon} *${proc.name}* — ${status}` +
          `\n   Uptime: ${uptime} | Mem: ${memory} | CPU: ${cpu} | Restarts: ${restarts}`
        );
      }
    }
  } catch (err) {
    lines.push(`*PM2:* ❌ Error — ${err.message}`);
  }

  lines.push('');

  // Uptime Kuma
  try {
    const kumaStatus = await checkUptimeKuma();
    lines.push('*Uptime Kuma:*');
    if (kumaStatus.ok) {
      lines.push(`🟢 Monitoring active — ${kumaStatus.monitors || 0} monitors`);
    } else {
      lines.push(`🟡 Responded but status unclear`);
    }
  } catch (err) {
    lines.push(`*Uptime Kuma:* ❌ Unreachable — ${err.message}`);
  }

  await sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });
}

/**
 * Check Uptime Kuma status page
 */
function checkUptimeKuma() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3001/api/status-page/1', { timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(body);
            resolve({
              ok: true,
              monitors: data.publicGroupList
                ? data.publicGroupList.reduce(
                    (sum, g) => sum + (g.monitorList?.length || 0),
                    0
                  )
                : 0,
            });
          } catch {
            resolve({ ok: true, monitors: 0 });
          }
        } else {
          resolve({ ok: false });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Format milliseconds to human-readable uptime
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

module.exports = { handleStatus };
