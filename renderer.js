// =========================================================================
// 1. Dependencies & Global State
// =========================================================================
let ymsFilePath = null;
let dockdashFilePath = null;
let ymsData = []; 
let dockdashData = []; 

// --- NEW: HUB DATA STORAGE ---
let hubData = {
    vendorDock: {},
    vendorYard: {},
    transshipDock: {},
    transshipYard: {}
};
let gapFillerData = { byIsa: {}, byVrid: {} }; 
let lastProcessedStats = {}; 

// Helper to normalize strings
function normalize(val) { 
    let str = String(val || "").trim().toUpperCase();
    if (str.startsWith('"') && str.endsWith('"')) str = str.slice(1, -1).trim();
    if (str.includes("E+") && !isNaN(parseFloat(str))) {
        let num = parseFloat(str);
        if (num > 1e10) return String(Math.round(num)); 
    }
    return str;
}

function parseHours(str) { return parseFloat(String(str || "").toLowerCase().replace("hrs", "").trim()) || 0; }

function getField(record, keyName) {
    if (!record) return undefined;
    const normalizedKey = keyName.toUpperCase().trim();
    const actualKey = Object.keys(record).find(k => k.trim().toUpperCase() === normalizedKey);
    return actualKey ? record[actualKey] : undefined;
}

const PARCEL_CARRIERS = ['UPSS', 'UPSN', 'FDEG', 'FED EX', 'FEDEX', 'DHLC'];

function isParcelCarrier(carrier) {
    const normalizedCarrier = normalize(carrier).replace(/\s+/g, ' ');
    const compactCarrier = normalizedCarrier.replace(/\s+/g, '');

    return PARCEL_CARRIERS.some(code => {
        const normalizedCode = normalize(code).replace(/\s+/g, ' ');
        const compactCode = normalizedCode.replace(/\s+/g, '');

        return normalizedCarrier.includes(normalizedCode) || compactCarrier.includes(compactCode);
    });
}

function isLiveDropCarrier(carrier) {
    const normalizedCarrier = normalize(carrier);
    const compactCarrier = normalizedCarrier.replace(/\s+/g, '');

    return normalizedCarrier === "ATSB" || compactCarrier.includes("ATSB");
}

function isDoorLocation(location) {
    return normalize(location).startsWith("DD");
}

function isYardLocation(location) {
    return normalize(location).startsWith("PS");
}

function categoryAllowsLocation(category, location) {
    if (['dropPallets', 'dropFloor', 'parcelsYard', 'transshipYard', 'azngOver72'].includes(category)) {
        return isYardLocation(location);
    }

    if (['parcelsDock', 'livesHanded'].includes(category)) {
        return isDoorLocation(location);
    }

    return true;
}

function inferYmsOnlyCategory(ymsInfo) {
    const notes = normalize(ymsInfo.notes);

    if (notes.includes("IBTRANS")) {
        if (isYardLocation(ymsInfo.location)) {
            return { category: 'transshipYard', confidence: 'MEDIUM', reason: 'IBTRANS in notes, PS location' };
        }

        if (isDoorLocation(ymsInfo.location)) {
            return { category: null, confidence: 'IGNORE', reason: 'IBTRANS already on DD; units unknown' };
        }
    }

    if (notes.includes("PARCEL")) {
        if (isDoorLocation(ymsInfo.location)) {
            return { category: 'parcelsDock', confidence: 'MEDIUM', reason: 'PARCEL in notes, DD location' };
        }

        if (isYardLocation(ymsInfo.location)) {
            return { category: 'parcelsYard', confidence: 'MEDIUM', reason: 'PARCEL in notes, PS location' };
        }
    }

    return null;
}

