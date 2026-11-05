const fs = require('fs');
const path = require('path');
const os = require('os');

const deviceCode = process.argv[2];
const interval = parseInt(process.argv[3] || '5', 10) * 1000;

if (!deviceCode) {
  console.error('deviceCode required');
  process.exit(1);
}

const configDir = path.join(os.homedir(), '.antideploy');
const configFile = path.join(configDir, 'config.json');

async function poll() {
  while (true) {
    try {
      const res = await fetch('https://antideploy.com/api/v1/device/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceCode }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
        }
        // Write securely without printing the token
        fs.writeFileSync(configFile, JSON.stringify({ token: data.token }), { mode: 0o600 });
        console.log(`AUTH_SUCCESS: Connected account ${data.account?.label || data.account?.email || 'Authorized'}`);
        process.exit(0);
      }

      if (data.error === 'authorization_pending') {
        // Still waiting for approval
        await new Promise((r) => setTimeout(r, interval));
        continue;
      }

      if (data.error === 'access_denied') {
        console.error('AUTH_DENIED: User denied authorization.');
        process.exit(1);
      }

      if (data.error === 'expired_token') {
        console.error('AUTH_EXPIRED: Token expired.');
        process.exit(1);
      }

      console.log('Status:', data.error || data);
      await new Promise((r) => setTimeout(r, interval));
    } catch (err) {
      console.error('Network error during poll:', err.message);
      await new Promise((r) => setTimeout(r, interval));
    }
  }
}

poll();
