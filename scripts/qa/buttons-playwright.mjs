import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

const URL = 'http://127.0.0.1:4173/popup.html';
const SESSION = 'qa-buttons';
const ROOT = process.cwd();
const PLAYWRIGHT_TMP_DIR = path.join(ROOT, '.playwright-cli');
const OUTPUT_ROOT = path.join(ROOT, 'output', 'playwright');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const RUN_DIR = path.join(OUTPUT_ROOT, `buttons-qa-${RUN_ID}`);
const SUMMARY_PATH = path.join(RUN_DIR, 'summary.md');
const resolvedNpx = process.platform === 'win32'
  ? spawnSync('powershell.exe', ['-NoProfile', '-Command', '(Get-Command npx).Source'], { encoding: 'utf8' }).stdout.trim()
  : 'npx';
const resolvedNpxCmd = resolvedNpx?.toLowerCase().endsWith('.ps1')
  ? resolvedNpx.replace(/\.ps1$/i, '.cmd')
  : resolvedNpx;
const NPX_CMD = resolvedNpxCmd || resolvedNpx || 'npx';
const bunCandidate = process.platform === 'win32'
  ? path.join(process.env.USERPROFILE ?? '', '.bun', 'bin', 'bun.exe')
  : 'bun';
const BUN_CMD = process.platform === 'win32' && fs.existsSync(bunCandidate) ? bunCandidate : 'bun';

fs.mkdirSync(RUN_DIR, { recursive: true });

const results = [];
let startedDevServer = false;
let staticServer = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = (command, args, options = {}) => {
  let result;
  if (process.platform === 'win32') {
    const quote = (v) => `'${String(v).replace(/'/g, "''")}'`;
    const cmdline = `& ${quote(command)} ${args.map(quote).join(' ')}`.trim();
    result = spawnSync('powershell.exe', ['-NoProfile', '-Command', cmdline], {
      encoding: 'utf8',
      shell: false,
      ...options,
    });
  } else {
    result = spawnSync(command, args, {
      encoding: 'utf8',
      shell: false,
      ...options,
    });
  }
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
};

const ensureNpx = () => {
  if (!NPX_CMD) {
    throw new Error('npx is required but was not resolved on this machine.');
  }
};

const isPortOpen = (port) => new Promise((resolve) => {
  const socket = new net.Socket();
  socket.setTimeout(700);
  socket.once('connect', () => {
    socket.destroy();
    resolve(true);
  });
  socket.once('timeout', () => {
    socket.destroy();
    resolve(false);
  });
  socket.once('error', () => {
    socket.destroy();
    resolve(false);
  });
  socket.connect(port, '127.0.0.1');
});

const ensureStaticServer = async () => {
  if (await isPortOpen(4173)) return;

  const build = run(BUN_CMD, ['run', 'build'], { cwd: ROOT });
  if (!build.ok) {
    throw new Error(`Build failed before button QA.\\n${build.stdout}\\n${build.stderr}`);
  }

  startedDevServer = true;
  if (process.platform === 'win32') {
    staticServer = spawn('powershell.exe', ['-NoProfile', '-Command', `${NPX_CMD} --yes http-server .output/chrome-mv3 -p 4173 --silent`], {
      cwd: ROOT,
      detached: true,
      stdio: 'ignore',
      shell: false,
    });
  } else {
    staticServer = spawn(NPX_CMD, ['--yes', 'http-server', '.output/chrome-mv3', '-p', '4173', '--silent'], {
      cwd: ROOT,
      detached: true,
      stdio: 'ignore',
      shell: false,
    });
  }
  staticServer.unref();

  const timeoutAt = Date.now() + 30000;
  while (Date.now() < timeoutAt) {
    if (await isPortOpen(4173)) return;
    await sleep(600);
  }

  throw new Error('Static server did not become ready on port 4173 within 30s.');
};

