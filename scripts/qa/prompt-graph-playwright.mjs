import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SESSION = 'qa-prompt-graph';
const PLAYWRIGHT_TMP_DIR = path.join(ROOT, '.playwright-cli');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const RUN_DIR = path.join(ROOT, 'docs', 'reports', 'playwright', `prompt-graph-qa-${RUN_ID}`);
const SUMMARY_PATH = path.join(RUN_DIR, 'summary.md');

const NPX_CMD = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const bunCandidate = process.platform === 'win32' ? path.join(process.env.USERPROFILE ?? '', '.bun', 'bin', 'bun.exe') : 'bun';
const BUN_CMD = process.platform === 'win32' && fs.existsSync(bunCandidate) ? bunCandidate : 'bun';

const results = [];
let staticServer = null;
let serverPort = 4173;

fs.mkdirSync(RUN_DIR, { recursive: true });

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options,
  });
  return { ok: result.status === 0, status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isPortOpen = (port) => new Promise((resolve) => {
  const socket = new net.Socket();
  socket.setTimeout(700);
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('timeout', () => { socket.destroy(); resolve(false); });
  socket.once('error', () => { socket.destroy(); resolve(false); });
  socket.connect(port, '127.0.0.1');
});

const pickPort = async () => {
  for (let port = 4173; port <= 4183; port += 1) {
    if (!(await isPortOpen(port))) return port;
  }
  throw new Error('No free local port found in range 4173-4183.');
};

const ensureBuild = () => {
  const build = run(BUN_CMD, ['run', 'build'], { cwd: ROOT });
  if (!build.ok) throw new Error(`Build failed before prompt graph QA.\n${build.stdout}\n${build.stderr}`);
};

const startStaticServer = async () => {
  serverPort = await pickPort();
  staticServer = spawn('node', ['scripts/qa/static-server.mjs', '.output/chrome-mv3', String(serverPort)], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
    shell: false,
  });
  staticServer.unref();

  const timeoutAt = Date.now() + 30000;
  while (Date.now() < timeoutAt) {
    if (await isPortOpen(serverPort)) return;
    await sleep(500);
  }

  throw new Error(`Static server did not become ready on ${serverPort} within 30s.`);
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
  if (!result.ok) throw new Error(`playwright-cli global command failed: ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
};

const latestSnapshotPathFromOutput = (output) => {
  const match = output.match(/\[Snapshot\]\(([^)]+)\)/);
  if (!match) throw new Error('Snapshot path not found in playwright output.');
  return path.join(ROOT, match[1].replace(/\\/g, path.sep));
};

const getSnapshot = () => {
  const out = pw(['snapshot']);
  const filePath = latestSnapshotPathFromOutput(out);
  return fs.readFileSync(filePath, 'utf8');
};

const getRef = (snapshot, label, role = 'button') => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${role} "${escaped}"[^\\n]*\\[ref=(e\\d+)\\]`, 'i');
  return snapshot.match(regex)?.[1] ?? null;
};

const assertIncludes = (name, text, needle) => {
  const pass = text.toLowerCase().includes(needle.toLowerCase());
  results.push({ name, pass, value: pass ? 'found' : 'missing', expected: needle });
};

const capture = (label) => {
  const shotOut = pw(['screenshot']);
  const shot = shotOut.match(/\[Screenshot of viewport\]\(([^)]+)\)/)?.[1] ?? '';
  const snapOut = pw(['snapshot']);
  const snap = snapOut.match(/\[Snapshot\]\(([^)]+)\)/)?.[1] ?? '';
  results.push({ name: `Artifact: ${label}`, pass: true, value: `${shot} ${snap}`.trim(), expected: 'captured' });
};

const moveArtifacts = () => {
  if (!fs.existsSync(PLAYWRIGHT_TMP_DIR)) return [];
  const files = fs.readdirSync(PLAYWRIGHT_TMP_DIR).filter((f) => /\.(png|yml|log)$/i.test(f));
  for (const file of files) {
    fs.copyFileSync(path.join(PLAYWRIGHT_TMP_DIR, file), path.join(RUN_DIR, file));
  }
  return files;
};

const clearPlaywrightTmp = () => {
  if (!fs.existsSync(PLAYWRIGHT_TMP_DIR)) return;
  for (const file of fs.readdirSync(PLAYWRIGHT_TMP_DIR)) {
    if (/\.(png|yml|log)$/i.test(file)) {
      fs.rmSync(path.join(PLAYWRIGHT_TMP_DIR, file), { force: true });
    }
  }
};

