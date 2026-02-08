import { rmSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  rmSync('dist-electron', { recursive: true, force: true })

  const isServe = command === 'serve'
  const isBuild = command === 'build'
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG
  const devPort = Number(process.env.VITE_PORT || 5173)

  return {
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src')
      },
    },
    build: {
      // Code splitting for better caching and lazy loading
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks
            'vendor-tiptap': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-placeholder', '@tiptap/extension-code-block-lowlight'],
            'vendor-markdown': ['marked', 'turndown'],
            'vendor-editor': ['lowlight'],
          },
        },
      },
      // Enable minification for production
      minify: isBuild ? 'esbuild' : false,
      // Enable source maps for debugging
      sourcemap: sourcemap,
      // Optimize chunk sizes
      chunkSizeWarningLimit: 600, // 600KB warning limit
    },
    plugins: [
      react(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: 'electron/main/index.ts',
          onstart(args) {
            if (process.env.VSCODE_DEBUG) {
              console.log(/* For `.vscode/.debug.script.mjs` */'[startup] Electron App')
            } else {
              args.startup()
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: 'dist-electron/main',
              lib: {
                entry: 'electron/main/index.ts',
                formats: ['cjs'],
              },
              rollupOptions: {
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
                output: {
                  format: 'cjs',
                  entryFileNames: 'index.cjs',
                  exports: 'auto',
                  esModule: false,
                  inlineDynamicImports: true,
                },
              },
            },
          },
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: 'electron/preload/index.ts',
          vite: {
            build: {
              sourcemap: sourcemap ? 'inline' : undefined, // #332
              minify: isBuild,
              outDir: 'dist-electron/preload',
              rollupOptions: {
                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
              },
            },
          },
        },
        // Ployfill the Electron and Node.js API for Renderer process.
        // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: {},
      }),
    ],
    server:
      (process.env.VSCODE_DEBUG &&
        (() => {
          const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
          return {
            host: url.hostname,
            port: +url.port,
            strictPort: true,
          }
        })()) || {
        port: devPort,
        strictPort: true,
      },
    clearScreen: false,
  }
})