function parseSpdDate(value) {
    const raw = String(value || "").trim().replace(/^"|"$/g, '');
    if (!raw || raw.toLowerCase() === 'undefined') return null;

    const match = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    let year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;

    const hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    const date = new Date(year, month - 1, day, hour, minute);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatSpdDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${month}/${day}/${year} ${hour}:${minute}`;
}

function findOldestSpdRecord(records, ymsLookup) {
    return records
        .map(record => {
            const isa = normalize(getField(record, "ISA"));
            const ymsInfo = ymsLookup[isa];
            const dockLocation = normalize(getField(record, "LOCATION"));
            const spdDate = parseSpdDate(getField(record, "SPD"));

            return { isa, dockLocation, ymsInfo, spdDate };
        })
        .filter(candidate =>
            candidate.isa &&
            candidate.ymsInfo &&
            candidate.spdDate &&
            !isDoorLocation(candidate.dockLocation) &&
            !isDoorLocation(candidate.ymsInfo.location)
        )
        .sort((a, b) => a.spdDate - b.spdDate)[0] || null;
}

function findOldestTrailerInYard(records, ymsLookup) {
    return records
        .map(record => {
            const isa = normalize(getField(record, "ISA"));
            const ymsInfo = ymsLookup[isa];
            const dockLocation = normalize(getField(record, "LOCATION"));
            const dwellHours = parseHours(getField(record, "YARD DWELL"));

            return { isa, dockLocation, ymsInfo, dwellHours };
        })
        .filter(candidate =>
            candidate.isa &&
            candidate.ymsInfo &&
            candidate.dwellHours > 0 &&
            !isDoorLocation(candidate.dockLocation) &&
            !isDoorLocation(candidate.ymsInfo.location)
        )
        .sort((a, b) => b.dwellHours - a.dwellHours)[0] || null;
}

// =========================================================================
// 2. Clipboard Logic
// =========================================================================
function copyStatsToClipboard(stats) {
    if (!stats || !stats.dropPallets) return;
    
    const totalParcels = stats.parcelsDock.length + stats.parcelsYard.length;
    const liveDropCount = stats.liveDrops ? stats.liveDrops.length : 0;
    const trueLiveCount = Math.max(stats.livesHanded.length - liveDropCount, 0);
    const livesClipboardValue = liveDropCount > 0 ?
        `${trueLiveCount} (${liveDropCount} live/drops)` :
        String(stats.livesHanded.length);
    
    const oldestSpdIsa = stats.oldestSpd ? stats.oldestSpd.isa : "";
    const oldestSpdDate = stats.oldestSpd ? stats.oldestSpd.date : "";
    const oldestTrailerIsa = stats.oldestTrailer ? stats.oldestTrailer.isa : "";

    const clipboardString = [
        oldestSpdIsa,                   // Oldest SPD ISA
        oldestSpdDate,                  // Oldest SPD Date
        oldestTrailerIsa,               // Oldest Trailer In Yard ISA
        "",
        stats.dropPallets.length,       // 1. Drop PL
        stats.dropFloor.length,         // 2. Drop FL
        stats.parcelsDock.length,       // 3. Parcels Dock
        stats.parcelsYard.length,       // 4. Parcels Yard
        totalParcels,                   // 5. Total Parcels
        stats.transshipYard.length,     // 6. Transship Yard
        stats.azngOver72.length,        // 7. AZNG > 72h
        "",                             // 8. Space
        livesClipboardValue,            // 9. Lives Handed
        "",                             // 10. Space
        "",                             // 11. Space
        Math.round(stats.volumeDoors),  // 12. Volume Doors
        Math.round(stats.volumeYard)    // 13. Volume Yard
    ].join('\n');

    window.api.writeToClipboard(clipboardString);
}

// =========================================================================
// 3. UI Update Functions 
// =========================================================================
function updateMetricsUI(stats) {
    const updateTile = (id, value, isCritical = false) => {
        const element = document.getElementById(id);
        if (element) {
            const valueElement = element.querySelector('.value'); 
            if (valueElement) valueElement.textContent = value.toLocaleString();
            if (isCritical && value > 0) element.classList.add('critical-active');
            else element.classList.remove('critical-active');
        }
    };

    updateTile('dropPallets', stats.dropPallets.length);
    updateTile('dropFloor', stats.dropFloor.length);
    updateTile('totalParcels', stats.parcelsDock.length + stats.parcelsYard.length);
    updateTile('parcelsDock', stats.parcelsDock.length);
    updateTile('parcelsYard', stats.parcelsYard.length);
    updateTile('transshipYard', stats.transshipYard.length);
    updateTile('livesHanded', stats.livesHanded.length);
    updateTile('azngOver72', stats.azngOver72.length, true);
    updateTile('researchQueue', stats.researchQueue, true); 
    
    updateTile('volumeDoors', Math.round(stats.volumeDoors));
    updateTile('volumeYard', Math.round(stats.volumeYard));
}

function updateActionPanel(status) {
    const panel = document.getElementById('action-panel');
    const message = document.getElementById('action-message');
    const icon = document.getElementById('action-icon');
    panel.classList.remove('status-neutral', 'status-critical', 'status-success');

    if (status.reconciled) {
        const isCritical = status.azngOver72 > 0 || status.researchQueue > 0;
        panel.classList.add(isCritical ? 'status-critical' : 'status-success');
        icon.className = isCritical ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle';
        message.textContent = isCritical ?
            `CRITICAL: ${status.researchQueue} items need research.` :
            'SUCCESS: Metrics generated.';
    } else {
        panel.classList.add('status-neutral');
        icon.className = 'fas fa-info-circle';
        message.textContent = status.message || "Ready.";
    }
}

function updateCardStatus(type, text, success) {
    const card = document.getElementById(`${type}-card`);
    const status = document.getElementById(`${type}-status`);
    const icon = card ? card.querySelector('.main-icon') : null;

    if (!card) return;

    card.classList.remove('success', 'error');
    
    if (success === true) {
        card.classList.add('success');
        if(icon) icon.className = 'fas fa-check-circle main-icon fa-5x';
    } else if (success === false) {
        card.classList.add('error');
        if(icon) icon.className = 'fas fa-times-circle main-icon fa-5x';
    } else {
        // Reset to default icons
        if(icon) {
            if (type === 'yms') icon.className = 'fas fa-database main-icon fa-5x';
            else if (type === 'dockdash') icon.className = 'fas fa-file-csv main-icon fa-5x';
            else if (type === 'gap-filler') icon.className = 'fas fa-network-wired main-icon fa-5x'; // Updated Icon
        }
    }
    if (status) status.textContent = text;
}

// =========================================================================
// 4. Modal & Research Logic
// =========================================================================

// --- NEW: HUB NAVIGATION ---
window.switchHubStep = function(step) {
    document.getElementById('hub-step-1').style.display = (step === 1) ? 'block' : 'none';
    document.getElementById('hub-step-2').style.display = (step === 2) ? 'block' : 'none';
};

// --- NEW: REGEX PARSER (Bulletproof Copy/Paste) ---
function parsePastedTable(text) {
    const results = [];
    const rows = text.split(/\r\n|\n|\r/);

    rows.forEach(line => {
        if (line.trim().length < 5) return;

        const isaMatch = line.match(/\b(2\d{11})\b/);
        const normalizedLine = line.toUpperCase();
        const idTokens = normalizedLine.match(/\b[A-Z0-9]{8,12}\b/g) || [];
        const vrid = idTokens.find(token => token !== isaMatch?.[1] && !/^2\d{11}$/.test(token)) || null;
        const unitsMatch = line.match(/(\d{1,3}(,\d{3})*|\d+)(?=\s*(Cases|Units|Pending|Total))/i) || line.match(/(\d{1,3}(,\d{3})*)/);
        const isPalletized = normalizedLine.includes("PALLET") || normalizedLine.includes("SKID");

        const record = {
            isa: isaMatch ? isaMatch[1] : null,
            vrid,
            units: unitsMatch ? parseFloat(unitsMatch[1].replace(/,/g, '')) : 0,
            isPalletized,
            raw: line
        };

        if (record.isa || record.vrid) results.push(record);
    });

    return results;
}

// --- NEW: PROCESS HUB DATA ---
window.processHubData = function() {
    // Reset Data
    hubData = { vendorDock: {}, vendorYard: {}, transshipDock: {}, transshipYard: {} };

    // 1. Vendor Dock
    const vd = parsePastedTable(document.getElementById('paste-vendor-dock').value);
    vd.forEach(r => { if(r.isa) hubData.vendorDock[r.isa] = r; });

    // 2. Vendor Yard
    const vy = parsePastedTable(document.getElementById('paste-vendor-yard').value);
    vy.forEach(r => { if(r.isa) hubData.vendorYard[r.isa] = r; });

    // 3. Transship Dock (Key by VRID)
    const td = parsePastedTable(document.getElementById('paste-trans-dock').value);
    td.forEach(r => { if(r.vrid) hubData.transshipDock[r.vrid] = r; });

    // 4. Transship Yard (Key by ISA or VRID)
    const ty = parsePastedTable(document.getElementById('paste-trans-yard').value);
    ty.forEach(r => { 
        if(r.isa) hubData.transshipYard[r.isa] = r; 
        else if(r.vrid) hubData.transshipYard[r.vrid] = r;
    });

    const total = vd.length + vy.length + td.length + ty.length;
    document.getElementById('research-hub-modal').style.display = 'none';
    
    updateCardStatus('gap-filler', `Hub Synced: ${total} records`, true);
    
    // Enable Reconcile
    const reconcileBtn = document.getElementById('reconcile-btn');
    if (ymsFilePath && dockdashFilePath && reconcileBtn) reconcileBtn.disabled = false;
};

// --- MANUAL INTERACTION ---
window.editResearchItem = function(index) {
    const record = lastProcessedStats.researchQueueRecords[index];
    const newLoc = prompt("Enter new Location (leave blank to keep current):", record.location);
    if (newLoc) {
        lastProcessedStats.researchQueueRecords[index].location = newLoc;
        showDetailModal('researchQueue');
    }
};

window.moveResearchItem = function(index) {
    const record = lastProcessedStats.researchQueueRecords[index];
    const select = document.getElementById(`assign-select-${index}`);
    const unitsInput = document.getElementById(`assign-units-${index}`);
    
    const targetCategory = select.value;
    const manualUnits = parseFloat(unitsInput.value.replace(/,/g, '')) || 0;

    if (!targetCategory) { alert("Please select a category."); return; }

    // 1. SAVE TO MEMORY
    if (typeof rememberTrailer === 'function') {
        rememberTrailer(record.isa, record.vrid, targetCategory, manualUnits, record.notes);
    }

    // 2. Update Stats
    const recordInfo = { 
        isa: record.isa, 
        vrid: record.vrid, 
        location: record.location, 
        dwell: record.dwell, 
        pallets: 'MANUAL',
        category: targetCategory,
        units: manualUnits
    };

    switch(targetCategory) {
        case 'dropPallets': lastProcessedStats.dropPallets.push(recordInfo); lastProcessedStats.volumeYard += manualUnits; break;
        case 'dropFloor': lastProcessedStats.dropFloor.push(recordInfo); lastProcessedStats.volumeYard += manualUnits; break;
        case 'transshipYard': lastProcessedStats.transshipYard.push(recordInfo); lastProcessedStats.volumeYard += manualUnits; break;
        case 'parcelsYard': lastProcessedStats.parcelsYard.push(recordInfo); lastProcessedStats.volumeYard += manualUnits; break;
        case 'parcelsDock': lastProcessedStats.parcelsDock.push(recordInfo); lastProcessedStats.volumeDoors += manualUnits; break;
        case 'livesHanded': lastProcessedStats.livesHanded.push(recordInfo); lastProcessedStats.volumeDoors += manualUnits; break;
        case 'volOnlyDoors': lastProcessedStats.volumeDoors += manualUnits; break;
        case 'volOnlyYard': lastProcessedStats.volumeYard += manualUnits; break;
    }

    // 3. Remove from Queue & Refresh UI
    lastProcessedStats.researchQueueRecords.splice(index, 1);
    lastProcessedStats.researchQueue = lastProcessedStats.researchQueueRecords.length;

    updateMetricsUI(lastProcessedStats);
    copyStatsToClipboard(lastProcessedStats);

    if (lastProcessedStats.researchQueue > 0) {
        showDetailModal('researchQueue'); 
    } else {
        document.getElementById('detail-modal').style.display = 'none';
        updateActionPanel({ 
            reconciled: true, 
            excluded: lastProcessedStats.excluded.length, 
            azngOver72: lastProcessedStats.azngOver72.length, 
            researchQueue: 0,
            message: "All research items resolved."
        });
    }
};

function showDetailModal(metricId) {
    if (!lastProcessedStats || Object.keys(lastProcessedStats).length === 0) {
        return;
    }

    let records = lastProcessedStats[metricId];
    let modalTitle = metricId.toUpperCase().replace(/([A-Z])/g, ' $1');
    const isResearchQueue = (metricId === 'researchQueue');
    
    if (isResearchQueue) records = lastProcessedStats.researchQueueRecords;
    if (metricId === 'excluded') records = lastProcessedStats.excluded;

    if (!Array.isArray(records) || records.length === 0) { 
        return; 
    }

    const modal = document.getElementById('detail-modal'); 
    const tbody = document.getElementById('detail-table-body');
    const thead = modal.querySelector('thead tr');
    const title = document.getElementById('modal-title');
    
    title.textContent = `${modalTitle} (${records.length})`;
    thead.innerHTML = ''; 
    
    let headers = isResearchQueue ? 
        ['ISA', 'VRID', 'LOC', 'NOTES', 'CATEGORY', 'UNITS', 'ACTION'] : 
        (metricId === 'excluded' ? ['ISA', 'VRID', 'LOCATION'] : ['ISA', 'VRID', 'LOCATION', 'DWELL', 'PALLETS']);

    headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; thead.appendChild(th); });
    
    tbody.innerHTML = ''; 
    records.forEach((record, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = record.isa || 'N/A';
        row.insertCell().textContent = record.vrid || 'N/A';
        row.insertCell().textContent = record.location || 'N/A';
        
        if (isResearchQueue) {
            const notesCell = row.insertCell();
            notesCell.textContent = record.notes || ''; 
            notesCell.style.maxWidth = "200px"; notesCell.style.overflow = "hidden"; notesCell.style.textOverflow = "ellipsis"; notesCell.style.whiteSpace = "nowrap";

            // Auto-Select Logic
            const defaultCat = record.suggestedCategory || ""; 
            const cellAssign = row.insertCell();
            cellAssign.innerHTML = `
                <div style="display:flex; gap:5px; flex-direction:column;">
                <button onclick="window.editResearchItem(${index})" style="background:#f39c12; color:white; border:none; padding:2px; cursor:pointer;">EDIT LOC</button>
                <select id="assign-select-${index}" style="width:100%; color:black;">
                    <option value="" disabled ${!defaultCat ? 'selected' : ''}>Select...</option>
                    <optgroup label="Volume Only">
                        <option value="volOnlyDoors" ${defaultCat === 'volOnlyDoors' ? 'selected' : ''}>Volume on Doors</option>
                        <option value="volOnlyYard" ${defaultCat === 'volOnlyYard' ? 'selected' : ''}>Volume in Yard</option>
                    </optgroup>
                    <optgroup label="Assign to Tile">
                        <option value="dropPallets" ${defaultCat === 'dropPallets' ? 'selected' : ''}>Drop Pallets</option>
                        <option value="dropFloor" ${defaultCat === 'dropFloor' ? 'selected' : ''}>Drop Floor</option>
                        <option value="transshipYard" ${defaultCat === 'transshipYard' ? 'selected' : ''}>Transship Yard</option>
                        <option value="parcelsDock" ${defaultCat === 'parcelsDock' ? 'selected' : ''}>Parcels on Dock</option>
                        <option value="parcelsYard" ${defaultCat === 'parcelsYard' ? 'selected' : ''}>Parcels in Yard</option>
                        <option value="livesHanded" ${defaultCat === 'livesHanded' ? 'selected' : ''}>Lives Handed Over</option>
                    </optgroup>
                </select>
                <input type="text" inputmode="numeric" id="assign-units-${index}" placeholder="Units" style="width:60px; color:black;">
                <button onclick="window.moveResearchItem(${index})" style="background:#2ecc71; color:white; border:none; padding:5px; cursor:pointer;">MOVE</button>
                </div>`;
        } else if (metricId !== 'excluded') {
            row.insertCell().textContent = record.dwell || 'N/A';
            row.insertCell().textContent = record.pallets || '0';
        }
    });
    modal.style.display = 'block';
}

// =========================================================================
// 5. File Handling & Parsing
// =========================================================================
function parseCSV(text, requiredHeaders = []) {
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const rows = [];
    let currentRow = [];
    let currentVal = "";
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') insideQuote = !insideQuote;
        else if (char === ',' && !insideQuote) { currentRow.push(currentVal.trim()); currentVal = ""; }
        else if (char === '\n' && !insideQuote) {
            currentRow.push(currentVal.trim());
            if (currentRow.length > 1 || currentRow[0] !== "") rows.push(currentRow);
            currentRow = []; currentVal = "";
        } else currentVal += char;
    }
    if (currentVal) currentRow.push(currentVal.trim());
    if (currentRow.length > 0) rows.push(currentRow);
    if (rows.length < 2) return [];

    if (requiredHeaders.length === 0) {
        // Broad parsing (for Gap Filler backup)
        const headers = rows[0].map(h => h.trim().toUpperCase());
        const data = [];
        for (let i = 1; i < rows.length; i++) {
            const record = {};
            if (rows[i].length >= headers.length) {
                headers.forEach((h, index) => { record[h] = rows[i][index]; });
                data.push(record);
            }
        }
        return data;
    }

    const headers = rows[0].map(h => h.trim().toUpperCase());
    const missing = requiredHeaders.filter(h => !headers.some(header => header.includes(h)));
    if (missing.length > 0) { alert(`Missing required headers: ${missing.join(", ")}`); return []; }

    const data = [];
    for (let i = 1; i < rows.length; i++) {
        const record = {};
        if (rows[i].length >= headers.length) {
            headers.forEach((h, index) => { record[h] = rows[i][index]; });
            data.push(record);
        }
    }
    return data;
}

async function handleFileSelection(type) {
    const filePath = await window.api.openFile();
    if (!filePath) return;
    
    updateCardStatus(type, "Reading...", null);
    const rawData = await window.api.readCsvFile(filePath);
    
    // YMS needs "LOAD IDENTIFIER(S)", DockDash needs "ISA"
    const headers = type === 'yms' ? ["LOAD IDENTIFIER(S)"] : ["ISA", "VRID"];
    const parsed = parseCSV(rawData, headers);
    
    if (parsed.length === 0) {
        updateCardStatus(type, "Failed to load or empty.", false);
        return;
    }
    
    if (type === 'yms') { ymsData = parsed; ymsFilePath = filePath; }
    else { dockdashData = parsed; dockdashFilePath = filePath; }
    
    const fileName = filePath.split(/[/\\]/).pop();
    updateCardStatus(type, `Loaded: ${fileName} (${parsed.length} rows)`, true);
    
    const reconcileBtn = document.getElementById('reconcile-btn');
    const dockdashBtn = document.getElementById('browse-dockdash-btn');
    
    if (type === 'yms' && dockdashBtn) dockdashBtn.disabled = false;
    if (ymsFilePath && dockdashFilePath && reconcileBtn) reconcileBtn.disabled = false;
}

// Backup Gap Filler Selection
async function handleGapFillerSelection() {
    const filePath = await window.api.openFile();
    if (!filePath) return;

    updateCardStatus('gap-filler', "Reading...", null);
    const rawData = await window.api.readCsvFile(filePath);
    const rows = parseCSV(rawData, []); 
    
    gapFillerData = { byIsa: {}, byVrid: {} };
    let count = 0;

    rows.forEach(row => {
        const isa = normalize(getField(row, "ISA") || getField(row, "Container ID"));
        const vrid = normalize(getField(row, "Trailer VRID") || getField(row, "VRID"));
        const rawUnits = getField(row, "Total Units") || getField(row, "Pending Units") || "0";
        const units = parseFloat(rawUnits.replace(/,/g, '')) || 0;

        if (isa && isa.length > 4) {
            gapFillerData.byIsa[isa] = { units: units, vrid: vrid || "UNKNOWN" };
            count++;
        }
        if (vrid && vrid.length > 4) {
            gapFillerData.byVrid[vrid] = { units: units, isa: isa || "UNKNOWN" };
            if (!isa || isa.length <= 4) count++;
        }
    });

    updateCardStatus('gap-filler', `Loaded: ${count} Records`, true);
    console.log("Gap Filler Data Loaded:", gapFillerData);
}

// =========================================================================
// 6. Core Logic: Reconcile (UPGRADED)
// =========================================================================
function extractYmsIsa(record) {
    const fullLoadId = getField(record, "LOAD IDENTIFIER(S)");
    if (fullLoadId) {
        const match = fullLoadId.match(/ISA\W*(\d+)/i);
        if (match) return normalize(match[1]);
    }
    return null;
}

function calculateMetrics(data, excluded) {
    let stats = {
        dropPallets: [], dropFloor: [], parcelsDock: [], parcelsYard: [],
        transshipYard: [], azngOver72: [], livesHanded: [], liveDrops: [], researchQueue: 0,
        volumeDoors: 0, volumeYard: 0, excluded: excluded
    };
    
    data.forEach(record => {
        const type = normalize(getField(record, "CARRIER LOAD TYPE"));
        const appt = normalize(getField(record, "APPOINTMENT TYPE"));
        const loc = normalize(getField(record, "LOCATION"));
        const carrier = normalize(getField(record, "CARRIER"));
        const units = parseFloat(String(getField(record, "UNITS") || "0").replace(/,/g, '')) || 0;
        const dwell = parseHours(getField(record, "YARD DWELL"));
        const isParcel = appt === "SMALL_PARCEL" || isParcelCarrier(carrier);
        
        const info = { 
            isa: getField(record, "ISA"), 
            vrid: getField(record, "VRID"), 
            location: loc, 
            dwell: getField(record, "YARD DWELL"), 
            pallets: getField(record, "PALLETS"),
            carrier,
            loadType: type
        };
        
        if (isDoorLocation(loc)) stats.volumeDoors += units;
        else if (isYardLocation(loc)) stats.volumeYard += units;

        if (type === "DROP" && appt === "CARP" && isYardLocation(loc)) {
            if (parseFloat(getField(record, "PALLETS")) > 0) stats.dropPallets.push(info);
            else stats.dropFloor.push(info);
        }
        if (isParcel) {
            if (isDoorLocation(loc)) stats.parcelsDock.push(info);
            if (isYardLocation(loc)) stats.parcelsYard.push(info);
        }
        if (appt === "TRANSSHIP" && isYardLocation(loc)) stats.transshipYard.push(info);
        if (carrier.startsWith("AZNG") && dwell >= 72 && isYardLocation(loc)) stats.azngOver72.push(info);
        if (type === "LIVE" && isDoorLocation(loc)) {
            stats.livesHanded.push(info);
            if (isLiveDropCarrier(carrier)) stats.liveDrops.push(info);
        }
    });
    return stats;
}

async function reconcileAndDisplay() {
    if (!ymsData.length || !dockdashData.length) return;
    
    updateActionPanel({ reconciled: false, message: 'Processing with Hub...' });

    try {
        const ymsIsaSet = new Set();
        const ymsLookup = {}; 
        
        ymsData.forEach(r => { 
            const isa = extractYmsIsa(r); 
            if (isa) {
                ymsIsaSet.add(isa);
                ymsLookup[isa] = {
                    location: normalize(getField(r, "LOCATION")),
                    dwell: getField(r, "YARD DWELL"),
                    fullLoadId: getField(r, "LOAD IDENTIFIER(S)"),
                    notes: (getField(r, "NOTES") || "").toUpperCase(),
                    owner: (getField(r, "OWNER (OPERATOR)") || getField(r, "OWNER") || "").toUpperCase(),
                    carrier: normalize(getField(r, "CARRIER")),
                    loadType: normalize(getField(r, "CARRIER LOAD TYPE"))
                };
            }
        });

        const dockdashIsaSet = new Set();
        const finalMetricsData = [];
        const excludedRecords = [];

        dockdashData.forEach(r => {
            let isa = normalize(getField(r, "ISA"));
            if (!isa || isa.includes("E+") || isa.length < 5) return; 
            dockdashIsaSet.add(isa);
            
            if (ymsIsaSet.has(isa)) {
                finalMetricsData.push(r);
            } else {
                excludedRecords.push({ isa, vrid: normalize(getField(r, "VRID")), location: getField(r, "LOCATION") });
            }
        });

        const researchQueueRecords = []; 
        const autoAssignedGhosts = [];

        // GHOST PROCESSING (Logic: Hub -> Memory -> Auto)
        ymsData.forEach(r => {
            const isa = extractYmsIsa(r);
            if (isa && !dockdashIsaSet.has(isa)) {
                const ymsInfo = ymsLookup[isa];
                let vrid = 'UNKNOWN';
                if (ymsInfo.fullLoadId) {
                    const match = ymsInfo.fullLoadId.match(/VRID\W*([A-Z0-9]+)/i);
                    if (match) vrid = normalize(match[1]);
                }

                let hubMatch = null;
                let finalCategory = null;
                
                // --- CATEGORIZATION LOGIC ---
                // 1. Is it a Parcel? (Carrier Check - Soft Match)
                const isParcel = isParcelCarrier(ymsInfo.carrier);
                
                // 2. Is it a Live? (Phone Check - Regex for numbers)
                const hasPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(ymsInfo.notes);

                // --- CHECK HUB BUCKETS ---
                if (hubData.vendorDock[isa]) {
                    hubMatch = hubData.vendorDock[isa];
                    if (isParcel) finalCategory = 'parcelsDock';
                    else if (hasPhone) finalCategory = 'livesHanded';
                    else finalCategory = 'volumeDoors'; 
                } 
                else if (hubData.vendorYard[isa]) {
                    hubMatch = hubData.vendorYard[isa];
                    if (isParcel) finalCategory = 'parcelsYard';
                    else {
                        // Check Details for FL vs PL
                        if (hubMatch.isPalletized) finalCategory = 'dropPallets';
                        else finalCategory = 'dropFloor';
                    }
                }
                else if (hubData.transshipDock[vrid]) {
                    hubMatch = hubData.transshipDock[vrid];
                    finalCategory = 'volumeDoors'; 
                }
                else if (hubData.transshipYard[isa] || hubData.transshipYard[vrid]) {
                    hubMatch = hubData.transshipYard[isa] || hubData.transshipYard[vrid];
                    finalCategory = 'transshipYard';
                }

                // --- MEMORY CHECK ---
                let memory = null;
                if (!hubMatch && typeof recallTrailer === 'function') {
                    memory = recallTrailer(isa, vrid);
                }

                if (hubMatch) {
                    autoAssignedGhosts.push({
                        isa, vrid: hubMatch.vrid || vrid,
                        location: ymsInfo.location, dwell: ymsInfo.dwell,
                        category: finalCategory, units: hubMatch.units,
                        carrier: ymsInfo.carrier, loadType: ymsInfo.loadType,
                        isMemory: true, notes: `HUB: ${ymsInfo.notes}`
                    });
                } else if (memory) {
                    autoAssignedGhosts.push({
                        isa, vrid, location: ymsInfo.location, dwell: ymsInfo.dwell,
                        category: memory.category, units: memory.units,
                        carrier: ymsInfo.carrier, loadType: ymsInfo.loadType,
                        isMemory: true, notes: `MEM: ${ymsInfo.notes}`
                    });
                } else {
                    const inferred = inferYmsOnlyCategory(ymsInfo);
                    if (inferred) {
                        if (inferred.category) {
                            autoAssignedGhosts.push({
                                isa, vrid,
                                location: ymsInfo.location, dwell: ymsInfo.dwell,
                                category: inferred.category,
                                units: 0,
                                carrier: ymsInfo.carrier,
                                loadType: ymsInfo.loadType,
                                isMemory: false,
                                confidence: inferred.confidence,
                                notes: `${inferred.reason}: ${ymsInfo.notes}`
                            });
                        }
                        return;
                    }

                    // Send to Research Queue
                    researchQueueRecords.push({ 
                        isa, vrid, location: ymsInfo.location, dwell: ymsInfo.dwell, 
                        notes: ymsInfo.notes, owner: ymsInfo.owner,
                        suggestedCategory: 'dropPallets', confidence: 'LOW'
                    });
                }
            }
        });

        lastProcessedStats = calculateMetrics(finalMetricsData, excludedRecords);
        const oldestSpd = findOldestSpdRecord(dockdashData, ymsLookup);
        lastProcessedStats.oldestSpd = oldestSpd ? {
            isa: oldestSpd.isa,
            date: formatSpdDate(oldestSpd.spdDate)
        } : null;

        const oldestTrailer = findOldestTrailerInYard(dockdashData, ymsLookup);
        lastProcessedStats.oldestTrailer = oldestTrailer ? {
            isa: oldestTrailer.isa,
            dwellHours: oldestTrailer.dwellHours
        } : null;
        
        autoAssignedGhosts.forEach(ghost => {
            if (
                Array.isArray(lastProcessedStats[ghost.category]) &&
                categoryAllowsLocation(ghost.category, ghost.location)
            ) {
                lastProcessedStats[ghost.category].push(ghost);
                if (
                    ghost.category === 'livesHanded' &&
                    ghost.loadType === "LIVE" &&
                    isLiveDropCarrier(ghost.carrier)
                ) {
                    lastProcessedStats.liveDrops.push(ghost);
                }
            }
            if (isDoorLocation(ghost.location)) lastProcessedStats.volumeDoors += (ghost.units || 0);
            else if (isYardLocation(ghost.location)) lastProcessedStats.volumeYard += (ghost.units || 0);
        });

        lastProcessedStats.researchQueueRecords = researchQueueRecords;
        lastProcessedStats.researchQueue = researchQueueRecords.length;

        updateMetricsUI(lastProcessedStats);
        
        const exportBtn = document.getElementById('export-btn');
        if(exportBtn) exportBtn.disabled = false;

        updateActionPanel({ 
            reconciled: true, 
            excluded: excludedRecords.length, 
            azngOver72: lastProcessedStats.azngOver72.length, 
            researchQueue: lastProcessedStats.researchQueue,
            message: `Resolved ${autoAssignedGhosts.length} items via Hub/Memory/notes. ${researchQueueRecords.length} need review.`
        });
        
        copyStatsToClipboard(lastProcessedStats);

    } catch (error) {
        console.error("Reconcile Error:", error);
        alert(`CRASH: ${error.message}\nCheck console.`);
        updateActionPanel({ reconciled: false, message: 'Process Failed' });
    }
}

// =========================================================================
// 8. CSV Export Logic (Improved & Verified)
// =========================================================================
function exportVerifiedCsv() {
    console.log("Export process started...");

    if (!dockdashData || dockdashData.length === 0) {
        alert("Error: No Dock Dash data loaded to export.");
        return;
    }
    if (!ymsData || ymsData.length === 0) {
        alert("Error: No YMS data loaded for verification.");
        return;
    }

    const ymsMap = {};
    ymsData.forEach(row => {
        const isa = extractYmsIsa(row);
        if (isa) {
            ymsMap[isa] = { 
                loc: getField(row, "LOCATION") || "UNKNOWN", 
                notes: getField(row, "NOTES") || "" 
            };
        }
    });

    const validRows = [];
    const originalHeaders = Object.keys(dockdashData[0]);
    
    const exportHeaders = [...originalHeaders];
    if (!exportHeaders.includes("NOTES")) exportHeaders.push("NOTES");

    dockdashData.forEach(ddRow => {
        const isa = normalize(getField(ddRow, "ISA"));
        
        if (ymsMap[isa]) {
            const correctedRow = { ...ddRow };
            const locKey = Object.keys(correctedRow).find(k => k.toUpperCase().includes("LOCATION"));
            if (locKey) correctedRow[locKey] = ymsMap[isa].loc;
            correctedRow["NOTES"] = ymsMap[isa].notes;
            validRows.push(correctedRow);
        }
    });

    console.log(`Verification complete. Matches found: ${validRows.length}`);

    if (validRows.length === 0) {
        alert("No matching verified records found.\n\nThis usually means the ISAs in your YMS file don't match the ISAs in your Dock Dash file.");
        return;
    }

    try {
        const csvContent = [
            exportHeaders.join(","), 
            ...validRows.map(row => 
                exportHeaders.map(fieldName => {
                    let val = row[fieldName] || "";
                    return `"${String(val).replace(/"/g, '""')}"`;
                }).join(",")
            )
        ].join("\n");

        if (!window.api.saveCsv) {
            throw new Error('Save API is not available.');
        }

        window.api.saveCsv(csvContent).then(success => {
            if (success) {
                alert(`Verified export saved.\n(${validRows.length} trailers exported)`);
            }
        });
    } catch (err) {
        console.error("Export Error:", err);
        alert("Failed to generate CSV file: " + err.message);
    }
}

