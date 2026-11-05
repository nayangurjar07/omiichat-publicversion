const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'web');
const serverDir = path.join(rootDir, 'server');
const webOut = path.join(webDir, 'out');
const serverPublic = path.join(serverDir, 'public');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('1. Building Next.js Web Application...');
execSync(`${npmCmd} run build`, { cwd: webDir, stdio: 'inherit' });

console.log('2. Syncing built web assets to server/public...');
if (fs.existsSync(webOut)) {
  if (fs.existsSync(serverPublic)) {
    fs.rmSync(serverPublic, { recursive: true, force: true });
  }
  fs.cpSync(webOut, serverPublic, { recursive: true, force: true });
  console.log('Static web application assets copied successfully.');
} else {
  console.warn('Warning: web/out directory not found.');
}

console.log('3. Building Express & Socket.IO Backend Server...');
execSync(`${npmCmd} run build`, { cwd: serverDir, stdio: 'inherit' });

console.log('Build complete! Ready for deployment.');
