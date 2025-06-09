import { defineConfig } from 'tsdown'

const external = ['crypto']

export default [
  defineConfig({
    entry: ['./src'],
    dts: {
      isolatedDeclarations: true,
    },
    external,
  }),
  defineConfig({
    entry: ['./src'],
    format: 'cjs',
    sourcemap: true,
    platform: 'node',
    outputOptions: {
      entryFileNames: 'index.cjs',
      chunkFileNames: '[name]-[hash].cjs',
    },
    external,
  }),
]
