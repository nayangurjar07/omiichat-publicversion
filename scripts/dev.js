const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const webDir = path.join(rootDir, 'web');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('\x1b[36m%s\x1b[0m', '>>> Starting Omii (Server :3001 & Web :3000)...');

const serverProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: serverDir,
  shell: true,
  stdio: 'inherit',
});

const webProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: webDir,
  shell: true,
  stdio: 'inherit',
});

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', '>>> Shutting down development servers...');
  if (isWin) {
    if (serverProc.pid) spawn('taskkill', ['/pid', serverProc.pid.toString(), '/T', '/F']);
    if (webProc.pid) spawn('taskkill', ['/pid', webProc.pid.toString(), '/T', '/F']);
  } else {
    serverProc.kill('SIGINT');
    webProc.kill('SIGINT');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

