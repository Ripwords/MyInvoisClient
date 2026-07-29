/**
 * Publish guard: fail loudly if the built dist/ is missing any entry file that
 * package.json points consumers at. Prevents ever publishing a partial artifact
 * (e.g. the cjs-only / types-less 0.4.0 tarball) again.
 *
 * Run after a clean rebuild via the `prepublishOnly` script.
 */
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Every path a consumer can resolve to must exist in the built artifact.
const required = [
  'dist/index.js', // ESM entry (main / exports.import)
  'dist/index.cjs', // CJS entry (exports.require)
  'dist/index.d.ts', // ESM types (types / exports.import types)
  'dist/index.d.cts', // CJS types (exports.require types)
]

const missing = required.filter((rel) => !existsSync(resolve(root, rel)))

if (missing.length > 0) {
  console.error(
    `\n✖ verify-dist: refusing to publish — missing built entries:\n` +
      missing.map((m) => `  - ${m}`).join('\n') +
      `\n\nRun a clean build (\`rm -rf dist && bun run build\`) and try again.\n`,
  )
  process.exit(1)
}

console.log(
  `✔ verify-dist: all ${required.length} required dist entries present.`,
)
