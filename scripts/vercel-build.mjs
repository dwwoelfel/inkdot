import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function extractCredentials(output) {
  const envMatches = Object.fromEntries(
    [
      ...output.matchAll(
        /^(NEXT_PUBLIC_INSTANT_APP_ID|INSTANT_APP_ADMIN_TOKEN)=(.+)$/gm,
      ),
    ].map((m) => [m[1], m[2].trim()]),
  );

  let jsonAppId;
  let jsonAdminToken;

  try {
    const parsed = JSON.parse(output);
    jsonAppId = parsed?.app?.appId;
    jsonAdminToken = parsed?.app?.adminToken;
  } catch {
    const start = output.indexOf('{');
    const end = output.lastIndexOf('}');

    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(output.slice(start, end + 1));
        jsonAppId = parsed?.app?.appId;
        jsonAdminToken = parsed?.app?.adminToken;
      } catch {
        // Fall back to other parse strategies below.
      }
    }
  }

  const appIdMatch =
    envMatches.NEXT_PUBLIC_INSTANT_APP_ID ??
    jsonAppId ??
    output.match(/app id[^a-z0-9]*([a-f0-9-]{36})/i)?.[1] ??
    output.match(/NEXT_PUBLIC_INSTANT_APP_ID[^a-z0-9]*([a-f0-9-]{36})/i)?.[1];

  const adminTokenMatch =
    envMatches.INSTANT_APP_ADMIN_TOKEN ??
    jsonAdminToken ??
    output.match(
      /INSTANT_APP_ADMIN_TOKEN[^A-Za-z0-9_-]*([A-Za-z0-9_-]+)/,
    )?.[1] ??
    output.match(/admin token[^A-Za-z0-9_-]*([A-Za-z0-9_-]+)/i)?.[1];

  if (!appIdMatch || !adminTokenMatch) {
    throw new Error(
      `Unable to parse Instant app credentials from CLI output:
${output}`,
    );
  }

  return { appId: appIdMatch, adminToken: adminTokenMatch };
}

function createPreviewInstantApp() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'local';
  const title = `inkdot-preview-${sha}`;

  const initArgs = [
    'exec',
    'instant-cli',
    'init-without-files',
    '--temp',
    '--title',
    title,
    '--yes',
  ];

  if (process.env.INSTANT_CLI_AUTH_TOKEN) {
    initArgs.splice(3, 0, '--token', process.env.INSTANT_CLI_AUTH_TOKEN);
  }

  const output = run('pnpm', initArgs);

  const creds = extractCredentials(output);

  const tempDir = mkdtempSync(join(tmpdir(), 'inkdot-preview-'));
  const envFile = join(tempDir, '.env.preview.instant');
  writeFileSync(
    envFile,
    `NEXT_PUBLIC_INSTANT_APP_ID=${creds.appId}\nINSTANT_APP_ADMIN_TOKEN=${creds.adminToken}\n`,
    'utf8',
  );

  try {
    run(
      'pnpm',
      ['exec', 'instant-cli', 'push', 'all', '--yes', '--env', envFile],
      {
        stdio: 'inherit',
      },
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  process.env.NEXT_PUBLIC_INSTANT_APP_ID = creds.appId;
  process.env.INSTANT_APP_ADMIN_TOKEN = creds.adminToken;

  console.log(
    `Created temporary Instant app for preview deployment: ${creds.appId}`,
  );
}

function main() {
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const hasInstantCreds =
    Boolean(process.env.NEXT_PUBLIC_INSTANT_APP_ID) &&
    Boolean(process.env.INSTANT_APP_ADMIN_TOKEN);

  if (isPreview && !hasInstantCreds) {
    createPreviewInstantApp();
  }

  execFileSync('pnpm', ['exec', 'next', 'build'], {
    stdio: 'inherit',
    env: process.env,
  });
}

main();
