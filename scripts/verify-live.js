async function testUrl(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(`[${res.status}] ${url}`);
    console.log(`Content length: ${text.length} bytes`);
    return { status: res.status, ok: res.ok, text };
  } catch (err) {
    console.error(`Error requesting ${url}:`, err.message);
    return { ok: false, error: err.message, text: '' };
  }
}

async function run() {
  console.log('Testing live deployment at https://omiichat.antideploy.app...\n');
  await testUrl('https://omiichat.antideploy.app/health');
  await testUrl('https://omiichat.antideploy.app/googlea56af85a01950fad.html');
  const home = await testUrl('https://omiichat.antideploy.app/');
  const hasMeta = home.text.includes('xoehmGRDTQUKHGQ-TnC9ZU8Bf0GN60bZzz541Nw8VHs');
  console.log('Home page has google-site-verification meta tag:', hasMeta);
}

run();