const writeSummary = (artifacts) => {
  const lines = [];
  lines.push('# Prompt Graph QA Summary');
  lines.push('');
  lines.push(`- URL: http://127.0.0.1:${serverPort}/prompt-panel.html?qa=1`);
  lines.push(`- Session: ${SESSION}`);
  lines.push(`- Timestamp: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push('| Scenario | Status | Actual | Expected |');
  lines.push('|---|---|---|---|');
  for (const r of results) lines.push(`| ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.value} | ${r.expected} |`);
  lines.push('');
  lines.push('## Artifacts');
  lines.push('');
  for (const f of artifacts) lines.push(`- ${f}`);
  lines.push('');
  lines.push('## Known Limits');
  lines.push('');
  lines.push('- This run uses `?qa=1` local bridge mode for deterministic panel-path validation.');
  fs.writeFileSync(SUMMARY_PATH, lines.join('\n') + '\n', 'utf8');
};

const closeSession = () => {
  try { pw(['close']); } catch { /* ignore */ }
};

const stopStaticServer = () => {
  if (staticServer?.pid) {
    try { process.kill(staticServer.pid); } catch { /* ignore */ }
  }
};

const runScenario = async () => {
  pw(['open', `http://127.0.0.1:${serverPort}/prompt-panel.html?qa=1`]);

  let snap = getSnapshot();
  capture('initial');

  const startPickRef = getRef(snap, 'Start Pick');
  if (!startPickRef) throw new Error('Start Pick ref not found in initial snapshot.');

  pw(['click', startPickRef]);
  snap = getSnapshot();
  assertIncludes('Pick start sets state to picking', snap, 'picking');

  const mockSelectRef = getRef(snap, 'Mock Select Target');
  if (!mockSelectRef) throw new Error('Mock Select Target ref not found after pick start.');
  pw(['click', mockSelectRef]);
  snap = getSnapshot();
  assertIncludes('Mock select sets target selector', snap, '#qa-target');
  capture('pick-selected');

  const injectEmptyRef = getRef(snap, 'Inject Empty');
  const injectForceRef = getRef(snap, 'Inject Force');
  if (!injectEmptyRef || !injectForceRef) throw new Error('Inject button refs not found.');

  pw(['click', injectEmptyRef]);
  snap = getSnapshot();
  assertIncludes('Inject empty keeps existing email', snap, 'already@filled.dev');
  assertIncludes('Inject empty fills blank fields', snap, 'Dragon Operator');
  capture('inject-empty');

  pw(['click', injectForceRef]);
  snap = getSnapshot();
  assertIncludes('Inject force overwrites email', snap, 'chaos@example.com');
  assertIncludes('Inject result shows duration', snap, 'ms');
  capture('inject-force');

  const extractAreaRef = getRef(snap, 'Paste unstructured text to extract small tags', 'textbox');
  const extractRef = getRef(snap, 'Extract Tags');
  if (!extractAreaRef || !extractRef) throw new Error('Extract refs not found.');

  pw(['fill', extractAreaRef, 'extract_camera_motion_cinematic_tone']);
  pw(['click', extractRef]);
  snap = getSnapshot();
  assertIncludes('Extract creates chips', snap, 'extract_camera_motion_cinematic_tone');
  assertIncludes('Extract creates prompt atoms', snap, 'Prompt Atoms');
  capture('extract-tags');

  const macroInputRef = getRef(snap, 'Macro tag name', 'textbox');
  const fuseRef = getRef(snap, 'Fuse');
  if (!macroInputRef || !fuseRef) throw new Error('Macro refs not found.');

  pw(['fill', macroInputRef, 'Scene_Macro']);
  pw(['click', fuseRef]);
  snap = getSnapshot();
  assertIncludes('Macro tag exists', snap, 'Scene_Macro');
  capture('macro-fused');

  const basePromptRef = getRef(snap, 'Base prompt generated from tags', 'textbox');
  const targetRef = getRef(snap, 'Target output sample or rubric', 'textbox');
  const optimizeRef = getRef(snap, 'Optimize Prompt');
  if (!basePromptRef || !targetRef || !optimizeRef) throw new Error('Optimize refs not found.');

  pw(['fill', basePromptRef, 'Initial_prompt']);
  pw(['fill', targetRef, 'Need_concise_storyboard_output']);
  pw(['click', optimizeRef]);
  snap = getSnapshot();
  assertIncludes('Optimize renders best score', snap, 'Best score:');
  assertIncludes('Optimize renders best prompt', snap, 'Best prompt:');
  capture('optimize');

  const consoleOut = pw(['console']);
  const hasUnexpectedError = /\[ERROR\]/i.test(consoleOut);
  results.push({ name: 'Console: no unexpected errors', pass: !hasUnexpectedError, value: hasUnexpectedError ? 'unexpected error found' : 'clean', expected: 'clean' });
};

const main = async () => {
  ensureBuild();
  await startStaticServer();
  clearPlaywrightTmp();
  try { pwGlobal(['kill-all']); } catch { /* ignore */ }
  await runScenario();

  const artifacts = moveArtifacts();
  writeSummary(artifacts);

  const failed = results.filter((r) => !r.pass);
  console.log(`Saved QA artifacts to: ${RUN_DIR}`);
  console.log(`Summary: ${SUMMARY_PATH}`);
  console.log(`Scenarios: ${results.length}, Failed: ${failed.length}`);
  if (failed.length > 0) process.exitCode = 1;
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    closeSession();
    stopStaticServer();
  });
