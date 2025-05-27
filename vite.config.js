import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/ui/popup.html'),
        background: resolve(__dirname, 'src/background/serviceWorker.ts'),
        content: resolve(__dirname, 'src/content/contentScript.ts'),
        injectPanel: resolve(__dirname, 'src/ui/injectPanel.tsx'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'injectPanel') return 'ui/[name].js';
          if (chunkInfo.name === 'popup') return 'ui/[name].js';
          if (chunkInfo.name === 'content') return 'content/contentScript.js';
          if (chunkInfo.name === 'background') return 'background/serviceWorker.js';
          if (chunkInfo.name === '_commonjsHelpers') return 'commonjsHelpers.js';
          return '[name].js';
        },
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name === '_commonjsHelpers') return 'commonjsHelpers.js';
          return '[name].js';
        },
        assetFileNames: '[name].[ext]'
      },
      // Only externalize react/react-dom for background/content, not UI
      external: (id, parent, isResolved) => {
        if (!parent) return false;
        // Externalize for background or content scripts only
        if (/src[\\/]background|src[\\/]content/.test(parent)) {
          return id === 'react' || id === 'react-dom' || id === 'react-dom/client';
        }
        return false;
      },
    }
  },
  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}); 