const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const version = JSON.parse(read('package.json')).version;
const browserVersion = '0.1.2';
const out = path.join(root, 'browser-eos-test');
fs.mkdirSync(out, { recursive: true });
const scriptTag = code => '<script>\n' + code.replace(/<\/script/gi, '<\\/script') + '\n</script>';
const sources = ['index.html', 'styles.css', 'vendor/JsBarcode.all.min.js', 'database.js', 'renderer.js'];
let html = read('index.html').replace('<link rel="stylesheet" href="styles.css">', () => '<style>' + read('styles.css') + '</style>');
// Strip the complete nested CUT view from the browser package while retaining desktop sources.
const cutButton = /<button\b[^>]*\bid="open-cut-view-btn"[^>]*>[\s\S]*?<\/button>/;
const cutView = /<section\b[^>]*\bid="cut-board-view"[^>]*>[\s\S]*?(?=<section\b[^>]*\bid="admin-tools")/;
if (!cutButton.test(html) || !cutView.test(html)) throw new Error('CUT markup changed; review browser exclusions before rebuilding.');
html = html.replace(cutButton, '').replace(cutView, '').replace('<script src="cut-view.js"></script>', '');
html = html.replace('<script src="vendor/JsBarcode.all.min.js"></script>', () => scriptTag(read('vendor/JsBarcode.all.min.js')));
html = html.replace('<script src="database.js"></script>', () => scriptTag('/*EOS_BOOTSTRAP*/') + scriptTag(read('scripts/browser-eos/adapter.js')) + scriptTag(read('database.js').replace(/\blocalStorage\b/g, 'window.eosStorage')));
for (const name of ['renderer.js']) {
    html = html.replace(`<script src="${name}"></script>`, () => scriptTag(read(name).replace(/\blocalStorage\b/g, 'window.eosStorage')));
}
const launcher = read('scripts/browser-eos/launcher.js')
    .replace('__EOS_APP_HTML__', () => JSON.stringify(html))
    .replace('__EOS_APP_VERSION__', () => JSON.stringify(version));
const metadata = `// ==UserScript==
// @name         GYR2 EOS Browser Test
// @namespace    gyr2.operations.eos
// @version      ${browserVersion}
// @description  Current EOS CSV workflow packaged for browser testing; desktop version ${version}.
// @match        https://oculus.qubit.amazon.dev/*
// @match        https://example.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_info
// @noframes
// @run-at       document-end
// ==/UserScript==
`;
fs.writeFileSync(path.join(out, 'GYR2-EOS-Browser-Test.user.js'), metadata + launcher);
fs.writeFileSync(path.join(out, 'EOS-Browser-Test.html'), '<!doctype html><html><head><meta charset="utf-8"><title>EOS Browser Test</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>' + scriptTag(launcher) + '</body></html>');
fs.writeFileSync(path.join(out, 'source-manifest.json'), JSON.stringify({
    desktopVersion: version,
    browserVersion,
    generatedAt: new Date().toISOString(),
    sources: Object.fromEntries(sources.map(name => [name, crypto.createHash('sha256').update(read(name)).digest('hex')])),
    adaptations: 'Browser window.api adapter; localStorage references use isolated browser memory; desktop FC API unavailable; CUT Helper button, view, and script excluded.'
}, null, 2));
console.log('Built browser-eos-test HTML preview and userscript from current desktop sources.');
