#!/usr/bin/env node
/**
 * 原型图本地预览服务器（零依赖）
 *
 * 用途：`原型图/*.html` 里的 JSX 通过 `<script type="text/babel" src=...>` 加载，
 * Babel standalone 用 XHR 拉取这些文件，file:// 下会被浏览器同源策略拦截，
 * 因此必须经由 HTTP 打开。
 *
 * 用法：
 *   node scripts/preview-prototype.mjs [--port 4173] [--host 127.0.0.1] [--open]
 *   pnpm preview:prototype
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, readdirSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
/** 预览根目录：默认仓库内 原型图/，可用 --root <目录> 指向任意静态产物（绝对路径或相对仓库根） */
const ROOT = resolve(repoRoot, flag('root', '原型图'));
/** 期望的首页文件；不存在时回落到目录内第一个 html */
const REQUESTED_ENTRY = flag('entry', '九九多端商城原型.html');
const PORT = Number(flag('port', process.env.PORT ?? 4173));
const HOST = flag('host', '127.0.0.1');
const OPEN = argv.includes('--open');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const htmlFiles = existsSync(ROOT)
  ? readdirSync(ROOT).filter((f) => f.endsWith('.html'))
  : [];

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    ...headers,
  });
  res.end(body);
}

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  } catch {
    return send(res, 400, 'Bad Request');
  }

  if (pathname === '/__health') {
    return send(res, 200, JSON.stringify({ ok: true, root: ROOT, files: htmlFiles }), {
      'Content-Type': 'application/json; charset=utf-8',
    });
  }

  if (pathname === '/') {
    const entry = existsSync(join(ROOT, REQUESTED_ENTRY)) ? REQUESTED_ENTRY : htmlFiles[0];
    pathname = `/${entry ?? ''}`;
  }

  // 目录请求 → 目录内第一个 html（无则给文件清单）
  const target = resolve(join(ROOT, pathname));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) {
    return send(res, 403, 'Forbidden');
  }

  let filePath = target;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    const entry = readdirSync(filePath).find((f) => f.endsWith('.html'));
    if (entry) {
      filePath = join(filePath, entry);
    } else {
      const list = readdirSync(filePath)
        .map((f) => `<li><a href="${encodeURIComponent(f)}">${f}</a></li>`)
        .join('');
      return send(res, 200, `<!DOCTYPE html><meta charset="utf-8"><ul>${list}</ul>`, {
        'Content-Type': MIME['.html'],
      });
    }
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return send(res, 404, `404 Not Found: ${pathname}`, { 'Content-Type': MIME['.txt'] });
  }

  const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': statSync(filePath).size,
    'Cache-Control': 'no-store, must-revalidate',
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(filePath).pipe(res);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ 端口 ${PORT} 已被占用；换一个：node scripts/preview-prototype.mjs --port 4174`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  const base = `http://${HOST}:${PORT}`;
  const entry = existsSync(join(ROOT, REQUESTED_ENTRY)) ? REQUESTED_ENTRY : htmlFiles[0];
  console.log('静态预览已启动');
  console.log(`  根目录: ${ROOT}`);
  console.log(`  首页  : ${base}/`);
  for (const f of htmlFiles) {
    console.log(`  - ${f}: ${base}/${encodeURIComponent(f)}`);
  }
  console.log('  Ctrl+C 结束');

  if (OPEN && entry) {
    const url = `${base}/${encodeURIComponent(entry)}`;
    const cmd =
      process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin' ? ['open', [url]]
      : ['xdg-open', [url]];
    try {
      spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref();
      console.log(`  已尝试打开浏览器: ${url}`);
    } catch (e) {
      console.log(`  (自动打开浏览器失败: ${e.message})`);
    }
  }
});