// =========================================================================
// 9. Initialization & Events
// =========================================================================
function setupCosmicBackground() {
    const starfield = document.getElementById('starfield');
    if (!starfield) return;
    for (let i = 0; i < 200; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.animationDuration = `${2 + Math.random() * 3}s`;
        starfield.appendChild(star);
    }
}

let generatedBarcodes = [];
let currentBarcodeIndex = 0;
let scanBuffer = '';
let scanBufferTimer = null;

function getBarcodeOptions() {
    return {
        format: 'CODE128',
        width: parseInt(document.getElementById('bar-width')?.value, 10) || 2,
        height: parseInt(document.getElementById('bar-height')?.value, 10) || 50,
        fontSize: parseInt(document.getElementById('bar-font')?.value, 10) || 14,
        displayValue: true,
        margin: 10,
    };
}

function renderBarcode(svg, value, overrides = {}) {
    if (typeof JsBarcode !== 'function') {
        throw new Error('Barcode library is not loaded.');
    }

    JsBarcode(svg, value, { ...getBarcodeOptions(), ...overrides });
}

function setAdminButtonsEnabled(enabled) {
    const startBtn = document.getElementById('btn-start-scan');
    const printBtn = document.getElementById('btn-print-only');

    [startBtn, printBtn].forEach(btn => {
        if (!btn) return;
        btn.disabled = !enabled;
        btn.style.background = enabled ? '#2196F3' : '#555';
        btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
}

function generateAdminBarcodes() {
    const input = document.getElementById('admin-input');
    const printableArea = document.getElementById('printable-area');
    if (!input || !printableArea) return;

    generatedBarcodes = input.value
        .split(/\r\n|\n|\r/)
        .map(value => value.trim())
        .filter(Boolean);

    printableArea.innerHTML = '';

    if (generatedBarcodes.length === 0) {
        alert('Paste at least one pallet ID first.');
        setAdminButtonsEnabled(false);
        return;
    }

    try {
        generatedBarcodes.forEach(value => {
            const wrapper = document.createElement('div');
            wrapper.className = 'barcode-wrapper';

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            wrapper.appendChild(svg);
            printableArea.appendChild(wrapper);
            renderBarcode(svg, value);
        });

        currentBarcodeIndex = 0;
        setAdminButtonsEnabled(true);
    } catch (error) {
        console.error('Barcode generation failed:', error);
        alert(error.message);
        setAdminButtonsEnabled(false);
    }
}

function updateScanProgress() {
    const progress = document.getElementById('scan-progress');
    if (progress) {
        progress.textContent = `${currentBarcodeIndex + 1} / ${generatedBarcodes.length}`;
    }
}

function renderCurrentScanBarcode() {
    if (!generatedBarcodes.length) return;

    const svg = document.getElementById('giant-barcode');
    if (!svg) return;

    svg.innerHTML = '';
    renderBarcode(svg, generatedBarcodes[currentBarcodeIndex], {
        width: 3,
        height: 160,
        fontSize: 28,
        margin: 20,
    });
    updateScanProgress();
}

function showScanMode() {
    if (!generatedBarcodes.length) {
        alert('Generate barcodes first.');
        return;
    }

    const overlay = document.getElementById('scan-overlay');
    if (!overlay) return;

    overlay.style.display = 'flex';
    currentBarcodeIndex = 0;
    scanBuffer = '';
    renderCurrentScanBarcode();
}

function closeScanMode() {
    const overlay = document.getElementById('scan-overlay');
    if (overlay) overlay.style.display = 'none';
    scanBuffer = '';
}

function moveScanSlide(delta) {
    if (!generatedBarcodes.length) return;

    currentBarcodeIndex = Math.max(0, Math.min(generatedBarcodes.length - 1, currentBarcodeIndex + delta));
    renderCurrentScanBarcode();
}

function handleScanKeydown(event) {
    const overlay = document.getElementById('scan-overlay');
    const isScanning = overlay && overlay.style.display !== 'none';
    if (!isScanning) return;

    if (event.key === 'Escape') {
        closeScanMode();
        return;
    }
    if (event.key === 'ArrowLeft') {
        moveScanSlide(-1);
        return;
    }
    if (event.key === 'ArrowRight') {
        moveScanSlide(1);
        return;
    }
    if (event.key === 'Enter') {
        const expected = generatedBarcodes[currentBarcodeIndex];
        if (!scanBuffer || scanBuffer === expected) {
            moveScanSlide(1);
        }
        scanBuffer = '';
        return;
    }
    if (event.key.length === 1) {
        scanBuffer += event.key;
        clearTimeout(scanBufferTimer);
        scanBufferTimer = setTimeout(() => { scanBuffer = ''; }, 500);
    }
}

function updateDecoderOutput(value) {
    const output = document.getElementById('decoded-output');
    if (!output) return;

    if (!value) {
        output.textContent = 'Waiting for scan...';
        return;
    }

    const codes = Array.from(value).map(char => `${char} [${char.charCodeAt(0)}]`).join(' ');
    output.textContent = `Length: ${value.length}\nRaw: ${value}\nChars: ${codes}`;
}

function setupAdminTools() {
    const adminTools = document.getElementById('admin-tools');
    const generateBtn = document.getElementById('btn-generate-only');
    const startScanBtn = document.getElementById('btn-start-scan');
    const printBtn = document.getElementById('btn-print-only');
    const closeScanBtn = document.getElementById('btn-close-scan');
    const prevBtn = document.getElementById('btn-prev-slide');
    const nextBtn = document.getElementById('btn-next-slide');
    const decoder = document.getElementById('admin-decoder');

    if (generateBtn) generateBtn.addEventListener('click', generateAdminBarcodes);
    if (startScanBtn) startScanBtn.addEventListener('click', showScanMode);
    if (printBtn) printBtn.addEventListener('click', () => window.print());
    if (closeScanBtn) closeScanBtn.addEventListener('click', closeScanMode);
    if (prevBtn) prevBtn.addEventListener('click', () => moveScanSlide(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => moveScanSlide(1));
    if (decoder) {
        decoder.addEventListener('input', (event) => updateDecoderOutput(event.target.value));
        decoder.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                updateDecoderOutput(event.target.value);
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key.toUpperCase() === 'A') {
            event.preventDefault();
            adminTools?.classList.toggle('visible');
            return;
        }

        handleScanKeydown(event);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    console.log("App started: DOM content loaded");

    setupCosmicBackground();
    setupAdminTools();
    
    if (window.api && window.api.getAppVersion) {
        window.api.getAppVersion().then(v => {
            const el = document.getElementById('eos-version');
            if (el) el.textContent = `Version: ${v}`;
        });
    }

    // 2. Button Listeners 
    const ymsBtn = document.getElementById('browse-yms-btn');
    if (ymsBtn) {
        ymsBtn.addEventListener('click', () => handleFileSelection('yms'));
        console.log("YMS button connected");
    }

    const ddBtn = document.getElementById('browse-dockdash-btn');
    if (ddBtn) {
        ddBtn.addEventListener('click', () => handleFileSelection('dockdash'));
        console.log("Dock Dash button connected");
    }
    
    // --- UPDATED: HUB BUTTON LISTENER ---
    const hubBtn = document.getElementById('open-hub-btn');
    if (hubBtn) {
        hubBtn.addEventListener('click', () => {
            document.getElementById('research-hub-modal').style.display = 'block';
            window.switchHubStep(1);
        });
        console.log("Hub button connected");
    }
    
    const recBtn = document.getElementById('reconcile-btn');
    if (recBtn) {
        recBtn.addEventListener('click', reconcileAndDisplay);
        console.log("Reconcile button connected");
    }

    const expBtn = document.getElementById('export-btn');
    if (expBtn) {
        expBtn.addEventListener('click', exportVerifiedCsv);
        console.log("Export button connected");
    }

    // 3. Tile Listeners
    const tiles = document.querySelectorAll('.metric-tile');
    console.log(`Found ${tiles.length} metric tiles.`);
    
    tiles.forEach(tile => {
        tile.addEventListener('click', (e) => {
            console.log("Tile clicked:", e.currentTarget.id);
            showDetailModal(e.currentTarget.id);
        });
    });
    
    const modal = document.getElementById('detail-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => { 
            if (e.target === modal) modal.style.display = 'none';
            // Also close Hub Modal if clicked outside
            if (e.target === document.getElementById('research-hub-modal')) {
                document.getElementById('research-hub-modal').style.display = 'none';
            }
        });
    }
    
    // 4. Initial Status
    updateCardStatus('yms', 'Select YMS File', null); 
    updateCardStatus('dockdash', 'Select Dock Dash File', null); 
});




