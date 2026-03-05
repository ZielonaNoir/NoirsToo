import fs from 'node:fs';
import {
  formatReportName,
  getChangedFilesSince,
  getSinceArg,
  runDetailed,
  writeReport,
} from './_git-utils.mjs';

const since = getSinceArg('7 days ago');
const changedFiles = getChangedFilesSince(since);

const hasChangelog = fs.existsSync('CHANGELOG.md');
const hasMigrations = changedFiles.some((file) => /migration|migrations|schema/i.test(file));
const hasFeatureFlagChanges = changedFiles.some((file) => /flag|feature/i.test(file));

const checkResult = runDetailed('bun run check');
const checksPass = checkResult.ok;

const lines = [
  `# Release Gate (${new Date().toISOString().slice(0, 10)})`,
  '',
  `Window: last ${since}`,
  '',
  '## Gate Checklist',
  `- Changelog present: ${hasChangelog ? 'PASS' : 'FAIL'}`,
  `- Migration changes detected: ${hasMigrations ? 'YES (review required)' : 'NO'}`,
  `- Feature-flag related changes detected: ${hasFeatureFlagChanges ? 'YES (verify flag defaults/rollout plan)' : 'NO'}`,
  `- Quality gate (bun run check): ${checksPass ? 'PASS' : 'FAIL'}`,
  '',
  '## Notes',
];

if (!hasChangelog) {
  lines.push('- Add `CHANGELOG.md` updates before tagging.');
}
if (hasMigrations) {
  lines.push('- Confirm migration backward compatibility and rollback notes.');
}
if (hasFeatureFlagChanges) {
  lines.push('- Confirm feature flag default values and staged rollout strategy.');
}
if (!checksPass) {
  lines.push('- `bun run check` failed; resolve compile/lint/test before tagging.');
}
if (hasChangelog && checksPass) {
  lines.push('- Core release gate checks are passing.');
}

const content = `${lines.join('\n')}\n`;
const outPath = writeReport(formatReportName('release-gate'), content);
console.log(content);
console.log(`Saved to ${outPath}`);
