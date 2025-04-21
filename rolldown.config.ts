import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

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
  },
])
