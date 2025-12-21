// =========================================================================
// 1. Global State
// =========================================================================
let ymsFilePath = null;
let dockdashFilePath = null;
let ymsData = []; 
let dockdashData = []; 
let lastProcessedStats = {}; 

// Helper to normalize strings for comparison (Handles Scientific Notation)
function normalize(val) { 
    let str = String(val || "").trim().toUpperCase();
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

// =========================================================================
// 2. Clipboard Logic (Silent Copy)
// =========================================================================
function copyStatsToClipboard(stats) {
    if (!stats || !stats.dropPallets) return;

    const totalParcels = stats.parcelsDock.length + stats.parcelsYard.length;

    const clipboardString = [
        stats.dropPallets.length,      // Drop Pallets
        stats.dropFloor.length,        // Drop Floor
        stats.parcelsDock.length,      // Parcels on Dock
        stats.parcelsYard.length,      // Parcels in Yard
        totalParcels,                  // Total Parcels
        stats.transshipYard.length,    // Transship in Yard
        stats.azngOver72.length,       // AZNG > 72h
        "",                            // (space)
        stats.livesHanded.length,      // Lives Handed Over
        "",                            // (space)
        "",                            // (space)
        Math.round(stats.volumeDoors), // Volume on Doors
        Math.round(stats.volumeYard)   // Volume in Yard
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
        message.innerHTML = isCritical ? 
            `⚠️ **CRITICAL:** ${status.researchQueue} YMS record(s) need research!` : 
            `✅ **SUCCESS:** All critical metrics clear.`;
    } else {
        panel.classList.add('status-neutral');
        icon.className = 'fas fa-info-circle';
        message.innerHTML = status.message || "Ready.";
    }
}

// =========================================================================
// 4. Manual Research Assignment Logic
// =========================================================================

window.moveResearchItem = function(index) {
    const record = lastProcessedStats.researchQueueRecords[index];
    
    const select = document.getElementById(`assign-select-${index}`);
    const unitsInput = document.getElementById(`assign-units-${index}`);
    
    const targetCategory = select.value;
    // We parse the string value to a float. If it's empty, it becomes 0.
    const manualUnits = parseFloat(unitsInput.value.replace(/,/g, '')) || 0;

    if (!targetCategory) {
        alert("Please select a category.");
        return;
    }

    const recordInfo = {
        isa: record.isa,
        vrid: record.vrid,
        location: record.location,
        dwell: record.dwell,
        pallets: 'MANUAL'
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
            researchQueue: 0 
        });
    }
};

// =========================================================================
// 5. Modal Display
// =========================================================================

function showDetailModal(metricId) {
    let records = lastProcessedStats[metricId];
    let modalTitle = metricId.toUpperCase().replace(/([A-Z])/g, ' $1');
    const isResearchQueue = (metricId === 'researchQueue');
    
    if (isResearchQueue) records = lastProcessedStats.researchQueueRecords;
    if (metricId === 'excluded') records = lastProcessedStats.excluded;

    if (!Array.isArray(records) || records.length === 0) {
        alert("No records found.");
        return;
    }

    const modal = document.getElementById('detail-modal'); 
    const tbody = document.getElementById('detail-table-body');
    const thead = modal.querySelector('thead tr');
    const title = document.getElementById('modal-title');
    
    title.textContent = `${modalTitle} (${records.length})`;
    thead.innerHTML = ''; 
    
    // --- Dynamic Headers ---
    let headers = isResearchQueue ? 
        ['ISA', 'VRID', 'LOC', 'NOTES', 'CATEGORY', 'UNITS (TYPE HERE)', 'ACTION'] : 
        (metricId === 'excluded' ? ['ISA', 'VRID', 'LOCATION'] : ['ISA', 'VRID', 'LOCATION', 'DWELL', 'PALLETS']);

    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        thead.appendChild(th);
    });
    
    tbody.innerHTML = ''; 
    records.forEach((record, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = record.isa || 'N/A';
        row.insertCell().textContent = record.vrid || 'N/A';
        row.insertCell().textContent = record.location || 'N/A';
        
        if (isResearchQueue) {
            // Notes Column
            const notesCell = row.insertCell();
            notesCell.textContent = record.notes || ''; 
            notesCell.style.maxWidth = "200px";
            notesCell.style.overflow = "hidden";
            notesCell.style.textOverflow = "ellipsis";
            notesCell.style.whiteSpace = "nowrap";
            notesCell.title = record.notes || ''; 

            // Category Dropdown
            const cellAssign = row.insertCell();
            cellAssign.innerHTML = `
                <select id="assign-select-${index}" style="width:100%; padding:6px; border-radius:4px;">
                    <option value="" disabled selected>Select...</option>
                    <optgroup label="Volume Only">
                        <option value="volOnlyDoors">Volume on Doors</option>
                        <option value="volOnlyYard">Volume in Yard</option>
                    </optgroup>
                    <optgroup label="Assign to Tile + Volume">
                        <option value="dropPallets">Drop Pallets</option>
                        <option value="dropFloor">Drop Floor</option>
                        <option value="transshipYard">Transship Yard</option>
                        <option value="parcelsDock">Parcels on Dock</option>
                        <option value="parcelsYard">Parcels in Yard</option>
                        <option value="livesHanded">Lives Handed Over</option>
                    </optgroup>
                </select>`;
            
            // Units Input - CHANGED TO TEXT TYPE TO REMOVE BUTTONS
            const cellUnits = row.insertCell();
            cellUnits.innerHTML = `<input type="text" inputmode="numeric" id="assign-units-${index}" placeholder="Type units..." style="width:110px; padding:6px; border:1px solid #ccc; border-radius:4px;">`;
            
            // Move Button
            const cellAction = row.insertCell();
            cellAction.innerHTML = `<button onclick="window.moveResearchItem(${index})" style="background:#2ecc71; color:white; border:none; padding:6px 15px; cursor:pointer; border-radius:4px; font-weight:bold;">MOVE</button>`;
        } else if (metricId !== 'excluded') {
            row.insertCell().textContent = record.dwell || 'N/A';
            row.insertCell().textContent = record.pallets || '0';
        }
    });
    modal.style.display = 'block';
}