const pw = (args) => {
  const result = run(NPX_CMD, ['--yes', '@playwright/cli', '-s=' + SESSION, ...args], { cwd: ROOT });
  if (!result.ok || /### Error/i.test(result.stdout) || /\berror:\b/i.test(result.stdout)) {
    throw new Error(`playwright-cli failed: ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
};

const pwGlobal = (args) => {
  const result = run(NPX_CMD, ['--yes', '@playwright/cli', ...args], { cwd: ROOT });
  if (!result.ok) {
    throw new Error(`playwright-cli global command failed: ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
};

const getResultLine = (output) => {
  const match = output.match(/### Result\s*\n([\s\S]*?)(\n###|$)/);
  return match ? match[1].trim() : '';
};

const latestSnapshotPathFromOutput = (output) => {
  const match = output.match(/\[Snapshot\]\(([^)]+)\)/);
  if (!match) throw new Error('Snapshot path not found in playwright output.');
  const rel = match[1].replace(/\\/g, path.sep);
  return path.join(ROOT, rel);
};

const getRefs = (snapshotPath) => {
  const text = fs.readFileSync(snapshotPath, 'utf8');
  const textboxRef = text.match(/textbox "Drop raw fragments here\.\.\."[^\n]*\[ref=(e\d+)\]/i)?.[1] ?? null;
  const mainRef = text.match(/button "Initiate Fusion"[^\n]*\[ref=(e\d+)\]/i)?.[1] ?? null;
  const configRef = text.match(/button "Config"[^\n]*\[ref=(e\d+)\]/i)?.[1] ?? null;
  return { textboxRef, mainRef, configRef };
};

const assertEval = (name, expression, expected = 'true') => {
  const out = pw(['eval', expression]);
  const value = getResultLine(out).replace(/^"|"$/g, '');
  const pass = value.toLowerCase() === String(expected).toLowerCase();
  results.push({ name, pass, value, expected });
  return pass;
};

const capture = (label) => {
  const shotOut = pw(['screenshot']);
  const shot = shotOut.match(/\[Screenshot of viewport\]\(([^)]+)\)/)?.[1] ?? '';
  const snapOut = pw(['snapshot']);
  const snap = snapOut.match(/\[Snapshot\]\(([^)]+)\)/)?.[1] ?? '';
  return { label, shot, snap };
};

const moveArtifacts = () => {
  if (!fs.existsSync(PLAYWRIGHT_TMP_DIR)) return [];
  const files = fs.readdirSync(PLAYWRIGHT_TMP_DIR).filter((f) => /\.(png|yml|log)$/i.test(f));
  for (const file of files) {
    fs.copyFileSync(path.join(PLAYWRIGHT_TMP_DIR, file), path.join(RUN_DIR, file));
  }
  return files;
};

const closeSession = () => {
  try {
    pw(['close']);
  } catch {
    // ignore cleanup errors
  }
};

const stopDevServer = () => {
  if (startedDevServer && staticServer?.pid) {
    try {
      process.kill(staticServer.pid);
    } catch {
      // ignore
    }
  }
};

