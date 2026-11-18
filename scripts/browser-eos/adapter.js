(function () {
    'use strict';
    const boot = window.__EOS_BOOT__;
    const values = { ...boot.values };
    const files = new Map();
    const pending = new Map();
    let sequence = 0;
    const send = (action, extra = {}) => parent.postMessage({ eosChannel: boot.channel, action, ...extra }, '*');

    window.eosStorage = {
        getItem: key => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null,
        setItem(key, value) {
            values[key] = String(value);
            send('storage', { key, value: String(value) });
        },
        removeItem(key) { delete values[key]; send('storage', { key, value: null }); }
    };

    function warning(message) {
        let box = document.getElementById('browser-warning');
        if (!box) {
            box = document.createElement('div');
            box.id = 'browser-warning';
            box.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:99999;background:#fff4d6;color:#392700;border:2px solid #e9ae32;padding:12px;white-space:pre-wrap';
            document.body.appendChild(box);
        }
        box.textContent = message;
        box.onclick = () => box.remove();
    }
    window.addEventListener('message', event => {
        if (event.source !== parent || event.data?.eosChannel !== boot.channel) return;
        if (event.data.action === 'warning') warning(event.data.message);
        const resolve = pending.get(event.data.id);
        if (resolve) { pending.delete(event.data.id); resolve(event.data); }
    });

    function download(content, name) {
        const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    window.api = {
        openFile: () => new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,text/csv';
            input.hidden = true;
            input.dataset.eosFilePicker = 'true';
            const finish = file => {
                input.remove();
                if (!file) return resolve(null);
                const key = `/browser-${++sequence}/${file.name}`;
                files.set(key, file);
                resolve(key);
            };
            input.onchange = () => finish(input.files[0]);
            input.oncancel = () => finish(null);
            document.body.appendChild(input);
            input.click();
        }),
        readCsvFile: async key => {
            const file = files.get(key);
            if (!file) throw new Error('Please select the CSV again.');
            try { return await file.text(); } finally { files.delete(key); }
        },
        saveCsv: async content => {
            download(content, 'Verified_EOS_Report.csv');
            return true;
        },
        writeToClipboard: async text => {
            const id = ++sequence;
            const result = await new Promise(resolve => {
                pending.set(id, resolve);
                send('clipboard', { id, text: String(text) });
                setTimeout(() => {
                    if (pending.delete(id)) resolve({ ok: false });
                }, 5000);
            });
            if (!result.ok) {
                const dialog = document.createElement('dialog');
                dialog.style.cssText = 'width:min(650px,90vw);padding:20px';
                dialog.innerHTML = '<p>Automatic copy was unavailable. Select this text and press Ctrl+C.</p><textarea style="width:100%;height:280px"></textarea><button>Close</button>';
                dialog.querySelector('textarea').value = text;
                dialog.querySelector('button').onclick = () => dialog.remove();
                document.body.appendChild(dialog);
                dialog.showModal();
                dialog.querySelector('textarea').select();
            }
        },
        getAppVersion: async () => boot.version + ' Browser Test',
        getDisplayMetrics: async () => ({ workAreaSize: { width: screen.availWidth, height: screen.availHeight }, scaleFactor: devicePixelRatio }),
        onDisplayMetricsChanged: callback => {
            const listener = async () => callback(await window.api.getDisplayMetrics());
            window.addEventListener('resize', listener);
            return () => window.removeEventListener('resize', listener);
        }
    };
    window.addEventListener('unhandledrejection', event => warning(`Browser test error: ${event.reason?.message || event.reason}`));
    window.addEventListener('error', event => {
        if (event.message) warning(`Browser test error: ${event.message}`);
    });
    window.addEventListener('DOMContentLoaded', () => {
        const apiButton = document.getElementById('fc-api-submit-btn');
        if (apiButton) {
            apiButton.disabled = true;
            apiButton.textContent = 'Unavailable in browser test';
        }
        const introduction = document.querySelector('#fc-api-modal .modal-intro');
        if (introduction) introduction.textContent = 'This test supports CSV-based EOS. The desktop FC API connection is not included.';
        const footer = document.querySelector('footer');
        if (footer) footer.textContent = 'Browser test | CSV workflow | Memory is separate from the desktop app';
        send('ready');
    });
})();
