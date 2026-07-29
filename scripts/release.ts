/**
 * Release driver.
 *
 * Replaces the previous `release` / `release:minor` / `release:major` npm
 * scripts, which had four defects:
 *
 *  1. `release:minor` and `release:major` never pushed. `postrelease` is only
 *     auto-run after a script literally named `release`, so a minor or major
 *     release published to npm and left the version commit and tag sitting
 *     unpushed on the releaser's machine.
 *  2. `release` ran `prerelease` twice — once via the npm lifecycle hook and
 *     once explicitly in the script body.
 *  3. Nothing ran the test suite before publishing.
 *  4. The bump was delegated to changelogen, which applies 0.x semantics: on a
 *     0.x version a `feat` commit bumps the patch, so `--minor` produced 0.4.3
 *     where 0.5.0 was intended. The bump is now computed here and is
 *     deterministic.
 *
 * Usage:
 *   bun run scripts/release.ts <patch|minor|major> [--otp=123456] [--dry-run]
 *
 * npm requires a one-time password when two-factor authentication is enabled.
 * Pass it with --otp; codes expire quickly, so generate it immediately before
 * running.
 */

import { $ } from 'bun'
import { readFileSync, writeFileSync } from 'node:fs'

type Bump = 'patch' | 'minor' | 'major'

const args = process.argv.slice(2)
const bump = args.find(a => !a.startsWith('--')) as Bump | undefined
const otp = args.find(a => a.startsWith('--otp='))?.split('=')[1]
const dryRun = args.includes('--dry-run')

if (!bump || !['patch', 'minor', 'major'].includes(bump)) {
  console.error('Usage: bun run scripts/release.ts <patch|minor|major> [--otp=code] [--dry-run]')
  process.exit(1)
}

const nextVersion = (current: string, kind: Bump): string => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current)
  if (!match) throw new Error(`Cannot parse version: ${current}`)
  const [major, minor, patch] = match.slice(1).map(Number)
  if (kind === 'major') return `${major + 1}.0.0`
  if (kind === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

const readVersion = (): string =>
  JSON.parse(readFileSync('package.json', 'utf8')).version

const step = (label: string) => console.log(`\n▶ ${label}`)

// ---------------------------------------------------------------------------

const current = readVersion()
const target = nextVersion(current, bump)

console.log(`Releasing ${current} → ${target} (${bump})`)
if (dryRun) console.log('DRY RUN — nothing will be committed, tagged, or published.')

step('Checking working tree is clean')
const status = (await $`git status --porcelain`.text()).trim()
if (status) {
  console.error('Working tree is dirty. Commit or stash first:\n' + status)
  process.exit(1)
}

step('Checking branch')
const branch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim()
if (branch !== 'master') {
  console.error(`Releases run from master. Currently on '${branch}'.`)
  process.exit(1)
}

step('Checking the tag is free')
const existing = (await $`git tag --list v${target}`.text()).trim()
if (existing) {
  console.error(`Tag v${target} already exists. Delete it or pick another bump.`)
  process.exit(1)
}

step('Linting')
await $`bun run lint`

step('Running tests')
// The suite must pass before anything is published. If this blocks you, fix
// the tests — do not remove this gate.
await $`bunx vitest run`

step('Building')
await $`rm -rf dist`
await $`bun run build`
await $`bun run verify-dist`

if (dryRun) {
  step('Dry run: publish preview')
  await $`npm publish --access public --dry-run`
  console.log(`\nDry run complete. Would have released ${target}.`)
  process.exit(0)
}

step(`Setting version to ${target}`)
await $`npm pkg set version=${target}`

step('Generating changelog')
// changelogen writes the section for the version already in package.json.
// It is NOT trusted to choose the bump — that was defect 4 above.
await $`bunx changelogen --no-authors`.nothrow()

step('Committing and tagging')
await $`git add package.json CHANGELOG.md`
await $`git commit -m ${`chore(release): v${target}`}`
await $`git tag -a v${target} -m ${`v${target}`}`

step('Publishing to npm')
try {
  if (otp) {
    await $`npm publish --access public --otp=${otp}`
  } else {
    await $`npm publish --access public`
  }
} catch {
  console.error(
    `\nPublish failed. The version commit and tag v${target} exist locally but ` +
      `have NOT been pushed.\n` +
      `If this was a missing one-time password, re-run just the publish:\n` +
      `  npm publish --access public --otp=<code>\n` +
      `  git push origin master --follow-tags\n` +
      `To abandon the release instead:\n` +
      `  git tag -d v${target} && git reset --hard HEAD~1`,
  )
  process.exit(1)
}

step('Pushing commit and tags')
await $`git push origin master --follow-tags`

console.log(`\n✔ Released ${target} and pushed v${target}.`)
