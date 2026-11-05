const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../web/out');
const dest = path.resolve(__dirname, '../server/public');

if (fs.existsSync(src)) {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`Copied web build from ${src} to ${dest}`);
} else {
  console.warn(`Source build directory does not exist: ${src}`);
}
