import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Inline the entry stylesheet into index.html so it doesn't block first render with an extra request.
function inlineEntryCss() {
  return {
    name: 'inline-entry-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = bundle['index.html'];
      if (!html) return;
      let source = html.source.toString();
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type !== 'asset' || !fileName.endsWith('.css')) continue;
        const tag = new RegExp(`<link rel="stylesheet"[^>]*href="/${fileName}"[^>]*>`);
        if (!tag.test(source)) continue;
        source = source.replace(tag, () => `<style>${asset.source}</style>`);
        delete bundle[fileName];
      }
      html.source = source;
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), inlineEntryCss()],
  // The prerender build runs in Node; bundle deps so their browser-only entry points resolve.
  ssr: { noExternal: true },
})
