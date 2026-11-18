(function () {
    'use strict';
    const appHtml = __EOS_APP_HTML__;
    const appVersion = __EOS_APP_VERSION__;
    const storageKey = 'gyr2-eos-browser-test-v1';
    let frame;
    let container;
    let channel;
    let values = {};
    let storageError = '';
    try {
        const stored = typeof GM_getValue === 'function' ? GM_getValue(storageKey, '{}') : localStorage.getItem(storageKey);
        values = JSON.parse(stored || '{}');
        if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid stored memory');
    } catch (error) {
        values = {};
        storageError = 'Saved browser memory could not be loaded: ' + error.message;
    }

    const reply = data => frame?.contentWindow.postMessage({ eosChannel: channel, ...data }, '*');
    window.addEventListener('message', async event => {
        if (!frame || event.source !== frame.contentWindow || event.data?.eosChannel !== channel) return;
        const data = event.data;
        if (data.action === 'ready' && storageError) reply({ action: 'warning', message: storageError });
        if (data.action === 'storage' && typeof data.key === 'string') {
            if (data.value === null) delete values[data.key];
            else Object.defineProperty(values, data.key, { value: String(data.value), enumerable: true, configurable: true, writable: true });
            try {
                if (typeof GM_setValue === 'function') GM_setValue(storageKey, JSON.stringify(values));
                else localStorage.setItem(storageKey, JSON.stringify(values));
            } catch (error) {
                reply({ action: 'warning', message: 'Memory could not be saved. Keep this page open until you finish EOS. ' + error.message });
            }
        }
        if (data.action === 'clipboard') {
            let ok = false;
            try {
                if (typeof GM_setClipboard === 'function') { GM_setClipboard(data.text, 'text'); ok = true; }
                else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(data.text); ok = true; }
            } catch (_) { /* The in-app manual copy dialog handles browser restrictions. */ }
            reply({ id: data.id, ok });
        }
    });

    function open() {
        if (container) { container.style.display = 'flex'; return; }
        channel = Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join('-');
        container = document.createElement('div');
        container.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;background:#0b121a';
        const bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:16px;align-items:center;padding:6px 12px;background:#13303b;color:white;font:13px sans-serif;flex-shrink:0';
        const label = document.createElement('span');
        label.textContent = 'EOS browser test | Your desktop data is separate | Close hides EOS; refreshing clears loaded CSVs';
        const close = document.createElement('button');
        close.textContent = 'Close EOS';
        close.style.cssText = 'margin-left:auto;padding:5px 12px;cursor:pointer';
        close.onclick = () => { container.style.display = 'none'; };
        bar.append(label, close);
        frame = document.createElement('iframe');
        frame.title = 'EOS browser test';
        frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals allow-downloads');
        frame.style.cssText = 'width:100%;min-height:0;flex:1;border:0;background:#0b121a';
        const bootstrap = JSON.stringify({ channel, values, version: appVersion }).replace(/</g, '\\u003c');
        frame.srcdoc = appHtml.replace('/*EOS_BOOTSTRAP*/', `window.__EOS_BOOT__ = ${bootstrap};`);
        container.append(bar, frame);
        document.body.appendChild(container);
    }

    const launch = document.createElement('button');
    launch.textContent = 'Open EOS';
    launch.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483646;padding:14px 22px;border:1px solid #ffc36b;border-radius:8px;background:#ffad32;color:#172332;font:bold 16px sans-serif;cursor:pointer';
    launch.onclick = open;
    document.body.appendChild(launch);
    if (typeof GM_info === 'undefined') open();
})();
