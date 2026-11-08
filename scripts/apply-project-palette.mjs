import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Pages CMS cannot change sibling fields from a select directly. Its native
// entry action applies a palette to the 12 stored HEX values in frontmatter.
const payload = JSON.parse(process.env.PAGES_CMS_PAYLOAD || '{}');
const { repository, context, action, inputs, source } = payload;
const repo = process.env.GITHUB_REPOSITORY;
const ref = process.env.GITHUB_REF_NAME;
const expectedRepo = repository && `${repository.owner}/${repository.repo}`;

if (source !== 'pages-cms' ||
    action?.name !== 'apply-project-palette' ||
    context?.type !== 'entry' ||
    context?.name !== 'research' ||
    expectedRepo !== repo ||
    repository?.ref?.replace(/^refs\/heads\//, '') !== ref) {
  throw new Error('Invalid Pages CMS action context or repository branch.');
}

const entryPath = context.path;
if (typeof entryPath !== 'string' ||
    !/^src\/content\/research\/[a-zA-Z0-9._-]+\.md$/.test(entryPath)) {
  throw new Error('Action must target a single research project markdown file.');
}

const id = inputs?.palette;
const palettes = JSON.parse(readFileSync('src/data/project-palettes.json', 'utf8'));
if (typeof id !== 'string' || !Object.hasOwn(palettes, id)) {
  throw new Error(`Unknown palette: ${String(id)}`);
}

const keys = [
  'lightBackground', 'lightText', 'lightMuted', 'lightSmall', 'lightLine', 'lightSoft',
  'darkBackground', 'darkText', 'darkMuted', 'darkSmall', 'darkLine', 'darkSoft'
];
const colors = palettes[id];
if (keys.some((key) => typeof colors[key] !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(colors[key]))) {
  throw new Error('Preset is missing a valid six-digit HEX color.');
}

const target = resolve(entryPath);
const content = readFileSync(target, 'utf8');
if (!content.startsWith('---\n')) {
  throw new Error('The project must have YAML frontmatter.');
}
const closeAt = content.indexOf('\n---', 4);
if (closeAt < 0) {
  throw new Error('YAML frontmatter closing delimiter not found.');
}
const frontmatter = content.slice(4, closeAt);
const lines = frontmatter.split('\n');
const topLevelKey = (line) => /^[A-Za-z][a-zA-Z0-9_-]*\s*:/.test(line);
let start = lines.findIndex((line) => /^theme:\s*$/.test(line));
const newTheme = [
  'theme:',
  `  preset: ${id}`,
  ...keys.map((key) => `  ${key}: "${colors[key]}"`)
];

if (start >= 0) {
  let end = start + 1;
  while (end < lines.length && !topLevelKey(lines[end])) {
    if (lines[end].trim() && !/^\s/.test(lines[end])) {
      throw new Error('Unexpected non-indented content in the theme section.');
    }
    end++;
  }
  lines.splice(start, end - start, ...newTheme);
} else {
  start = lines.findIndex((line) => /^(hero|modules):/.test(line));
  lines.splice(start < 0 ? lines.length : start, 0, ...newTheme);
}

const updated = `---\n${lines.join('\n')}${content.slice(closeAt)}`;
if (updated !== content) {
  writeFileSync(target, updated, 'utf8');
  process.stdout.write(`Applied ${id} to ${entryPath} (12 HEX values).\n`);
} else {
  process.stdout.write(`No changes needed: ${id} is already applied to ${entryPath}.\n`);
}
