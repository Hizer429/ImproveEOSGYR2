// Global state variables
let ymsFilePath = null;
let dockdashFilePath = null;
let ymsData = []; // Stores the parsed data from the YMS file
let dockdashData = []; // Stores the parsed data from the Dock Dash file
let lastProcessedStats = {}; // Stores all metric data for modal display

// =========================================================================
// 1. Core State Management & File Handling
// =========================================================================

/**
 * Normalizes a string value.
 */
function normalize(val) { return String(val || "").trim().toUpperCase(); }

/**
 * Parses a string (like "72 hrs") into a numeric hour value.
 */
function parseHours(str) { return parseFloat(String(str || "").toLowerCase().replace("hrs", "").trim()) || 0; }

/**
 * Updates the status message and visual state of the upload cards.
 */
function updateCardStatus(type, statusText, success) {
    const card = document.getElementById(`${type}-card`);
    const status = document.getElementById(`${type}-status`);
    const icon = card.querySelector('.main-icon');

    // Reset classes
    card.classList.remove('success', 'error');

    if (success) {
        card.classList.add('success');
        icon.classList.remove('fa-database', 'fa-file-csv', 'fa-times-circle');
        icon.classList.add('fa-check-circle');
    } else if (success === false) {
        card.classList.add('error');
        icon.classList.remove('fa-database', 'fa-file-csv', 'fa-check-circle');
        icon.classList.add('fa-times-circle');
    } else {
        // Neutral state
        icon.classList.remove('fa-check-circle', 'fa-times-circle');
        icon.classList.add(type === 'yms' ? 'fa-database' : 'fa-file-csv');
    }

    status.innerHTML = statusText;

    // Enable Dock Dash button only after YMS is successfully loaded
    document.getElementById('browse-dockdash-btn').disabled = !ymsFilePath;

    // Enable Reconcile button only if both files are loaded
    document.getElementById('reconcile-btn').disabled = !(ymsFilePath && dockdashFilePath);

    updateActionPanel({ 
        reconciled: false, 
        message: (ymsFilePath && dockdashFilePath) ? 'Ready to reconcile.' : 'Awaiting file selections to begin reconciliation...' 
    });
}

/**
 * Handles the file selection process for YMS or Dock Dash.
 */
async function handleFileSelection(type) {
    try {
        updateCardStatus(type, 'Opening file dialog...', null);
        
        const filePath = await window.api.openFile();

        if (!filePath) {
            updateCardStatus(type, `Selection canceled.`, false);
            return;
        }
        
        if (!filePath.toLowerCase().endsWith('.csv')) {
             updateCardStatus(type, `⚠️ The selected file is not a CSV.`, false);
             return;
        }

        updateCardStatus(type, `Reading ${filePath.split('\\').pop()}...`, null);

        const rawData = await window.api.readCsvFile(filePath);

        const parsedData = parseCSV(rawData);

        if (parsedData.length === 0) {
            throw new Error('File is empty or failed to parse header row.');
        }

        // Store data and path
        if (type === 'yms') {
            ymsFilePath = filePath;
            ymsData = parsedData;
        } else {
            dockdashFilePath = filePath;
            dockdashData = parsedData;
        }
        
        const fileName = filePath.split('\\').pop();

        updateCardStatus(type, `Loaded **${fileName}** (${parsedData.length} records)`, true);

    } catch (error) {
        console.error(`Error processing ${type} file:`, error);
        updateCardStatus(type, `Failed to load file: ${error.message}`, false);
        
        if (type === 'yms') {
            ymsFilePath = null; ymsData = [];
        } else {
            dockdashFilePath = null; dockdashData = [];
        }
    }
}

// =========================================================================
// 2. CSV Parsing and Reconciliation Logic
// =========================================================================

