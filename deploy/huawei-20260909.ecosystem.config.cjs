// Deployment-specific paths; no credentials embedded. Previous release retained for rollback.
module.exports = {
  apps: [{
    name: 'jiujiu-server',
    cwd: '/root/shangcheng-huawei-release-20260909/packages/server',
    script: 'dist/main.js',
    interpreter: '/opt/jiujiu-node24/bin/node',
    node_args: '--env-file=/root/shangcheng-5.12/packages/server/.env',
    env: {
      NODE_ENV: 'production', SERVER_PORT: '3001', SERVER_HOST: '127.0.0.1', TZ: 'Asia/Shanghai',
      HUAWEI_PUSH_PROJECT_ID: '101653523864981814',
      HUAWEI_PUSH_SERVICE_ACCOUNT_FILE: '/root/secure/jingwei-huawei-20260909/huawei-push-service-account.json',
      HUAWEI_PUSH_TEST_MESSAGE: '1',
    },
    exec_mode: 'fork', instances: 1, autorestart: true, restart_delay: 3000,
    max_memory_restart: '768M',
  }],
}
