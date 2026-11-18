const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'browser-eos-test');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-browser-check-'));
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
        `--user-data-dir=${profile}`, '--window-size=1366,900', 'about:blank'
    ], { windowsHide: true, stdio: 'ignore' });
    let socket;
    try {
        const portFile = path.join(profile, 'DevToolsActivePort');
        for (let i = 0; !fs.existsSync(portFile) && i < 100; i++) await wait(100);
        const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
        const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        let id = 0;
        const pending = new Map();
        const contexts = new Map();
        const errors = [];
        socket.onmessage = event => {
            const message = JSON.parse(event.data);
            if (message.id) {
                const handlers = pending.get(message.id);
                pending.delete(message.id);
                if (message.error) handlers?.reject(new Error(JSON.stringify(message.error)));
                else handlers?.resolve(message.result);
            }
            if (message.method === 'Target.attachedToTarget') call('Runtime.enable', {}, message.params.sessionId).catch(() => {});
            if (message.method === 'Runtime.executionContextCreated') contexts.set(`${message.sessionId || ''}:${message.params.context.id}`, { contextId: message.params.context.id, sessionId: message.sessionId });
            if (message.method === 'Runtime.executionContextDestroyed') contexts.delete(`${message.sessionId || ''}:${message.params.executionContextId}`);
            if (message.method === 'Runtime.executionContextsCleared') {
                for (const [key, context] of contexts) if (context.sessionId === message.sessionId) contexts.delete(key);
            }
            if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
        };
        const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
            const requestId = ++id;
            pending.set(requestId, { resolve, reject });
            socket.send(JSON.stringify({ id: requestId, method, params, sessionId }));
        });
        const evaluate = async (expression, context = {}) => {
            const result = await call('Runtime.evaluate', { expression, contextId: context.contextId, returnByValue: true, awaitPromise: true }, context.sessionId);
            if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
            return result.result.value;
        };
        const findApp = async () => {
            for (let attempt = 0; attempt < 120; attempt++) {
                for (const context of contexts.values()) {
                    try { if (await evaluate('Boolean(window.api && document.getElementById("eos-version")?.textContent.includes("Browser Test"))', context)) return context; } catch (_) {}
                }
                await wait(100);
            }
            for (const context of contexts.values()) {
                console.log('Frame diagnostic:', await evaluate('({url:location.href, title:document.title, api:typeof window.api, text:document.body?.innerText.slice(0,800)})', context).catch(String));
            }
            throw new Error('EOS iframe did not initialize: ' + JSON.stringify(errors));
        };
        await call('Runtime.enable');
        await call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
        await call('Page.enable');
        await call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: profile });
        await call('Page.navigate', { url: pathToFileURL(path.join(out, 'EOS-Browser-Test.html')).href });
        let context = await findApp();
        console.log('PASS: standalone HTML initializes inside sandboxed iframe');
        await evaluate('window.alert = text => { (window.testAlerts ||= []).push(text); }; window.api.writeToClipboard = async text => { window.testClipboard = text; };', context);
        const upload = async (functionCall, file) => {
            const data = fs.readFileSync(path.join(out, file), 'utf8');
            return evaluate(`(async () => {
                const click = HTMLInputElement.prototype.click;
                HTMLInputElement.prototype.click = function () {};
                const result = ${functionCall};
                HTMLInputElement.prototype.click = click;
                const input = document.querySelector('[data-eos-file-picker]');
                const transfer = new DataTransfer();
                transfer.items.add(new File([${JSON.stringify(data)}], ${JSON.stringify(file)}, {type:'text/csv'}));
                input.files = transfer.files;
                input.dispatchEvent(new Event('change'));
                await result;
                return true;
            })()`, context);
        };
        await upload("handleFileSelection('yms')", 'sample-yard.csv');
        await upload("handleFileSelection('dockdash')", 'sample-dock.csv');
        await evaluate('reconcileAndDisplay()', context);
        let stats = await evaluate('JSON.parse(JSON.stringify(lastProcessedStats))', context);
        assert.equal(stats.volumeYard, 4000);
        assert.equal(stats.volumeDoors, 2000);
        assert.equal(stats.researchQueue, 1);
        assert.equal(stats.dropPallets.length, 1);
        assert.equal(stats.transshipYard.length, 1);
        assert.equal(stats.excluded.length, 1);
        assert.ok(await evaluate('window.testClipboard.length > 0', context));
        console.log('PASS: CSV pick/read, EOS totals, research queue, exclusion, and copy text');
        await upload("handleOculusFileSelection('vendor')", 'sample-vendor.csv');
        await upload("handleOculusFileSelection('transship')", 'sample-transship.csv');
        await evaluate('window.processHubData()', context);
        await evaluate('reconcileAndDisplay()', context);
        stats = await evaluate('JSON.parse(JSON.stringify(lastProcessedStats))', context);
        assert.equal(stats.researchQueue, 0);
        assert.equal(stats.volumeYard, 4500);
        assert.equal(stats.dropPallets.length, 2);
        console.log('PASS: Vendor/Transship CSV memory resolves missing trailer and updates EOS');
        await evaluate('exportVerifiedCsv()', context);
        const exportPath = path.join(profile, 'Verified_EOS_Report.csv');
        for (let i = 0; !fs.existsSync(exportPath) && i < 50; i++) await wait(100);
        const csv = fs.readFileSync(exportPath, 'utf8');
        assert.match(csv, /200000000001/);
        assert.doesNotMatch(csv, /200000000099/);
        console.log('PASS: CSV export downloads and excludes trailer absent from yard');
        await upload("handleFileSelection('yms')", 'sample-yard-notes.csv');
        await upload("handleFileSelection('dockdash')", 'sample-dock-notes.csv');
        await evaluate('reconcileAndDisplay()', context);
        stats = await evaluate('JSON.parse(JSON.stringify(lastProcessedStats))', context);
        assert.equal(stats.parcelsYard.length, 2);
        assert.equal(stats.disruptions.parcelsYard.length, 3);
        assert.equal(stats.volumeYard, 100);
        assert.equal(stats.researchQueue, 0);
        assert.equal(stats.parcelsDock.length, 0);
        await evaluate('showDetailModal("parcelsYard")', context);
        const detail = await evaluate('document.getElementById("detail-table-body").innerText', context);
        assert.match(detail, /No ISA \(yard notes\)/);
        assert.match(detail, /TESTPARCEL2/);
        assert.match(detail, /DISRUPTION/);
        assert.match(await evaluate('window.testClipboard', context), /2 \+ 3 DISRUPTIONS/);
        await evaluate('document.getElementById("detail-modal").style.display = "none"', context);
        console.log('PASS: new note disruptions and no-ISA parcel deduplication reach EOS, copied text, and detail rows');
        await call('Page.captureScreenshot', { format: 'png' }).then(result => fs.writeFileSync(path.join(out, 'eos-test-preview.png'), Buffer.from(result.data, 'base64')));
        assert.equal(await evaluate('document.getElementById("open-cut-view-btn") === null && document.getElementById("cut-board-view") === null && typeof setupCutView === "undefined"', context), true);
        assert.equal(await evaluate('Boolean(document.getElementById("admin-tools"))', context), true);
        assert.equal(await evaluate('document.getElementById("browser-warning")?.textContent || ""', context), '');
        await call('Page.captureScreenshot', { format: 'png' }).then(result => fs.writeFileSync(path.join(out, 'browser-test-preview.png'), Buffer.from(result.data, 'base64')));
        await call('Page.reload');
        context = await findApp();
        assert.equal(await evaluate('Object.keys(loadOculusMemory().byIsa).length', context), 2);
        assert.equal(await evaluate('ymsData.length', context), 0);
        assert.equal(errors.length, 0, JSON.stringify(errors));
        console.log('PASS: CUT Helper removed; admin tools retained; browser memory persists after reload; CSV state resets');
        await evaluate(`(async () => {
            const click = HTMLInputElement.prototype.click;
            HTMLInputElement.prototype.click = function () {};
            const choice = window.api.openFile();
            HTMLInputElement.prototype.click = click;
            document.querySelector('[data-eos-file-picker]').dispatchEvent(new Event('cancel'));
            if (await choice !== null) throw new Error('File cancel did not return null');
        })()`, context);
        await call('Page.navigate', { url: 'about:blank' });
        await wait(100);
        const userscript = fs.readFileSync(path.join(out, 'GYR2-EOS-Browser-Test.user.js'), 'utf8');
        await evaluate(`window.GM_info = {}; window.mockStore = {}; window.GM_getValue = (k,d) => window.mockStore[k] || d;
            window.GM_setValue = (k,v) => { window.mockStore[k] = v; }; window.GM_setClipboard = text => { window.mockClipboard = text; };\n${userscript}`);
        await evaluate('Array.from(document.querySelectorAll("button")).find(button => button.textContent === "Open EOS").click()');
        context = await findApp();
        await evaluate('window.api.writeToClipboard("EOS clipboard bridge check")', context);
        assert.equal(await evaluate('window.mockClipboard'), 'EOS clipboard bridge check');
        await evaluate('window.eosStorage.setItem("bridge-test", "saved")', context);
        await wait(50);
        assert.equal(await evaluate('JSON.parse(window.mockStore["gyr2-eos-browser-test-v1"])["bridge-test"]'), 'saved');
        assert.equal(errors.length, 0, JSON.stringify(errors));
        console.log('PASS: file-picker cancel; userscript launch, clipboard, and memory bridge with mocked GM APIs');
        await call('Browser.close');
    } finally {
        socket?.close();
        chrome.kill();
        // Chrome can release its temporary profile asynchronously; do not touch other profiles.
        await wait(500);
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
