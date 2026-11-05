const fs = require('fs');
const path = require('path');
const os = require('os');

const taskId = process.argv[2] || 'ae3fa086-cc29-4ee3-9fcb-2eab21d44f55';
const token = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.antideploy', 'config.json'))).token;

async function watch() {
  const url = `https://antideploy.com/api/v1/deployments/${taskId}`;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      console.log(`[Poll ${i + 1}] status: ${data.status || 'unknown'}, stage: ${data.stage || data.step || ''}, note: ${data.note || data.error || ''}`);
      if (['live', 'succeeded', 'failed', 'error'].includes(data.status)) {
        console.log('Final Result:', JSON.stringify(data, null, 2));
        return data;
      }
    } catch (e) {
      console.error('Error fetching status:', e.message);
    }
    await new Promise(r => setTimeout(r, 4000));
  }
}

watch().catch(e => console.error(e));
