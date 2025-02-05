module.exports = {
  apps : [{
    name: "whatsapp-bot",
    script: "./robo.js",
    watch: true,
    max_memory_restart: "1G",
    exp_backoff_restart_delay: 100,
    env: {
      NODE_ENV: "production",
    }
  }]
}
