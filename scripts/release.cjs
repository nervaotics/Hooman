#!/usr/bin/env node
/**
 * Bump package.json version, commit, and tag for GitHub Release CI.
 *
 * Usage:
 *   node scripts/release.cjs patch
 *   node scripts/release.cjs minor
 *   node scripts/release.cjs major
 *   node scripts/release.cjs 1.2.3
 *   node scripts/release.cjs patch --push
 *   node scripts/release.cjs patch --dry-run
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const PKG_PATH = path.join(ROOT, 'package.json')

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts })
}

function runQuiet(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trim()
}

function readPkg() {
  return JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'))
}

function writePkg(pkg) {
  fs.writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
}

function isSemver(v) {
  return /^\d+\.\d+\.\d+$/.test(v)
}

function bump(current, kind) {
  const [maj, min, pat] = current.split('.').map(Number)
  if (kind === 'major') return `${maj + 1}.0.0`
  if (kind === 'minor') return `${maj}.${min + 1}.0`
  if (kind === 'patch') return `${maj}.${min}.${pat + 1}`
  throw new Error(`Unknown bump kind: ${kind}`)
}

function parseArgs(argv) {
  const flags = { push: false, dryRun: false }
  const positional = []
  for (const arg of argv) {
    if (arg === '--push') flags.push = true
    else if (arg === '--dry-run') flags.dryRun = true
    else if (arg === '--help' || arg === '-h') flags.help = true
    else positional.push(arg)
  }
  return { flags, positional }
}

function printHelp() {
  console.log(`
Hooman release helper

  node scripts/release.cjs <patch|minor|major|x.y.z> [--push] [--dry-run]

Examples:
  npm run release:patch
  npm run release:minor -- --push
  node scripts/release.cjs 0.2.0 --dry-run

After tagging, GitHub Actions publishes the Windows installer and clients auto-update.
`)
}

function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2))
  if (flags.help || positional.length === 0) {
    printHelp()
    process.exit(flags.help ? 0 : 1)
  }

  const arg = positional[0]
  const pkg = readPkg()
  const current = pkg.version
  const next = isSemver(arg) ? arg : bump(current, arg)

  if (!isSemver(next)) {
    console.error(`Invalid version: ${next}`)
    process.exit(1)
  }

  if (next === current) {
    console.error(`Version unchanged (${current}). Choose patch, minor, major, or an explicit version.`)
    process.exit(1)
  }

  const tag = `v${next}`

  let dirty = false
  try {
    const status = runQuiet('git status --porcelain')
    dirty = Boolean(status)
  } catch {
    console.warn('[release] Not a git repo or git unavailable — version bump only.')
  }

  console.log(`\nRelease plan`)
  console.log(`  ${current} -> ${next}`)
  console.log(`  tag: ${tag}`)
  if (dirty) console.log(`  note: working tree has uncommitted changes`)

  if (flags.dryRun) {
    console.log('\nDry run — no files or git state changed.')
    return
  }

  pkg.version = next
  writePkg(pkg)
  console.log(`\nUpdated ${path.relative(ROOT, PKG_PATH)}`)

  try {
    run(`git add package.json`)
    run(`git commit -m "chore(release): ${tag}"`)
    run(`git tag ${tag}`)
    console.log(`\nCreated commit and tag ${tag}`)
  } catch (err) {
    console.error('\nGit step failed. package.json was updated; finish manually if needed.')
    process.exit(1)
  }

  if (flags.push) {
    try {
      const branch = runQuiet('git rev-parse --abbrev-ref HEAD')
      run(`git push origin ${branch}`)
      run(`git push origin ${tag}`)
      console.log(`\nPushed branch and tag. Watch GitHub Actions for the release build.`)
    } catch {
      console.error('\nPush failed. Run manually:')
      console.error(`  git push origin HEAD`)
      console.error(`  git push origin ${tag}`)
      process.exit(1)
    }
  } else {
    console.log('\nNext steps:')
    console.log(`  git push origin HEAD`)
    console.log(`  git push origin ${tag}`)
    console.log('\nOr rerun with --push to do both automatically.')
  }
}

main()
