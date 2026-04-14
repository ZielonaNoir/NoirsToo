import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const REPORT_DIR = path.resolve('.output', 'reports');

export const run = (command, fallback = '') => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
};

export const runDetailed = (command) => {
  const result = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
};

export const hasHead = () => run('git rev-parse --verify HEAD', '') !== '';

export const nowIsoDate = () => new Date().toISOString().slice(0, 10);

export const formatReportName = (prefix, ext = 'md') => `${prefix}-${nowIsoDate()}.${ext}`;

export const getSinceArg = (defaultSince) => {
  const index = process.argv.indexOf('--since');
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return defaultSince;
};

export const getOriginHttpUrl = () => {
  const remote = run('git remote get-url origin', '');
  if (!remote) return null;
  if (remote.startsWith('https://github.com/')) return remote.replace(/\.git$/, '');
  if (remote.startsWith('git@github.com:')) {
    return `https://github.com/${remote.replace('git@github.com:', '').replace(/\.git$/, '')}`;
  }
  return null;
};

export const getRepoSlug = () => {
  const originUrl = getOriginHttpUrl();
  if (!originUrl) return null;
  const match = originUrl.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)$/);
  return match?.[1] ?? null;
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

export const getChangedFilesForCommit = (hash) => {
  const output = run(`git show --pretty="" --name-only ${hash}`, '');
  if (!output) return [];
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

export const getChangedFilesSince = (since) => {
  const commits = getCommitsSince(since);
  const files = new Set();
  for (const commit of commits) {
    for (const file of getChangedFilesForCommit(commit.hash)) {
      files.add(file);
    }
  }
  return Array.from(files);
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

export const getGitHubStatus = () => {
  const version = runDetailed('gh --version');
  if (!version.ok) {
    return { available: false, authenticated: false, reason: 'gh CLI not installed' };
  }

  const auth = runDetailed('gh auth status');
  if (!auth.ok) {
    return {
      available: true,
      authenticated: false,
      reason: 'GitHub data unavailable (run: gh auth login)',
    };
  }

  return { available: true, authenticated: true, reason: 'authenticated' };
};

export const ghApiJson = (endpoint) => {
  const ghStatus = getGitHubStatus();
  if (!ghStatus.authenticated) {
    return null;
  }

  const result = runDetailed(`gh api "${endpoint}"`);
  if (!result.ok || !result.stdout) {
    return null;
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
};

export const getRecentWorkflowRuns = (limit = 10) => {
  const slug = getRepoSlug();
  if (!slug) return [];

  const data = ghApiJson(`repos/${slug}/actions/runs?per_page=${limit}`);
  return data?.workflow_runs ?? [];
};

export const getRecentPullRequests = (limit = 20, state = 'closed') => {
  const slug = getRepoSlug();
  if (!slug) return [];

  const data = ghApiJson(`repos/${slug}/pulls?state=${state}&sort=updated&direction=desc&per_page=${limit}`);
  return Array.isArray(data) ? data : [];
};

export const getRecentIssues = (limit = 20, state = 'open') => {
  const slug = getRepoSlug();
  if (!slug) return [];

  const data = ghApiJson(`repos/${slug}/issues?state=${state}&per_page=${limit}`);
  if (!Array.isArray(data)) return [];
  return data.filter((item) => !item.pull_request);
};

export const writeReport = (fileName, content) => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const outPath = path.join(REPORT_DIR, fileName);
  fs.writeFileSync(outPath, content, 'utf8');
  return outPath;
};
