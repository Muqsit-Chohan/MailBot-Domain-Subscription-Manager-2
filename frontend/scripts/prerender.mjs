// Injects the server-rendered landing page into dist/index.html.
// dist/app.html keeps the empty shell for every other route (see vercel.json).
import { readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dist = path.resolve('dist');
const ssrDir = path.resolve('dist-ssr');

const shell = await readFile(path.join(dist, 'index.html'), 'utf8');
const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-prerender.js')).href);

const rootTag = '<div id="root"></div>';
if (!shell.includes(rootTag)) throw new Error('prerender: #root not found in dist/index.html');

await writeFile(path.join(dist, 'app.html'), shell);
await writeFile(path.join(dist, 'index.html'), shell.replace(rootTag, () => `<div id="root">${render()}</div>`));
await rm(ssrDir, { recursive: true, force: true });

console.log('prerender: wrote dist/index.html (landing) and dist/app.html (shell)');