/**
 * Parses the raw CSV text into an array of objects.
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const rawHeaders = lines.shift().split(',');
    // Headers are cleaned and uppercased for consistent lookup
    const headers = rawHeaders.map(h => h.replace(/['"]/g, '').trim().toUpperCase());
    
    // Check for unique headers to avoid mapping errors
    if (new Set(headers).size !== headers.length) {
        alert("❌ Error: CSV headers are not unique.");
        return [];
    }

    const records = [];

    lines.forEach((line) => {
        // Simple split, assuming no complex quoting or embedded commas in fields
        const values = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (values.length !== headers.length) return; // Skip malformed rows
        
        const record = {};
        headers.forEach((header, index) => {
            record[header] = values[index];
        });
        records.push(record);
    });
    return records;
}

/**
 * Primary reconciliation function. Compares YMS and Dock Dash data.
 */
function reconcileAndDisplay() {
    if (!ymsData.length || !dockdashData.length) {
        updateActionPanel({ reconciled: false, message: 'Please load both YMS and Dock Dash files first.' });
        return;
    }

    updateActionPanel({ reconciled: false, message: 'Processing reconciliation...' });
    
    try {
        // Map YMS (The Source of Truth) to a Set of keys for quick lookup
        // Assuming the unique identifier is VRID (Vehicle ID) and it exists in both
        const ymsVridSet = new Set(ymsData.map(item => normalize(item['VRID'])).filter(v => v));
        
        // 1. Filter Dock Dash data: identify trailers that are in the Dock Dash file
        // but are NOT present in the YMS file (i.e., the excluded/reconciled records).
        const excludedRecords = dockdashData.filter(item => {
            const vrid = normalize(item['VRID']);
            return vrid && !ymsVridSet.has(vrid);
        }).map(r => ({ isa: r.ISA || 'N/A', vrid: r.VRID || 'N/A' })); // Prepare excluded list for modal

        // 2. Calculate final metrics based on the YMS data (which is the source of truth).
        const stats = calculateMetrics(ymsData, excludedRecords);

        // 3. Update the UI
        updateMetricsUI(stats);
        updateActionPanel({ 
            reconciled: true, 
            message: `Reconciliation complete. ${excludedRecords.length} records excluded from Dock Dash.`,
            excluded: excludedRecords.length,
            azngOver72: stats.azngOver72.length // Use the length of the critical list
        });

        // Store stats globally for modal access
        lastProcessedStats = stats;
        
        // 4. Copy Summary to Clipboard
        const summary = [
            stats.dropPallets.length, stats.dropFloor.length, 
            stats.parcelsDock.length, stats.parcelsYard.length,
            stats.parcelsDock.length + stats.parcelsYard.length, 
            stats.transshipYard.length, stats.azngOver72.length,
            "", stats.livesHanded.length, "", "", 
            stats.volumeDoors.toLocaleString(), stats.volumeYard.toLocaleString()
        ].join('\n');
        
        window.api.writeToClipboard(summary);
        console.log("✅ Stats updated and copied to clipboard.");

    } catch (error) {
        console.error("Reconciliation failed:", error);
        updateActionPanel({ reconciled: false, message: `Reconciliation Error: ${error.message}` });
    }
}

/**
 * CALCULATES ALL METRICS using the original single-file logic, adapted to take data array.
 * @param {Array<Object>} data - The source data (YMS).
 * @param {Array<Object>} excluded - The list of excluded Dock Dash records.
 * @returns {Object} - An object containing all metric data arrays.
 */
