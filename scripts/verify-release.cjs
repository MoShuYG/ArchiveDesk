const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(process.argv[2]);
const node = path.join(root, 'runtime', 'node.exe');
assert.ok(fs.existsSync(node), 'Release must bundle Node.js');
assert.ok(fs.existsSync(path.join(root, 'runtime', 'NODE-LICENSE.txt')));
assert.ok(!fs.existsSync(path.join(root, '.env')), 'Release must not ship a personal .env');
assert.ok(!fs.existsSync(path.join(root, 'data', 'app.db')), 'Release must not ship user data');
assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version, '1.0.1');
const native = spawnSync(node, ['-e', `
  const assert = require('node:assert/strict');
  assert.equal(process.version, 'v22.23.3');
  assert.equal(process.versions.modules, '127');
  const db = new (require('better-sqlite3'))(':memory:');
  assert.equal(db.prepare('SELECT 1 AS value').get().value, 1);
  db.close();
  require('argon2');
  require('sharp');
  assert.ok(require('node:fs').existsSync(require('@ffprobe-installer/ffprobe').path));
`], { cwd: root, encoding: 'utf8' });
assert.equal(native.status, 0, native.stderr);

const windows = process.env.SystemRoot || 'C:\\Windows';
const child = spawn(path.join(windows, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'start.ps1'), '-NoBrowser'], {
    cwd: root,
    env: { ...process.env, PATH: path.join(windows, 'System32'), PORT: '3197', DB_PATH: ':memory:' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });
child.on('error', error => { output += error.message; });
(async () => {
  try {
    const deadline = Date.now() + 20000;
    while (!output.includes('3197')) {
      if (child.exitCode !== null || Date.now() > deadline) throw new Error(output || 'Startup timeout');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    const base = 'http://127.0.0.1:3197';
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);
    const page = await fetch(base + '/');
    assert.equal(page.status, 200);
    const html = await page.text();
    const asset = html.match(/src="([^"]+\.js)"/);
    assert.ok(asset, 'Built frontend JavaScript must be referenced');
    assert.equal((await fetch(base + asset[1])).status, 200);
    console.log('PASS: bundled runtime, native modules, clean package, launcher without system Node.js, health, homepage, frontend asset');
  } catch (error) {
    console.error(error);
    console.error(output);
    process.exitCode = 1;
  } finally {
    if (child.pid && child.exitCode === null) {
      const stopped = spawnSync(path.join(windows, 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 10000, encoding: 'utf8' });
      if (stopped.status !== 0) {
        console.error('Unable to stop test process ' + child.pid, stopped.stderr || stopped.error);
        process.exitCode = 1;
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
      }
    }
  }
})();