// =========================================================================
// 6. Core Processing & File Handlers
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

    const headers = rows[0].map(h => h.trim().toUpperCase());
    const missing = requiredHeaders.filter(h => !headers.some(header => header.includes(h)));
    if (missing.length > 0) {
        alert(`❌ Missing required headers: ${missing.join(", ")}`);
        return [];
    }

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

async function reconcileAndDisplay() {
    if (!ymsData.length || !dockdashData.length) return;
    updateActionPanel({ reconciled: false, message: 'Processing...' });

    const ymsIsaSet = new Set();
    ymsData.forEach(r => { const isa = extractYmsIsa(r); if (isa) ymsIsaSet.add(isa); });

    const dockdashIsaSet = new Set();
    const finalMetricsData = [];
    const excludedRecords = [];

    dockdashData.forEach(r => {
        let isa = normalize(getField(r, "ISA"));
        if (!isa || isa.includes("E+") || isa.length < 5) return; 
        dockdashIsaSet.add(isa);
        if (ymsIsaSet.has(isa)) finalMetricsData.push(r);
        else excludedRecords.push({ isa, vrid: normalize(getField(r, "VRID")), location: getField(r, "LOCATION") });
    });

    const researchQueueRecords = [];
    ymsData.forEach(r => {
        const isa = extractYmsIsa(r);
        if (isa && !dockdashIsaSet.has(isa)) {
            const fullLoadId = getField(r, "LOAD IDENTIFIER(S)");
            let vrid = 'N/A';
            if (fullLoadId) {
                const match = fullLoadId.match(/VRID\W*([A-Z0-9]+)/i);
                if (match) vrid = normalize(match[1]);
            }
            // Capture NOTES
            const notes = getField(r, "NOTES") || ''; 

            researchQueueRecords.push({ 
                isa, 
                vrid, 
                location: getField(r, "LOCATION"), 
                dwell: getField(r, "YARD DWELL"),
                notes: notes 
            });
        }
    });

    lastProcessedStats = calculateMetrics(finalMetricsData, excludedRecords);
    lastProcessedStats.researchQueueRecords = researchQueueRecords;
    lastProcessedStats.researchQueue = researchQueueRecords.length;

    updateMetricsUI(lastProcessedStats);
    updateActionPanel({ reconciled: true, excluded: excludedRecords.length, azngOver72: lastProcessedStats.azngOver72.length, researchQueue: lastProcessedStats.researchQueue });
    copyStatsToClipboard(lastProcessedStats);
}