function calculateMetrics(data, excluded) {
    let stats = {
        dropPallets: [], dropFloor: [], parcelsDock: [], parcelsYard: [],
        transshipYard: [], azngOver72: [], livesHanded: [], excluded: [],
        volumeDoors: 0, volumeYard: 0
    };
    
    // Attach the excluded list directly
    stats.excluded = excluded;

    // Ensure all required fields exist in the data before calculation
    const headers = data.length > 0 ? Object.keys(data[0]).map(h => normalize(h)) : [];
    const requiredHeaders = ["LOCATION", "CARRIER LOAD TYPE", "APPOINTMENT TYPE", "CARRIER", "YARD DWELL", "PALLETS", "UNITS"];
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
        throw new Error(`Missing required headers in YMS data: ${missing.join(", ")}`);
    }

    data.forEach((record) => {
        // Use normalized headers from the original file
        const getVal = (key) => normalize(record[key]);
        const getNum = (key) => parseFloat(record[key]) || 0;
        const getRecordInfo = () => ({ isa: record.ISA || 'N/A', vrid: record.VRID || 'N/A' });

        const type = getVal("CARRIER LOAD TYPE");
        const appt = getVal("APPOINTMENT TYPE");
        const loc = getVal("LOCATION");
        const carrier = getVal("CARRIER");
        const dwell = parseHours(record["YARD DWELL"]);
        const pallets = getNum("PALLETS");
        const units = parseInt(record["UNITS"]) || 0;

        // --- Operations (Drop/Floor) ---
        if (type === "DROP" && appt === "CARP" && loc.startsWith("PS")) {
            if (pallets > 0) stats.dropPallets.push(getRecordInfo());
            else stats.dropFloor.push(getRecordInfo());
        }

        // --- Parcels (Dock/Yard) ---
        if (appt === "SMALL_PARCEL") {
            if (loc.startsWith("DD")) stats.parcelsDock.push(getRecordInfo());
            if (loc.startsWith("PS")) stats.parcelsYard.push(getRecordInfo());
        }

        // --- Transship Yard ---
        if (appt === "TRANSSHIP" && loc.startsWith("PS")) stats.transshipYard.push(getRecordInfo());

        // --- Critical: AZNG > 72h ---
        // Assuming 'A' carrier is AZNG.
        if (carrier.startsWith("A") && dwell >= 72) stats.azngOver72.push(getRecordInfo());

        // --- Lives Handed (volume) ---
        if (type === "LIVE" && loc.startsWith("DD")) stats.livesHanded.push(getRecordInfo());

        // --- Volume (Units) ---
        if (loc.startsWith("DD")) stats.volumeDoors += units;
        if (loc.startsWith("PS")) stats.volumeYard += units;
    });

    return stats;
}

/**
 * Updates the metric tiles on the UI.
 * NOTE: This function handles both count and visual updates.
 */
function updateMetricsUI(stats) {
    const tileMap = {
        'dropPallets': stats.dropPallets.length,
        'dropFloor': stats.dropFloor.length,
        'parcelsDock': stats.parcelsDock.length,
        'parcelsYard': stats.parcelsYard.length,
        'totalParcels': stats.parcelsDock.length + stats.parcelsYard.length,
        'transshipYard': stats.transshipYard.length,
        'azngOver72': stats.azngOver72.length,
        'livesHanded': stats.livesHanded.length,
        'volumeDoors': stats.volumeDoors.toLocaleString(), // Units need formatting
        'volumeYard': stats.volumeYard.toLocaleString(), // Units need formatting
    };
    
    // Critical check logic
    const criticalChecks = {
        'azngOver72': stats.azngOver72.length > 0,
        // Assuming 'parcelsDock' should only be critical if the number is NOT 0
        'parcelsDock': stats.parcelsDock.length > 0 
    };

    Object.keys(tileMap).forEach(id => {
        const valueElement = document.querySelector(`#${id} .value`);
        const tileElement = document.getElementById(id);

        if (valueElement) valueElement.textContent = tileMap[id];
        
        // Handle critical state styling
        if (criticalChecks[id] !== undefined) {
             if (criticalChecks[id]) tileElement.classList.add('critical-active');
             else tileElement.classList.remove('critical-active');
        }
    });
}

/**
 * Updates the action panel at the bottom of the upload section.
 */
