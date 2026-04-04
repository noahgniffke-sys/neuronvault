// commands/stats.js — Query Supabase for NeuronVault metrics
const { getClient } = require('../lib/supabase');
const { sendMessage, sendTyping } = require('../lib/telegram');

/**
 * Handle /stats command — query NeuronVault metrics
 */
async function handleStats(chatId) {
  await sendTyping(chatId);

  const supabase = getClient();
  const lines = [];
  lines.push('📈 *NeuronVault Stats*\n');

  // Metrics counts
  try {
    const { count: metricsCount, error: metricsErr } = await supabase
      .from('nv_metrics')
      .select('*', { count: 'exact', head: true });

    if (metricsErr) throw metricsErr;
    lines.push(`*Total Metric Events:* ${metricsCount ?? 0}`);
  } catch (err) {
    lines.push(`*Metrics:* ❌ ${err.message}`);
  }

  // User counts by plan
  try {
    const { data: profiles, error: profilesErr } = await supabase
      .from('nv_profiles')
      .select('plan');

    if (profilesErr) throw profilesErr;

    const total = profiles?.length || 0;
    const planCounts = {};
    for (const p of profiles || []) {
      const plan = p.plan || 'free';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    }

    lines.push(`\n*Users:* ${total} total`);
    for (const [plan, count] of Object.entries(planCounts).sort()) {
      lines.push(`  • ${plan}: ${count}`);
    }
  } catch (err) {
    lines.push(`*Users:* ❌ ${err.message}`);
  }

  // Note counts
  try {
    const { count: noteCount, error: noteErr } = await supabase
      .from('nv_notes')
      .select('*', { count: 'exact', head: true });

    if (noteErr) throw noteErr;
    lines.push(`\n*Total Notes:* ${noteCount ?? 0}`);
  } catch (err) {
    lines.push(`*Notes:* ❌ ${err.message}`);
  }

  // Recent activity (last 24h)
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: recentNotes, error: recentErr } = await supabase
      .from('nv_notes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);

    if (!recentErr) {
      lines.push(`*Notes (last 24h):* ${recentNotes ?? 0}`);
    }

    const { count: recentMetrics, error: metricRecentErr } = await supabase
      .from('nv_metrics')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);

    if (!metricRecentErr) {
      lines.push(`*Metric Events (last 24h):* ${recentMetrics ?? 0}`);
    }
  } catch (err) {
    // Non-critical — skip
  }

  await sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });
}

/**
 * Generate a daily digest string (used by cron)
 */
async function generateDigest() {
  const supabase = getClient();
  const lines = [];
  lines.push('🌅 *Daily NeuronVault Digest*\n');

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const { count: totalUsers } = await supabase
      .from('nv_profiles')
      .select('*', { count: 'exact', head: true });

    const { count: newUsers } = await supabase
      .from('nv_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);

    const { count: totalNotes } = await supabase
      .from('nv_notes')
      .select('*', { count: 'exact', head: true });

    const { count: newNotes } = await supabase
      .from('nv_notes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);

    const { count: metricEvents } = await supabase
      .from('nv_metrics')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);

    lines.push(`*Users:* ${totalUsers ?? 0} total (+${newUsers ?? 0} new)`);
    lines.push(`*Notes:* ${totalNotes ?? 0} total (+${newNotes ?? 0} new)`);
    lines.push(`*Metric Events (24h):* ${metricEvents ?? 0}`);
  } catch (err) {
    lines.push(`Error generating digest: ${err.message}`);
  }

  return lines.join('\n');
}

module.exports = { handleStats, generateDigest };