const writeSummary = (artifacts) => {
  const lines = [];
  lines.push('# Popup Button QA Summary');
  lines.push('');
  lines.push(`- URL: ${URL}`);
  lines.push(`- Session: ${SESSION}`);
  lines.push(`- Timestamp: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push('| Scenario | Status | Actual | Expected |');
  lines.push('|---|---|---|---|');
  for (const r of results) {
    lines.push(`| ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.value} | ${r.expected} |`);
  }
  lines.push('');
  lines.push('## Artifacts');
  lines.push('');
  for (const f of artifacts) {
    lines.push(`- ${f}`);
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- `favicon.ico 404` is treated as low-priority noise and not a button failure.');

  fs.writeFileSync(SUMMARY_PATH, lines.join('\n') + '\n', 'utf8');
};

const main = async () => {
  ensureNpx();
  await ensureStaticServer();
  pwGlobal(['kill-all']);

  pw(['open', URL]);

  const snapOut = pw(['snapshot']);
  let refs = getRefs(latestSnapshotPathFromOutput(snapOut));
  capture('initial');

  assertEval('Initial state: main button disabled', "document.querySelectorAll('button')[0]?.disabled", 'true');
  assertEval('Initial state: config button exists', "String(document.querySelectorAll('button').length===2)", 'true');

  pw(['eval', "window.eval('Math.random=function(){return 0.9}'),'ok'"]);
  if (!refs.textboxRef) throw new Error('Textbox ref not found in snapshot.');
  pw(['fill', refs.textboxRef, 'success_path']);

  const enabledOut = pw(['eval', "String(document.querySelectorAll('button')[0]?.disabled === false)"]);
  const enabledVal = getResultLine(enabledOut).replace(/^"|"$/g, '');
  results.push({
    name: 'After input: main button enabled',
    pass: enabledVal.toLowerCase() === 'true',
    value: enabledVal,
    expected: 'true',
  });

  const snapOut2 = pw(['snapshot']);
  refs = getRefs(latestSnapshotPathFromOutput(snapOut2));
  if (!refs.mainRef) throw new Error('Main button ref not found in snapshot.');
  pw(['click', refs.mainRef]);

  assertEval('Success flow: synthesizing shown', "String(document.body.innerText.includes('SYNTHESIZING') || document.body.innerText.includes('Synthesizing'))", 'true');
  await sleep(2200);
  assertEval('Success flow: harmony shown', "String(document.body.innerText.includes('HARMONY RESTORED') || document.body.innerText.includes('Harmony Restored'))", 'true');
  capture('success-flow');

  await sleep(3400);
  assertEval('Success flow: auto reset', "String(document.body.innerText.includes('0 CHARS') && document.body.innerText.includes('INITIATE FUSION'))", 'true');

  pw(['eval', "window.eval('Math.random=function(){return 0.0}'),'ok'"]);
  const snapOut3 = pw(['snapshot']);
  refs = getRefs(latestSnapshotPathFromOutput(snapOut3));
  if (!refs.textboxRef) throw new Error('Textbox ref missing before error flow.');
  if (!refs.mainRef) throw new Error('Main button ref missing before error flow.');
  pw(['fill', refs.textboxRef, 'error_path']);
  pw(['click', refs.mainRef]);
  await sleep(2200);
  assertEval('Error flow: dissonance shown', "String(document.body.innerText.includes('DISSONANCE') || document.body.innerText.includes('Dissonance'))", 'true');
  capture('error-flow');

  await sleep(3400);
  const beforeUrl = getResultLine(pw(['eval', 'location.href'])).replace(/^"|"$/g, '');
  const snapOut4 = pw(['snapshot']);
  refs = getRefs(latestSnapshotPathFromOutput(snapOut4));
  if (!refs.configRef) throw new Error('Config button ref not found in snapshot.');
  pw(['click', refs.configRef]);
  const afterUrl = getResultLine(pw(['eval', 'location.href'])).replace(/^"|"$/g, '');

  results.push({
    name: 'Config click: URL unchanged',
    pass: beforeUrl === afterUrl,
    value: afterUrl,
    expected: beforeUrl,
  });

  const consoleOut = pw(['console']);
  const hasUnexpectedError = /\[ERROR\].*(?!favicon\.ico)/i.test(consoleOut);
  results.push({
    name: 'Console: no new functional errors',
    pass: !hasUnexpectedError,
    value: hasUnexpectedError ? 'unexpected error found' : 'no functional error',
    expected: 'no functional error',
  });

  capture('config-click');
  const artifacts = moveArtifacts();
  writeSummary(artifacts);

  const failed = results.filter((r) => !r.pass);
  console.log(`Saved QA artifacts to: ${RUN_DIR}`);
  console.log(`Summary: ${SUMMARY_PATH}`);
  console.log(`Scenarios: ${results.length}, Failed: ${failed.length}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    closeSession();
    stopDevServer();
  });
