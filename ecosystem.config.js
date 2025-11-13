/**
 * PM2 Configuration File
 *
 * Manages Next.js application deployment in production environment
 *
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      name: "git-repo-analyzer",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./",
      instances: 2, // Use 2 instances for load balancing
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
}