function updateActionPanel(status) {
    const panel = document.getElementById('action-panel');
    const icon = document.getElementById('action-icon');
    const message = document.getElementById('action-message');

    // Reset classes
    panel.classList.remove('status-neutral', 'status-critical', 'status-success');

    if (status.reconciled) {
        if (status.azngOver72 > 0) {
            panel.classList.add('status-critical');
            icon.className = 'fas fa-exclamation-triangle';
            message.textContent = `🚨 RECONCILED CRITICAL: ${status.excluded} excluded, but ${status.azngOver72} trailer(s) are still AZNG > 72h!`;
        } else {
            panel.classList.add('status-success');
            icon.className = 'fas fa-check-circle';
            message.textContent = `✅ RECONCILIATION SUCCESS: ${status.excluded} Dock Dash records reconciled. All critical metrics clear.`;
        }
    } else {
        panel.classList.add('status-neutral');
        icon.className = 'fas fa-info-circle';
        message.textContent = status.message;
    }
}

// =========================================================================
// 3. Modal Detail View Functions
// =========================================================================

/**
 * Builds and displays the modal with ISA/VRID details for the clicked metric.
 */
function showDetailModal(metricId) {
    const records = lastProcessedStats[metricId];
    if (!records || records.length === 0) {
        alert("No records found for this category.");
        return;
    }

    const modal = document.getElementById('detail-modal');
    const title = document.getElementById('modal-title');
    const tbody = document.getElementById('detail-table-body');
    
    title.textContent = `${metricId.toUpperCase().replace(/([A-Z])/, ' $1')} DETAILS (${records.length} Trailers)`;
    tbody.innerHTML = ''; // Clear previous data

    // Populate the table with ISA and VRID
    records.forEach(record => {
        const row = tbody.insertRow();
        row.insertCell().textContent = record.isa || 'N/A';
        row.insertCell().textContent = record.vrid || 'N/A';
    });

    modal.style.display = 'block';
}

// =========================================================================
// 4. Starfield & Initial Setup
// =========================================================================

function setupCosmicBackground() {
    const starfield = document.getElementById('starfield');
    if (!starfield) return;

    // Generate static stars
    for (let i = 0; i < 200; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 3 + 1; // Size variance
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.animationDuration = `${Math.random() * 3 + 2}s`;
        star.style.animationDelay = `${Math.random() * 5}s`;
        starfield.appendChild(star);
    }

    // Function to create and remove a single shooting star
    function spawnShootingStar() {
        const star = document.createElement("div");
        star.className = "shooting-star";
        // Start near the top-right corner
        star.style.top = `${Math.random() * 60}%`;
        star.style.left = `${Math.random() * 100}%`;
        const length = Math.random() * 150 + 100;
        star.style.width = `${length}px`;

        starfield.appendChild(star);
        
        // Remove the star after the animation time (which is set in CSS)
        setTimeout(() => star.remove(), 2500);
    }

    // Shooting stars every 4 seconds
    setInterval(spawnShootingStar, 4000);
}

window.addEventListener('DOMContentLoaded', () => {
    console.log("✨ Visuals loaded");
    
    // 1. Setup the Starfield Background
    setupCosmicBackground();
    
    // 2. Setup Version using secure API
    window.api.getAppVersion().then((version) => {
        document.getElementById('eos-version').textContent = `Version: ${version}`;
    });

    // 3. Setup Listeners
    document.getElementById('browse-yms-btn').addEventListener('click', () => handleFileSelection('yms'));
    document.getElementById('browse-dockdash-btn').addEventListener('click', () => handleFileSelection('dockdash'));
    document.getElementById('reconcile-btn').addEventListener('click', reconcileAndDisplay);

    // Setup Listeners for Modal Detail Tiles
    document.querySelectorAll('.metric-tile').forEach(tile => {
        tile.addEventListener('click', (e) => {
            const metricId = e.currentTarget.id;
            showDetailModal(metricId);
        });
    });

    // Setup Modal Close Listeners
    const modal = document.getElementById('detail-modal');
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});