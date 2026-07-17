#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const agentsDirectory = join(root, 'src', 'content', 'docs', 'agents');
const managedFields = [
  'name',
  'description',
  'permission_mode',
  'max_concurrent_tasks',
  'model',
  'thinking_level',
];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function parsePage(path) {
  const source = readFileSync(path, 'utf8');
  const manifestMatch = source.match(/<!-- multica-agent: (\{.*\}) -->/);
  const instructionsMatch = source.match(
    /<!-- BEGIN MULTICA INSTRUCTIONS -->\n```text\n([\s\S]*?)\n```\n<!-- END MULTICA INSTRUCTIONS -->/,
  );

  if (!manifestMatch || !instructionsMatch) {
    throw new Error(`Missing agent manifest or instruction boundaries: ${path}`);
  }

  return {
    slug: basename(path, '.md'),
    manifest: JSON.parse(manifestMatch[1]),
    instructions: instructionsMatch[1],
  };
}

function documentedAgents() {
  return readdirSync(agentsDirectory)
    .filter((name) => name.endsWith('.md'))
    .map((name) => join(agentsDirectory, name))
    .filter((path) => readFileSync(path, 'utf8').includes('<!-- multica-agent:'))
    .map(parsePage);
}

function runMultica(args, options = {}) {
  const result = spawnSync('multica', args, {
    cwd: root,
    encoding: 'utf8',
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `multica exited ${result.status}`);
  }
  return result;
}

function liveAgents() {
  const result = runMultica(['agent', 'list', '--output', 'json']);
  return JSON.parse(result.stdout);
}

function skillNames(agent) {
  return (agent.skills ?? []).map((skill) =>
    typeof skill === 'string' ? skill : skill.name,
  );
}

function compare() {
  const documented = documentedAgents();
  const live = liveAgents();
  const liveById = new Map(live.map((agent) => [agent.id, agent]));
  const documentedIds = new Set(documented.map(({ manifest }) => manifest.id));
  const differences = [];

  for (const page of documented) {
    const agent = liveById.get(page.manifest.id);
    if (!agent) {
      differences.push(`${page.slug}: live agent ${page.manifest.id} is missing`);
      continue;
    }
    if (agent.archived_at) {
      differences.push(`${page.slug}: live agent is archived but page is active`);
      continue;
    }

    for (const field of managedFields) {
      if (agent[field] !== page.manifest[field]) {
        differences.push(
          `${page.slug}: ${field} differs (repo=${JSON.stringify(page.manifest[field])}, live=${JSON.stringify(agent[field])})`,
        );
      }
    }
    if (agent.instructions !== page.instructions) {
      differences.push(`${page.slug}: effective instructions differ`);
    }
    if (JSON.stringify(skillNames(agent).sort()) !== JSON.stringify([...page.manifest.skills].sort())) {
      differences.push(`${page.slug}: workspace skill bindings differ`);
    }
  }

  for (const agent of live) {
    if (!agent.archived_at && !documentedIds.has(agent.id)) {
      differences.push(`undocumented active live agent: ${agent.name} (${agent.id})`);
    }
  }

  if (differences.length) {
    for (const difference of differences) console.error(`DRIFT: ${difference}`);
    fail(`Agent drift detected (${differences.length} difference(s)).`);
    return;
  }

  console.log(`Agent configuration matches (${documented.length} documented active agents).`);
}

function apply(page) {
  const { manifest, instructions, slug } = page;
  const args = [
    'agent',
    'update',
    manifest.id,
    '--name',
    manifest.name,
    '--description',
    manifest.description,
    '--instructions',
    instructions,
    '--max-concurrent-tasks',
    String(manifest.max_concurrent_tasks),
    '--model',
    manifest.model,
    '--thinking-level',
    manifest.thinking_level,
    '--permission-mode',
    manifest.permission_mode,
    '--output',
    'json',
  ];

  console.log(`Applying managed fields for ${slug} (${manifest.id})...`);
  runMultica(args, { stdio: 'inherit' });
}

const [command = 'check', target] = process.argv.slice(2);
const pages = documentedAgents();

if (command === 'check') {
  if (target) fail('Usage: sync-agents.mjs check');
  else compare();
} else if (command === 'apply') {
  if (!target) {
    fail('Usage: sync-agents.mjs apply <slug|--all>');
  } else {
    const selected = target === '--all' ? pages : pages.filter(({ slug }) => slug === target);
    if (!selected.length) fail(`Unknown agent page slug: ${target}`);
    else for (const page of selected) apply(page);
  }
} else {
  fail('Usage: sync-agents.mjs <check|apply> [slug|--all]');
}
