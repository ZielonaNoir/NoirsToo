import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPORT_DIR = path.resolve('.output', 'reports');

const run = (command, fallback = '') => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
};

export const hasHead = () => run('git rev-parse --verify HEAD', '') !== '';

export const nowIsoDate = () => new Date().toISOString().slice(0, 10);

export const getOriginHttpUrl = () => {
  const remote = run('git remote get-url origin', '');
  if (!remote) return null;
  if (remote.startsWith('https://github.com/')) return remote.replace(/\.git$/, '');
  if (remote.startsWith('git@github.com:')) {
    return `https://github.com/${remote.replace('git@github.com:', '').replace(/\.git$/, '')}`;
  }
  return null;
};

export const getCommitsSince = (since) => {
  if (!hasHead()) return [];
  const output = run(
    `git log --since="${since}" --pretty=format:%H%x09%h%x09%s%x09%an%x09%ad --date=short`,
    '',
  );
  if (!output) return [];

  return output.split('\n').map((line) => {
    const [hash, shortHash, subject, author, date] = line.split('\t');
    return { hash, shortHash, subject, author, date };
  });
};

export const extractPrNumber = (subject) => {
  const match = subject.match(/\(#(\d+)\)\s*$/);
  return match?.[1] ?? null;
};

export const classifyTheme = (subject) => {
  const s = subject.toLowerCase();
  if (s.includes('fix') || s.includes('bug') || s.includes('regress')) return 'Fixes';
  if (s.includes('test')) return 'Tests';
  if (s.includes('doc') || s.includes('readme') || s.includes('changelog')) return 'Docs';
  if (s.includes('refactor') || s.includes('cleanup')) return 'Refactor';
  if (s.includes('perf') || s.includes('speed') || s.includes('optimiz')) return 'Performance';
  if (s.includes('feat') || s.includes('add') || s.includes('new')) return 'Features';
  return 'Chore';
};

export const commitLink = (originUrl, hash) => {
  if (!originUrl) return 'link unavailable';
  return `${originUrl}/commit/${hash}`;
};

export const prLink = (originUrl, prNumber) => {
  if (!originUrl || !prNumber) return 'PR link unavailable';
  return `${originUrl}/pull/${prNumber}`;
};

export const writeReport = (fileName, content) => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const outPath = path.join(REPORT_DIR, fileName);
  fs.writeFileSync(outPath, content, 'utf8');
  return outPath;
};

