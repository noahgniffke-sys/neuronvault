// PM2 ecosystem config for Raspberry Pi 5 deployment
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'nemoclaw-ops',
      script: 'index.js',
      cwd: '/home/trident/nemoclaw-ops',
      env: {
        NODE_ENV: 'production',
      },
      // Load .env from the nemoclaw source (existing vars)
      // and from the ops dir (new vars)
      env_file: '/home/trident/nemoclaw-ops/.env',

      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,

      // Logging
      error_file: '/home/trident/.pm2/logs/nemoclaw-ops-error.log',
      out_file: '/home/trident/.pm2/logs/nemoclaw-ops-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Auto-restart on file changes (disabled for prod)
      watch: false,
    },
  ],
};
