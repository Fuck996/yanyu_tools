#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontendPkg = path.join(root, 'frontend', 'package.json');
const backendPkg = path.join(root, 'backend', 'package.json');
const indexHtml = path.join(root, 'index.html');

function readJSON(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function writeFile(p, s){ fs.writeFileSync(p, s, 'utf8'); }

if (!fs.existsSync(frontendPkg)) return console.error('frontend package.json not found');
if (!fs.existsSync(backendPkg)) return console.error('backend package.json not found');
if (!fs.existsSync(indexHtml)) return console.error('index.html not found');

const f = readJSON(frontendPkg).version;
const b = readJSON(backendPkg).version;
console.log('Inject versions -> frontend:', f, 'backend:', b);

let s = fs.readFileSync(indexHtml,'utf8');
s = s.replace(/\{\{FRONTEND_VERSION\}\}/g, f);
s = s.replace(/\{\{BACKEND_VERSION\}\}/g, b);
writeFile(indexHtml, s);

console.log('index.html injected');
