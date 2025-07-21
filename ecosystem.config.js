// PM2 Ecosystem Configuration for Blessed-Horizon
module.exports = {
  apps: [{
    // Main application
    name: 'blessed-horizon',
    script: './dist/server.js',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    max_memory_restart: '1G',
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    autorestart: true,
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 5000,
    shutdown_with_message: true,
    
    // Monitoring
    instance_var: 'INSTANCE_ID',
    merge_logs: true,
    
    // Watch options (disabled in production)
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      '.git',
      'public/uploads',
      '*.log'
    ],
    
    // Advanced features
    source_map_support: true,
    
    // Cron restart (daily at 3 AM)
    cron_restart: '0 3 * * *',
    
    // Environment specific configurations
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      instances: 'max',
      exec_mode: 'cluster'
    }
  },
  
  // Background jobs worker
  {
    name: 'blessed-horizon-worker',
    script: './dist/worker.js',
    instances: 2,
    exec_mode: 'cluster',
    
    env: {
      NODE_ENV: 'development',
      WORKER_TYPE: 'general'
    },
    env_production: {
      NODE_ENV: 'production',
      WORKER_TYPE: 'general'
    },
    
    error_file: './logs/worker-error.log',
    out_file: './logs/worker-out.log',
    log_file: './logs/worker-combined.log',
    
    max_memory_restart: '512M',
    max_restarts: 50,
    restart_delay: 5000,
    
    cron_restart: '0 4 * * *'
  },
  
  // Email worker
  {
    name: 'blessed-horizon-email',
    script: './dist/email-worker.js',
    instances: 1,
    exec_mode: 'fork',
    
    env: {
      NODE_ENV: 'development',
      WORKER_TYPE: 'email'
    },
    env_production: {
      NODE_ENV: 'production',
      WORKER_TYPE: 'email'
    },
    
    error_file: './logs/email-error.log',
    out_file: './logs/email-out.log',
    
    max_memory_restart: '256M',
    max_restarts: 20,
    restart_delay: 10000
  }],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'blessed-horizon',
      host: ['prod-server-1', 'prod-server-2'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/blessed-horizon.git',
      path: '/home/blessed-horizon/blessed-horizon',
      'pre-deploy-local': 'npm run test',
      'post-deploy': 'npm install --production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get update && apt-get install -y git nodejs npm',
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'blessed-horizon',
      host: 'staging-server',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/blessed-horizon.git',
      path: '/home/blessed-horizon/blessed-horizon-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  },
  
  // Monitoring endpoints
  monitoring: {
    http: true,
    https: false,
    port: 9615,
    host: '127.0.0.1'
  }
};