function calculateMetrics(data, excluded) {
    let stats = {
        dropPallets: [], dropFloor: [], parcelsDock: [], parcelsYard: [],
        transshipYard: [], azngOver72: [], livesHanded: [], researchQueue: 0,
        volumeDoors: 0, volumeYard: 0, excluded: excluded
    };
    
    data.forEach(record => {
        const type = normalize(getField(record, "CARRIER LOAD TYPE"));
        const appt = normalize(getField(record, "APPOINTMENT TYPE"));
        const loc = normalize(getField(record, "LOCATION"));
        const carrier = normalize(getField(record, "CARRIER"));
        const units = parseFloat(getField(record, "UNITS")) || 0;
        const dwell = parseHours(getField(record, "YARD DWELL"));
        const info = { isa: getField(record, "ISA"), vrid: getField(record, "VRID"), location: loc, dwell: getField(record, "YARD DWELL"), pallets: getField(record, "PALLETS") };
        
        if (loc.startsWith("DD")) stats.volumeDoors += units;
        else stats.volumeYard += units;

        if (type === "DROP" && appt === "CARP" && loc.startsWith("PS")) {
            if (parseFloat(getField(record, "PALLETS")) > 0) stats.dropPallets.push(info);
            else stats.dropFloor.push(info);
        }
        if (appt === "SMALL_PARCEL") {
            if (loc.startsWith("DD")) stats.parcelsDock.push(info);
            if (loc.startsWith("PS")) stats.parcelsYard.push(info);
        }
        if (appt === "TRANSSHIP" && loc.startsWith("PS")) stats.transshipYard.push(info);
        if (carrier.startsWith("A") && dwell >= 72) stats.azngOver72.push(info);
        if (type === "LIVE" && loc.startsWith("DD")) stats.livesHanded.push(info);
    });
    return stats;
}

function extractYmsIsa(record) {
    const fullLoadId = getField(record, "LOAD IDENTIFIER(S)");
    if (fullLoadId) {
        const match = fullLoadId.match(/ISA\W*(\d+)/i);
        if (match) return normalize(match[1]);
    }
    return null;
}

// =========================================================================
// 7. Background & Initialization
// =========================================================================

function setupCosmicBackground() {
    const starfield = document.getElementById('starfield');
    if (!starfield) return;

    // 1. Create Static Stars
    for (let i = 0; i < 200; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.animationDuration = `${2 + Math.random() * 3}s`;
        starfield.appendChild(star);
    }

    // 2. Create Shooting Stars
    function createShootingStar() {
        const shootingStar = document.createElement('div');
        shootingStar.className = 'shooting-star';
        shootingStar.style.top = `${Math.random() * 60}%`; 
        shootingStar.style.left = `${Math.random() * 80}%`;
        starfield.appendChild(shootingStar);
        setTimeout(() => { shootingStar.remove(); }, 3000); 
    }
    setInterval(createShootingStar, 3000); 
}

function updateCardStatus(type, text, success) {
    const card = document.getElementById(`${type}-card`);
    const status = document.getElementById(`${type}-status`);
    const icon = card.querySelector('.main-icon');

    card.classList.remove('success', 'error');
    if (success) {
        card.classList.add('success');
        icon.className = 'fas fa-check-circle main-icon';
    } else if (success === false) {
        card.classList.add('error');
        icon.className = 'fas fa-times-circle main-icon';
    } else {
        icon.className = type === 'yms' ? 'fas fa-database main-icon' : 'fas fa-file-csv main-icon';
    }
    status.innerHTML = text;
}

async function handleFileSelection(type) {
    const filePath = await window.api.openFile();
    if (!filePath) return;
    
    updateCardStatus(type, "Reading...", null);
    const rawData = await window.api.readCsvFile(filePath);
    const parsed = parseCSV(rawData, type === 'yms' ? ["LOAD IDENTIFIER(S)"] : ["ISA", "VRID"]);
    
    if (type === 'yms') { ymsData = parsed; ymsFilePath = filePath; }
    else { dockdashData = parsed; dockdashFilePath = filePath; }
    
    updateCardStatus(type, `Loaded: ${filePath.split(/[/\\]/).pop()} (${parsed.length})`, true);
    
    const reconcileBtn = document.getElementById('reconcile-btn');
    const dockdashBtn = document.getElementById('browse-dockdash-btn');
    if (ymsFilePath) dockdashBtn.disabled = false;
    if (ymsFilePath && dockdashFilePath) reconcileBtn.disabled = false;
}

window.addEventListener('DOMContentLoaded', () => {
    setupCosmicBackground();
    window.api.getAppVersion().then(v => {
        const el = document.getElementById('eos-version');
        if (el) el.textContent = `Version: ${v}`;
    });

    document.getElementById('browse-yms-btn').addEventListener('click', () => handleFileSelection('yms'));
    document.getElementById('browse-dockdash-btn').addEventListener('click', () => handleFileSelection('dockdash'));
    document.getElementById('reconcile-btn').addEventListener('click', reconcileAndDisplay);
    
    document.querySelectorAll('.metric-tile').forEach(tile => {
        tile.addEventListener('click', (e) => showDetailModal(e.currentTarget.id));
    });
    
    const modal = document.getElementById('detail-modal');
    document.getElementById('close-modal-btn').addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    
    updateCardStatus('yms', 'Select YMS File', null); 
    updateCardStatus('dockdash', 'Select Dock Dash File', null); 
});