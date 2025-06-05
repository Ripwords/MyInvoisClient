import { defineConfig } from 'tsdown'

const external = [
  'xmldom-ts',
  'xpath-ts',
  'xml-c14n',
  'xml-crypto',
  'crypto',
  '@xmldom/xmldom',
]

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
