/**
 * 釋放 preview 慣用埠 4210（Windows：netstat + taskkill；其他：npx kill-port）
 */
const { execSync } = require('child_process');

const port = process.argv[2] || '4210';

function freeWindows() {
  try {
    const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    const pids = new Set();
    const portRe = new RegExp(`:${port}(?!\\d)`); // 避免 :4210 誤匹配 :42100
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes('LISTENING') || !portRe.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      } catch (_) {}
    }
  } catch (_) {}
}

function freeUnix() {
  try {
    execSync(`npx --yes kill-port ${port}`, { stdio: 'ignore' });
  } catch (_) {}
}

if (process.platform === 'win32') freeWindows();
else freeUnix();
