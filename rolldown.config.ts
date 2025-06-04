import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

const external = ['xmldom-ts', 'xpath-ts', 'xml-c14n']

export default defineConfig([
  {
    input: 'src/index.ts',
    plugins: [
      dts({
        isolatedDeclaration: true,
      }),
    ],
    output: {
      dir: 'dist',
    },
    external,
  },
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist',
      format: 'commonjs',
      sourcemap: true,
      entryFileNames: 'index.cjs',
      chunkFileNames: '[name]-[hash].cjs',
    },
    external,
  },
])
