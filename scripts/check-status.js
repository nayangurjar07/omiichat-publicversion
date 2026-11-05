const fs = require('fs');
const path = require('path');
const os = require('os');
const token = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.antideploy', 'config.json'))).token;

const taskId = process.argv[2] || 'a7b63561-02c2-4865-ac1f-ebb09c477a7c';
fetch(`https://antideploy.com/api/v1/deployments/${taskId}`, {
  headers: { 'Authorization': 'Bearer ' + token }
})
.then(r => r.json())
.then(d => {
  console.log('Status:', d.status, 'Finished:', d.finished);
  if (d.steps) {
    for (const s of d.steps) {
      console.log(` - ${s.key}: ${s.status} [${s.detail || ''}]`);
    }
  }
  if (d.error) console.log('Error:', d.error);
  if (d.summary) console.log('Summary:', d.summary);
  if (d.application && d.application.url) console.log('Live URL:', d.application.url);
})
.catch(e => console.error(e));
