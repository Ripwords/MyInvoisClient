import { defineConfig } from 'tsdown'

// Single coherent build: emits ESM (index.js), CJS (index.cjs), and
// declarations (index.d.ts) in one pass so there is no two-config race
// over a shared dist/ that can drop one format's output.
export default defineConfig({
  entry: ['./src'],
  format: ['es', 'cjs'],
  sourcemap: true,
  platform: 'node',
  dts: {
    isolatedDeclarations: true,
  },
  external: ['crypto'],
})
