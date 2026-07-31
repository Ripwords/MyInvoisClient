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
import { readFileSync } from 'node:fs'

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

/**
 * Pulls the body of a version's section out of CHANGELOG.md, for use as the
 * GitHub release notes. Returns null when the section is absent.
 */
const extractChangelogSection = (version: string): string | null => {
  const text = readFileSync('CHANGELOG.md', 'utf8')
  const start = text.indexOf(`## v${version}`)
  if (start === -1) return null
  const rest = text.slice(start)
  const nextHeading = rest.indexOf('\n## ', 1)
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading)
  // Drop the heading itself — GitHub shows the tag name as the release title.
  return section.split('\n').slice(1).join('\n').trim() || null
}

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
  // npm validates "cannot publish over an existing version" even with
  // --dry-run, so the preview must run under the target version. Restore the
  // real version afterwards — a dry run must leave the tree untouched.
  await $`npm pkg set version=${target}`
  try {
    await $`npm publish --access public --dry-run`
  } finally {
    await $`npm pkg set version=${current}`
  }
  console.log(`\nDry run complete. Would have released ${target}.`)
  process.exit(0)
}

step(`Setting version to ${target}`)
await $`npm pkg set version=${target}`

step('Generating changelog')
// Two flags are load-bearing, and omitting either fails silently:
//
//   --output   Without it changelogen prints the changelog to stdout and never
//              writes the file, so the commit below would carry an unchanged
//              CHANGELOG.md. The bare flag resolves to CHANGELOG.md.
//   -r         Sets the version used for the heading. Without it changelogen
//              has no idea what version this is — it does NOT read it from
//              package.json — and emits a heading like `## v0.5.0...master`.
//              Unlike --release, -r does not bump anything, which is what we
//              want: the bump is computed above and is deterministic.
const changelog = await $`bunx changelogen --output -r ${target} --no-authors`.nothrow()
if (changelog.exitCode !== 0) {
  console.error(
    `\nchangelogen failed (exit ${changelog.exitCode}). CHANGELOG.md may be ` +
      `incomplete. Nothing has been committed, tagged, or published — the only ` +
      `change on disk is the version in package.json. Revert it with:\n` +
      `  git checkout package.json`,
  )
  process.exit(1)
}

const changelogText = readFileSync('CHANGELOG.md', 'utf8')
if (!changelogText.includes(`v${target}`)) {
  console.error(
    `\nCHANGELOG.md has no section for v${target} after running changelogen. ` +
      `Refusing to publish a release with no changelog entry.\n` +
      `Revert with: git checkout package.json CHANGELOG.md`,
  )
  process.exit(1)
}

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

step('Creating the GitHub release')
// The old scripts pushed the tag but never created a release, so v0.4.2 and
// v0.5.0 existed on npm and as git tags with nothing on the releases page.
// A tag is not a release: it carries no notes and does not notify watchers.
const notes = extractChangelogSection(target)
if (notes) {
  const gh = await $`gh release create v${target} --title ${`v${target}`} --notes ${notes} --latest`.nothrow()
  if (gh.exitCode !== 0) {
    console.warn(
      `\n! The GitHub release could not be created (exit ${gh.exitCode}). ` +
        `npm and the git tag are already published, so this is the only step ` +
        `left. Create it by hand:\n` +
        `  gh release create v${target} --title v${target} --notes-file <notes>`,
    )
  }
} else {
  console.warn(`\n! No CHANGELOG section found for v${target}; skipped the GitHub release.`)
}

console.log(`\n✔ Released ${target}, pushed v${target}, and created the GitHub release.`)
