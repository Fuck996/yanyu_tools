#!/usr/bin/env node
/**
 * inject-versions.cjs
 * 将各包的版本号注入到需要显示版本的文件中：
 *   - 前端版本来源：frontend/package.json（单一来源）
 *   - 后端版本来源：backend/package.json（运行时也由 /api/version 提供）
 *   - 注入目标：frontend/js/app-init.js、index.html（静态备用页）
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontendPkg = path.join(root, 'frontend', 'package.json');
const backendPkg  = path.join(root, 'backend', 'package.json');

function readJSON(p){ return JSON.parse(fs.readFileSync(p, 'utf8')); }
function injectFile(filePath, replaceFn) {
  if (!fs.existsSync(filePath)) { console.warn('跳过(不存在):', filePath); return; }
  let s = fs.readFileSync(filePath, 'utf8');
  s = replaceFn(s);
  fs.writeFileSync(filePath, s, 'utf8');
  console.log('已注入:', path.relative(root, filePath));
}

if (!fs.existsSync(frontendPkg)) { console.error('找不到 frontend/package.json'); process.exit(1); }
if (!fs.existsSync(backendPkg))  { console.error('找不到 backend/package.json');  process.exit(1); }

const fv = readJSON(frontendPkg).version;  // 前端版本（单一来源）
const bv = readJSON(backendPkg).version;   // 后端版本（打包时注入；运行时由 /api/version 动态覆盖）
console.log(`注入版本 → 前端: ${fv}  后端: ${bv}`);

// 1. frontend/js/app-init.js — 注入前端版本常量（前端包体版本，不依赖后端）
injectFile(path.join(root, 'frontend', 'js', 'app-init.js'), s => {
  s = s.replace(/window\.__FRONTEND_VERSION__ = '[^']*'/, `window.__FRONTEND_VERSION__ = '${fv}'`);
  s = s.replace(/const FRONTEND_VERSION = '[^']*'/, `const FRONTEND_VERSION = '${fv}'`);
  return s;
});

// 2. index.html（根，静态备用页）— 同时显示前后端版本
injectFile(path.join(root, 'index.html'), s => {
  // 替换占位符或已注入的静态版本字符串
  s = s.replace(/\{\{FRONTEND_VERSION\}\}/g, fv);
  s = s.replace(/\{\{BACKEND_VERSION\}\}/g, bv);
  // 替换已注入后的静态版本行（防止重复运行时错位）
  s = s.replace(
    /前端版本：V[\d.]+\s*\|\s*后端版本：V[\d.]+/,
    `前端版本：V${fv} | 后端版本：V${bv}`
  );
  return s;
});

console.log('版本注入完成。');
