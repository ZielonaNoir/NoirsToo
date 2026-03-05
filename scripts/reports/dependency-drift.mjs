import { formatReportName, runDetailed, writeReport } from './_git-utils.mjs';

const parseVersion = (version) => {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
};

const classifyUpgrade = (current, target) => {
  const c = parseVersion(current);
  const t = parseVersion(target);
  if (!c || !t) return 'unknown';
  if (t.major > c.major) return 'major';
  if (t.minor > c.minor) return 'minor';
  if (t.patch > c.patch) return 'patch';
  return 'none';
};

const result = runDetailed('bun outdated');
const lines = [`# Dependency Drift (${new Date().toISOString().slice(0, 10)})`, ''];

if (!result.stdout) {
  lines.push('- Unable to read dependency drift (`bun outdated` produced no output).');
} else {
  const rows = result.stdout
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.length >= 5)
    .map((parts) => ({
      pkg: parts[1],
      current: parts[2],
      update: parts[3],
      latest: parts[4],
    }))
    .filter((row) => row.pkg && row.pkg !== 'Package' && !row.pkg.startsWith('---'));

  if (rows.length === 0) {
    lines.push('- No outdated dependency rows found.');
  } else {
    const safe = [];
    const risky = [];

    for (const row of rows) {
      const safeType = classifyUpgrade(row.current, row.update);
      const latestType = classifyUpgrade(row.current, row.latest);
      const isDev = row.pkg.includes('(dev)');
      const name = row.pkg.replace(' (dev)', '');

      if (safeType === 'patch' || safeType === 'minor') {
        safe.push({ ...row, name, isDev, safeType });
      }
      if (latestType === 'major') {
        risky.push({ ...row, name, isDev });
      }
    }

    lines.push('## Safe Minimal Upgrades (Patch/Minor)');
    if (safe.length === 0) {
      lines.push('- no safe upgrades');
    } else {
      for (const item of safe) {
        const cmd = item.isDev ? `bun add -d ${item.name}@${item.update}` : `bun add ${item.name}@${item.update}`;
        lines.push(`- ${item.name}: ${item.current} -> ${item.update} (${item.safeType})`);
        lines.push(`  Suggested command: ${cmd}`);
      }
    }

    lines.push('');
    lines.push('## Deferred Major Upgrades (Risky)');
    if (risky.length === 0) {
      lines.push('- None detected.');
    } else {
      for (const item of risky) {
        lines.push(`- ${item.name}: ${item.current} -> ${item.latest} (major)`);
      }
      lines.push('- Minimal plan: keep current major in this cycle, open follow-up PRs for majors with focused compatibility tests.');
    }
  }
}

const content = `${lines.join('\n')}\n`;
const outPath = writeReport(formatReportName('dependency-drift'), content);
console.log(content);
console.log(`Saved to ${outPath}`);
