/**
 * Runs Allure CLI with a valid JAVA_HOME (Allure requires Java).
 * Fixes invalid system JAVA_HOME (e.g. C:\Program Files\Java\jdk-21 when only jdk-26 is installed).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function javaExecutable(javaHome) {
  const name = process.platform === 'win32' ? 'java.exe' : 'java';
  return path.join(javaHome, 'bin', name);
}

function isValidJavaHome(javaHome) {
  return Boolean(javaHome && fs.existsSync(javaExecutable(javaHome)));
}

function discoverJavaHomesOnWindows() {
  const roots = [
    process.env['ProgramFiles'] && path.join(process.env['ProgramFiles'], 'Java'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Java'),
    process.env['ProgramFiles'] && path.join(process.env['ProgramFiles'], 'Eclipse Adoptium'),
    process.env['ProgramFiles'] && path.join(process.env['ProgramFiles'], 'Microsoft'),
  ].filter(Boolean);

  const homes = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) {
      continue;
    }
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const home = path.join(root, entry.name);
      if (isValidJavaHome(home)) {
        homes.push(home);
      }
    }
  }
  return homes;
}

function resolveJavaHome() {
  if (isValidJavaHome(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }

  const fromEnv = process.env.JDK_HOME || process.env.ALLURE_JAVA_HOME;
  if (isValidJavaHome(fromEnv)) {
    return fromEnv;
  }

  if (process.platform === 'win32') {
    const discovered = discoverJavaHomesOnWindows();
    if (discovered.length > 0) {
      discovered.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      return discovered[0];
    }
  }

  return null;
}

const javaHome = resolveJavaHome();
if (!javaHome) {
  console.error(
    [
      'Could not find a Java installation for Allure.',
      '',
      'Install JDK 17+ (e.g. https://adoptium.net/) then either:',
      '  - Set JAVA_HOME to the JDK folder (must contain bin\\java.exe), or',
      '  - Set ALLURE_JAVA_HOME in src/config/.env',
      '',
      process.env.JAVA_HOME ?
        `Current JAVA_HOME is invalid: ${process.env.JAVA_HOME}`
      : 'JAVA_HOME is not set.',
    ].join('\n'),
  );
  process.exit(1);
}

const env = { ...process.env, JAVA_HOME: javaHome };
const binDir = path.join(javaHome, 'bin');
if (!(env.PATH || '').toLowerCase().includes(binDir.toLowerCase())) {
  env.PATH = `${binDir}${path.delimiter}${env.PATH || ''}`;
}

const allureArgs = process.argv.slice(2);
if (allureArgs.length === 0) {
  console.error('Usage: node scripts/allure-run.mjs <allure-args...>');
  process.exit(1);
}

const allureCli = path.join(repoRoot, 'node_modules', 'allure-commandline', 'bin', 'allure');

if (!fs.existsSync(allureCli)) {
  console.error('Allure CLI not found. Run: npm install');
  process.exit(1);
}

console.log(`Using JAVA_HOME=${javaHome}`);

const result = spawnSync(process.execPath, [allureCli, ...allureArgs], {
  cwd: repoRoot,
  env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
