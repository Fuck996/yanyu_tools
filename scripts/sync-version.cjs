#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readJSON(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function writeJSON(p,obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2)+'\n','utf8'); }

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const backendPkgPath = path.join(root, 'backend', 'package.json');

const version = readJSON(pkgPath).version;
console.log('同步版本 ->', version);

// 1) 后端 package.json 同步
if (fs.existsSync(backendPkgPath)){
  const b = readJSON(backendPkgPath);
  b.version = version;
  writeJSON(backendPkgPath, b);
  console.log('已更新', backendPkgPath);
} else console.warn('未找到', backendPkgPath);

// 2) 文本文件替换规则
const replacements = [
  { file: path.join(root, 'index.html'),
    patterns: [
      { from: /<title>[\s\S]*?<\/title>/i, to: `<title>烟雨江湖 - 装备录入工具 V${version}</title>` },
      { from: /(<div class="version-footer">)[\s\S]*?(<\/div>)/i, to: `$1版本号：V${version} <span>修改日期：2026-02-24</span>$2` }
    ]
  },
  { file: path.join(root, 'README.md'),
    patterns: [
      { from: /^>\s*V[0-9.]+\s*\|.*$/m, to: `> V${version} | 完全前后端分离 + GitHub OAuth 认证 + 云端数据同步` },
      { from: /^\*\*Version\*\*:.*$/m, to: `**Version**: ${version} | **Last Updated**: ${new Date().toISOString().slice(0,10)} | **Status**: 生产就绪` }
    ]
  },
  { file: path.join(root, 'QUICK-REFERENCE.md'),
    patterns: [ { from: /^\*\*版本\*\*:.*$/m, to: `**版本**: ${version} | **最后更新**: 2026-02-24` } ]
  },
  { file: path.join(root, 'doc', 'design_doc.md'),
    patterns: [ { from: /#\s*《烟雨江湖》装备录入工具设计文档\s*\(V[0-9.]+\)/, to: `# 《烟雨江湖》装备录入工具设计文档 (V${version})` } ]
  }
];

replacements.forEach(r=>{
  if (!fs.existsSync(r.file)) return console.warn('跳过，不存在:', r.file);
  let s = fs.readFileSync(r.file,'utf8');
  r.patterns.forEach(p=>{ s = s.replace(p.from, p.to); });
  fs.writeFileSync(r.file, s, 'utf8');
  console.log('已替换:', path.relative(root, r.file));
});

console.log('版本同步完成。');
