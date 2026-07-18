// =========================================================================
// 1. Dependencies & Global State
// =========================================================================
let ymsFilePath = null;
let dockdashFilePath = null;
let ymsData = []; 
let dockdashData = []; 

// =========================================================================
// 0. Monitor-Aware UI Scaling
// =========================================================================
const BASE_DISPLAY_SIZE = { width: 1440, height: 900 };
const MEMORY_BYPASS_KEY = 'gyr2_memory_bypass_testing';
let currentDisplayMetrics = null;

function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function applyResponsiveScale(metrics = currentDisplayMetrics) {
    const root = document.documentElement;
    const displaySize = metrics?.workAreaSize || {
        width: window.innerWidth,
        height: window.innerHeight,
    };

    const displayScale = Math.min(
        displaySize.width / BASE_DISPLAY_SIZE.width,
        displaySize.height / BASE_DISPLAY_SIZE.height
    );
    const viewportScale = Math.min(window.innerWidth / 1280, window.innerHeight / 760);
    const appScale = clampNumber(Math.min(displayScale, viewportScale), 0.82, 1.16);
    const layoutWidth = clampNumber(Math.round(displaySize.width * 0.94), 1040, 1720);

    root.style.setProperty('--app-scale', appScale.toFixed(3));
    root.style.setProperty('--app-max-width', `${layoutWidth}px`);
    root.classList.toggle('compact-display', appScale < 0.92);
    root.classList.toggle('wide-display', appScale > 1.06);
}

function setupMonitorAwareScaling() {
    applyResponsiveScale();
    window.addEventListener('resize', () => applyResponsiveScale());

    if (!window.api?.getDisplayMetrics) return;

    window.api.getDisplayMetrics()
        .then(metrics => {
            currentDisplayMetrics = metrics;
            applyResponsiveScale(metrics);
        })
        .catch(() => applyResponsiveScale());

    if (window.api.onDisplayMetricsChanged) {
        window.api.onDisplayMetricsChanged(metrics => {
            currentDisplayMetrics = metrics;
            applyResponsiveScale(metrics);
        });
    }
}

function isMemoryBypassEnabled() {
    return localStorage.getItem(MEMORY_BYPASS_KEY) === 'true';
}

function setMemoryBypassEnabled(enabled) {
    localStorage.setItem(MEMORY_BYPASS_KEY, enabled ? 'true' : 'false');
}

// --- NEW: HUB DATA STORAGE ---
let hubData = {
    vendorDock: {},
    vendorYard: {},
    transshipDock: {},
    transshipYard: {}
};
let pendingOculusUploads = {
    vendor: null,
    transship: null
};
let gapFillerData = { byIsa: {}, byVrid: {} }; 
let lastProcessedStats = {}; 
let fcApiTrailerLookup = {};

const FC_API_ENDPOINT_KEY = 'gyr2_fc_ids_api_endpoint';
const FC_API_WAREHOUSE_KEY = 'gyr2_fc_ids_warehouse_id';
const FC_API_AUTH_SESSION_KEY = 'gyr2_fc_ids_auth_token';

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

function escapeHtmlAttr(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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

function isClampLoadNote(notes) {
    return normalize(notes).includes("CLAMP");
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

const DISRUPTION_NOTE_TERMS = [
    "REJECTED",
    "DAMAGED",
    "DAMAGE",
    "RED TAG",
    "RED TAGGED",
    "REDTAG",
    "BAD TRAILER",
    "BAD ORDER",
    "UNUSABLE",
    "DO NOT USE",
    "DONT USE",
    "OUT OF SERVICE",
    "OOS",
    "BROKEN",
    "NOT USABLE",
    "CAN'T USE",
    "CANNOT USE",
    "CAN NOT USE",
    "UNSAFE",
    "UNSAFE TO UNLOAD",
    "UNSAFE TO LOAD",
    "DO NOT LOAD",
    "DONT LOAD",
    "DO NOT UNLOAD",
    "DONT UNLOAD",
    "CANNOT UNLOAD",
    "CAN NOT UNLOAD",
    "CAN'T UNLOAD",
    "CANNOT LOAD",
    "CAN NOT LOAD",
    "CAN'T LOAD",
    "NEEDS REPAIR",
    "NEED REPAIR",
    "REPAIR NEEDED",
    "TRAILER REPAIR",
    "MECHANICAL ISSUE",
    "MECHANICAL",
    "FLAT TIRE",
    "TIRE ISSUE",
    "NO BRAKES",
    "BRAKE ISSUE",
    "AIR LEAK",
    "LEAKING",
    "HOLE IN",
    "DOOR BROKEN",
    "DOOR ISSUE"
];

const DISRUPTION_NOTE_PATTERNS = [
    /\bCASE\s*(#|:)?\s*\d{6,}\b/,
    /\bUNSAFE\b.*\b(LOAD|UNLOAD|USE|TRAILER)\b/,
    /\b(DO NOT|DONT|DON'T|CANNOT|CAN NOT|CAN'T)\b.*\b(LOAD|UNLOAD|USE)\b/,
    /\b(LOAD|UNLOAD|USE)\b.*\b(UNSAFE|REJECTED|DAMAGED|BROKEN)\b/,
    /\b(NEED|NEEDS|REQUIRES?)\b.*\b(REPAIR|FIX|MAINTENANCE)\b/,
    /\b(RED|ORANGE)\b.*\bTAG(GED)?\b/,
    /\bOUT\b.*\bSERVICE\b/
];

const PROBLEM_SOLVE_NOTE_PATTERNS = [
    /\bPROBLEM\s*SOLVE\b/,
    /\bPROBLEM\s*SOLV(E|ING)\b/,
    /\bPS\s*TRAILER\b/
];

function isParcelCategory(category) {
    return category === 'parcelsDock' || category === 'parcelsYard';
}

function isProblemSolveNote(normalizedNotes) {
    return PROBLEM_SOLVE_NOTE_PATTERNS.some(pattern => pattern.test(normalizedNotes));
}

function isDisruptionNote(notes, category = "") {
    const normalizedNotes = normalize(notes);
    const hasDisruptionSignal = DISRUPTION_NOTE_TERMS.some(term => normalizedNotes.includes(term)) ||
        DISRUPTION_NOTE_PATTERNS.some(pattern => pattern.test(normalizedNotes));

    if (hasDisruptionSignal) return true;

    return isProblemSolveNote(normalizedNotes) && !isParcelCategory(category);
}

function createDisruptionBuckets() {
    return {
        dropPallets: [],
        dropFloor: [],
        parcelsDock: [],
        parcelsYard: [],
        transshipYard: [],
        azngOver72: [],
        livesHanded: []
    };
}

function getDisruptionCount(stats, category) {
    return stats.disruptions?.[category]?.length || 0;
}

function formatCountWithDisruptions(count, disruptions) {
    return disruptions > 0 ? `${count} + ${disruptions} DISRUPTIONS` : count;
}

function formatMetricWithDisruptions(stats, category) {
    return formatCountWithDisruptions(stats[category].length, getDisruptionCount(stats, category));
}

function addCategorizedRecord(stats, category, record) {
    if (!Array.isArray(stats[category])) return;

    if (isDisruptionNote(record.notes, category)) {
        stats.disruptions[category].push(record);
    } else {
        stats[category].push(record);
    }
}

function formatLivesValue(stats) {
    const liveDropCount = stats.liveDrops ? stats.liveDrops.length : 0;
    const trueLiveCount = Math.max(stats.livesHanded.length - liveDropCount, 0);
    const liveValue = liveDropCount > 0 ?
        `${trueLiveCount} (${liveDropCount} live/drops)` :
        String(stats.livesHanded.length);

    return formatCountWithDisruptions(liveValue, getDisruptionCount(stats, 'livesHanded'));
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

function resolveOculusCategory(oculusRecord, ymsInfo) {
    const loc = normalize(ymsInfo.location);
    const sourceType = normalize(oculusRecord.sourceType);
    const isParcel = isParcelCarrier(ymsInfo.carrier);
    const isLive = normalize(ymsInfo.loadType) === "LIVE";

    if (sourceType === "TRANSSHIP") {
        if (isYardLocation(loc)) return 'transshipYard';
        if (isDoorLocation(loc)) return 'volumeDoors';
        return null;
    }

    if (isParcel) {
        if (isDoorLocation(loc)) return 'parcelsDock';
        if (isYardLocation(loc)) return 'parcelsYard';
        return null;
    }

    if (isLive && isDoorLocation(loc)) return 'livesHanded';
    if (isDoorLocation(loc)) return 'volumeDoors';
    if (isYardLocation(loc)) return (oculusRecord.pallets > 0 || isClampLoadNote(ymsInfo.notes)) ? 'dropPallets' : 'dropFloor';

    return null;
}

function normalizeFcApiTrailer(record) {
    const isa = normalize(record?.isa || record?.ISA);
    if (!isa) return null;

    return {
        isa,
        warehouseId: normalize(record.warehouseId),
        location: normalize(record.locationCode || record.location || record.LOCATION),
        updatedAt: record.updatedAt || "",
        priorityLastUpdatedAt: record.priorityLastUpdatedAt || "",
        appointmentType: normalize(record.appointmentType || record["APPOINTMENT TYPE"]),
        carrierLoadType: normalize(record.carrierLoadType || record["CARRIER LOAD TYPE"]),
        dockArrivalTime: record.dockArrivalTime || "",
        priorityScore: Number(record.priorityScore || 0),
        pallets: Number(record.pallets || 0),
        cartons: Number(record.cartons || 0),
        units: Number(record.units || 0),
        empty: Boolean(record.empty),
        raw: record
    };
}

function resolveFcApiCategory(apiTrailer) {
    if (!apiTrailer) return null;

    const loc = normalize(apiTrailer.location);
    const appt = normalize(apiTrailer.appointmentType);
    const loadType = normalize(apiTrailer.carrierLoadType);

    if (appt === "TRANSSHIP") {
        if (isYardLocation(loc)) return 'transshipYard';
        if (isDoorLocation(loc)) return 'volOnlyDoors';
    }

    if (appt === "SMALL_PARCEL") {
        if (isDoorLocation(loc)) return 'parcelsDock';
        if (isYardLocation(loc)) return 'parcelsYard';
    }

    if (loadType === "LIVE" && isDoorLocation(loc)) return 'livesHanded';
    if (isDoorLocation(loc)) return 'volOnlyDoors';
    if (isYardLocation(loc)) return apiTrailer.pallets > 0 ? 'dropPallets' : 'dropFloor';

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
    const parcelDisruptions = getDisruptionCount(stats, 'parcelsDock') + getDisruptionCount(stats, 'parcelsYard');
    const livesClipboardValue = formatLivesValue(stats);
    
    const oldestSpdIsa = stats.oldestSpd ? stats.oldestSpd.isa : "";
    const oldestSpdDate = stats.oldestSpd ? stats.oldestSpd.date : "";
    const oldestTrailerIsa = stats.oldestTrailer ? stats.oldestTrailer.isa : "";
    const formatVolume = value => Math.round(value || 0).toLocaleString();

    const clipboardString = [
        oldestSpdIsa,                   // Oldest SPD ISA
        oldestSpdDate,                  // Oldest SPD Date
        oldestTrailerIsa,               // Oldest Trailer In Yard ISA
        "",
        formatMetricWithDisruptions(stats, 'dropPallets'), // 1. Drop PL
        formatMetricWithDisruptions(stats, 'dropFloor'),   // 2. Drop FL
        formatMetricWithDisruptions(stats, 'parcelsDock'), // 3. Parcels Dock
        formatMetricWithDisruptions(stats, 'parcelsYard'), // 4. Parcels Yard
        formatCountWithDisruptions(totalParcels, parcelDisruptions), // 5. Total Parcels
        formatMetricWithDisruptions(stats, 'transshipYard'), // 6. Transship Yard
        formatMetricWithDisruptions(stats, 'azngOver72'),    // 7. AZNG > 72h
        "",                             // 8. Space
        livesClipboardValue,            // 9. Lives Handed
        "",                             // 10. Space
        "",                             // 11. Space
        formatVolume(stats.volumeDoors), // 12. Volume Doors
        formatVolume(stats.volumeYard)   // 13. Volume Yard
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
            if (valueElement) {
                const formattedValue = value.toLocaleString();
                valueElement.textContent = formattedValue;
                valueElement.title = formattedValue;
                valueElement.classList.toggle('long-value', formattedValue.length >= 6);
                valueElement.classList.toggle('extra-long-value', formattedValue.length >= 8);
            }
            const numericValue = typeof value === 'number' ?
                value :
                (String(value).match(/\d+/g) || []).reduce((sum, part) => sum + Number(part), 0);
            if (isCritical && numericValue > 0) element.classList.add('critical-active');
            else element.classList.remove('critical-active');
        }
    };

    const totalParcels = stats.parcelsDock.length + stats.parcelsYard.length;
    const parcelDisruptions = getDisruptionCount(stats, 'parcelsDock') + getDisruptionCount(stats, 'parcelsYard');

    updateTile('dropPallets', formatMetricWithDisruptions(stats, 'dropPallets'));
    updateTile('dropFloor', formatMetricWithDisruptions(stats, 'dropFloor'));
    updateTile('totalParcels', formatCountWithDisruptions(totalParcels, parcelDisruptions));
    updateTile('parcelsDock', formatMetricWithDisruptions(stats, 'parcelsDock'));
    updateTile('parcelsYard', formatMetricWithDisruptions(stats, 'parcelsYard'));
    updateTile('transshipYard', formatMetricWithDisruptions(stats, 'transshipYard'));
    updateTile('livesHanded', formatLivesValue(stats));
    updateTile('azngOver72', formatMetricWithDisruptions(stats, 'azngOver72'), true);
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

function updateFcApiStatus(message, state = null) {
    const status = document.getElementById('fc-api-status');
    const card = document.querySelector('.api-test-card');
    if (status) status.textContent = message;
    if (card) {
        card.classList.remove('success', 'error');
        if (state) card.classList.add(state);
    }
}

function getFcApiConfig() {
    const savedEndpoint = localStorage.getItem(FC_API_ENDPOINT_KEY) || '';
    const savedWarehouse = localStorage.getItem(FC_API_WAREHOUSE_KEY) || 'GYR2';
    const savedAuthToken = sessionStorage.getItem(FC_API_AUTH_SESSION_KEY) || '';

    return new Promise(resolve => {
        const modal = document.getElementById('fc-api-modal');
        const endpointInput = document.getElementById('fc-api-endpoint-input');
        const warehouseInput = document.getElementById('fc-api-warehouse-input');
        const tokenInput = document.getElementById('fc-api-token-input');
        const submitBtn = document.getElementById('fc-api-submit-btn');
        const cancelBtn = document.getElementById('fc-api-cancel-btn');

        if (!modal || !endpointInput || !warehouseInput || !tokenInput || !submitBtn || !cancelBtn) {
            resolve(null);
            return;
        }

        endpointInput.value = savedEndpoint;
        warehouseInput.value = savedWarehouse;
        tokenInput.value = savedAuthToken;
        modal.style.display = 'block';
        endpointInput.focus();

        const cleanup = () => {
            modal.style.display = 'none';
            submitBtn.removeEventListener('click', handleSubmit);
            cancelBtn.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleBackdrop);
            document.removeEventListener('keydown', handleKeydown);
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        const handleSubmit = () => {
            const endpoint = endpointInput.value.trim();
            const warehouseId = warehouseInput.value.trim().toUpperCase();
            const authToken = tokenInput.value.trim();

            if (!endpoint || !warehouseId) {
                updateFcApiStatus('Endpoint and warehouse are required.', 'error');
                return;
            }

            localStorage.setItem(FC_API_ENDPOINT_KEY, endpoint);
            localStorage.setItem(FC_API_WAREHOUSE_KEY, warehouseId);
            sessionStorage.setItem(FC_API_AUTH_SESSION_KEY, authToken);

            cleanup();
            resolve({ endpoint, warehouseId, authToken });
        };

        const handleBackdrop = event => {
            if (event.target === modal) handleCancel();
        };

        const handleKeydown = event => {
            if (event.key === 'Escape') handleCancel();
            if (event.key === 'Enter' && document.activeElement !== tokenInput) handleSubmit();
        };

        submitBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);
        modal.addEventListener('click', handleBackdrop);
        document.addEventListener('keydown', handleKeydown);
    });
}

async function testFcApiForResearchQueue() {
    if (!window.api?.getTrailersByFC) {
        alert('FC API bridge is not available.');
        return;
    }

    const config = await getFcApiConfig();
    if (!config) return;

    updateFcApiStatus('Calling FCInboundDockService...', null);

    try {
        const result = await window.api.getTrailersByFC(config);
        const trailers = (result.trailers || [])
            .map(normalizeFcApiTrailer)
            .filter(Boolean);

        fcApiTrailerLookup = trailers.reduce((lookup, trailer) => {
            lookup[trailer.isa] = trailer;
            return lookup;
        }, {});

        const researchRecords = lastProcessedStats.researchQueueRecords || [];
        let matched = 0;
        let enriched = 0;

        researchRecords.forEach(record => {
            const apiTrailer = fcApiTrailerLookup[normalize(record.isa)];
            if (!apiTrailer) return;

            matched += 1;
            const suggestedCategory = resolveFcApiCategory(apiTrailer);
            if (suggestedCategory) {
                record.suggestedCategory = suggestedCategory;
                record.confidence = 'API';
            }
            if (apiTrailer.units > 0) record.suggestedUnits = apiTrailer.units;
            if (apiTrailer.location) record.location = apiTrailer.location;
            record.apiMatch = {
                units: apiTrailer.units,
                cartons: apiTrailer.cartons,
                pallets: apiTrailer.pallets,
                appointmentType: apiTrailer.appointmentType,
                carrierLoadType: apiTrailer.carrierLoadType,
                priorityScore: apiTrailer.priorityScore,
                updatedAt: apiTrailer.updatedAt
            };
            record.notes = `FC-IDS ${apiTrailer.appointmentType || 'UNKNOWN'} ${apiTrailer.carrierLoadType || ''} ${record.notes || ''}`.trim();
            enriched += 1;
        });

        updateFcApiStatus(`API OK: ${trailers.length} trailers returned, ${matched} Research Queue matches.`, 'success');

        if (researchRecords.length) {
            lastProcessedStats.researchQueue = researchRecords.length;
            showDetailModal('researchQueue');
        }

        if (!enriched) {
            alert(`API worked and returned ${trailers.length} trailers, but none matched the current Research Queue.`);
        }
    } catch (error) {
        console.error('FC API test failed:', error);
        updateFcApiStatus(`API failed: ${error.message}`, 'error');
        alert(`FC API test failed:\n${error.message}`);
    }
}

// =========================================================================
// 4. Modal & Research Logic
// =========================================================================

function parseOculusNumber(value) {
    return parseFloat(String(value || "0").replace(/,/g, "")) || 0;
}

function cleanOculusText(value) {
    return String(value || "").trim();
}

function getFlexibleField(record, candidates) {
    const keys = Object.keys(record || {});
    for (const candidate of candidates) {
        const normalizedCandidate = normalize(candidate);
        const exactKey = keys.find(key => normalize(key) === normalizedCandidate);
        if (exactKey) return record[exactKey];
    }

    for (const candidate of candidates) {
        const normalizedCandidate = normalize(candidate);
        const fuzzyKey = keys.find(key => normalize(key).includes(normalizedCandidate));
        if (fuzzyKey) return record[fuzzyKey];
    }

    return "";
}

function extractOculusIsa(record) {
    const directIsa = getFlexibleField(record, [
        "ISA",
        "ISA ID",
        "INBOUND SHIPMENT APPOINTMENT",
        "INBOUND SHIPMENT APPOINTMENT ID",
        "APPOINTMENT ID",
        "LOAD ID",
        "LOAD IDENTIFIER"
    ]);
    const directMatch = String(directIsa || "").match(/\b(2\d{11})\b/);
    if (directMatch) return normalize(directMatch[1]);

    const joinedValues = Object.values(record || {}).join(" ");
    const fallbackMatch = joinedValues.match(/\b(2\d{11})\b/);
    return fallbackMatch ? normalize(fallbackMatch[1]) : "";
}

function extractOculusVrid(record) {
    return normalize(getFlexibleField(record, [
        "VRID",
        "TRAILER VRID",
        "TRIP ID",
        "TOUR ID"
    ]));
}

function parseOculusCsvRows(rows, sourceType) {
    const records = {};
    let count = 0;

    rows.forEach(row => {
        const isa = extractOculusIsa(row);
        if (!isa) return;

        const cartons = parseOculusNumber(getFlexibleField(row, [
            "CARTONS/TOTES",
            "CARTONS / TOTES",
            "CARTON/TOTE",
            "CARTON / TOTE",
            "CARTONS",
            "CARTON COUNT",
            "CARTON QTY",
            "TOTES",
            "TOTE COUNT",
            "TOTE QTY",
            "CASES",
            "CASE COUNT"
        ]));
        const units = parseOculusNumber(getFlexibleField(row, ["UNITS", "UNIT COUNT", "UNIT QTY", "TOTAL UNITS", "PENDING UNITS", "EXPECTED UNITS", "EACHES", "EACH QTY", "QUANTITY", "QTY"]));
        const pallets = parseOculusNumber(getFlexibleField(row, ["PALLETS", "PALLET COUNT", "PALLET QTY", "NUMBER OF PALLETS"]));
        const cut = cleanOculusText(getFlexibleField(row, ["CRITICAL UNLOAD TIME", "CUT"]));
        const trailerNumber = cleanOculusText(getFlexibleField(row, ["TRAILER NUMBER", "TRAILER NUM", "TRAILER"]));
        const trailerLocation = cleanOculusText(getFlexibleField(row, ["TRAILER LOCATION", "LOCATION"]));
        const status = cleanOculusText(getFlexibleField(row, ["STATUS", "APPT. STATUS", "TRANSLOAD STATUS", "TRANSSHIP STATUS"]));
        const loadConfig = cleanOculusText(getFlexibleField(row, ["LOAD CONFIG", "FL TYPE"]));
        const scac = cleanOculusText(getFlexibleField(row, ["SCAC", "CARRIER"]));
        const apptType = cleanOculusText(getFlexibleField(row, ["APPT. TYPE", "APPOINTMENT TYPE"]));
        const liveVsDrop = cleanOculusText(getFlexibleField(row, ["LIVE VS DROP", "LOAD TYPE"]));

        records[isa] = {
            isa,
            vrid: extractOculusVrid(row),
            sourceType,
            cartons,
            units,
            pallets,
            cut,
            trailerNumber,
            trailerLocation,
            status,
            loadConfig,
            scac,
            apptType,
            liveVsDrop,
            isPalletized: pallets > 0,
            timestamp: Date.now()
        };
        count++;
    });

    return { records, count };
}

function updateOculusUploadStatus(type, text, success) {
    const status = document.getElementById(`oculus-${type}-status`);
    const card = document.getElementById(`oculus-${type}-card`);

    if (status) status.textContent = text;
    if (card) {
        card.classList.remove('success', 'error');
        if (success === true) card.classList.add('success');
        if (success === false) card.classList.add('error');
    }
}

function updateOculusSyncButton() {
    const button = document.getElementById('sync-oculus-memory-btn');
    const summary = document.getElementById('oculus-sync-summary');
    const vendorCount = pendingOculusUploads.vendor?.count || 0;
    const transshipCount = pendingOculusUploads.transship?.count || 0;

    if (button) button.disabled = !(vendorCount > 0 && transshipCount > 0);
    if (summary) {
        summary.textContent = vendorCount || transshipCount ?
            `Ready: ${vendorCount} vendor records and ${transshipCount} transship records selected.` :
            "No Oculus files selected.";
    }
}

function refreshOculusMemoryCard() {
    if (typeof loadOculusMemory !== 'function') {
        updateCardStatus('gap-filler', 'Sync Oculus memory', null);
        return;
    }

    const saved = loadOculusMemory();
    const total = Object.keys(saved.byIsa || {}).length;
    if (!total) {
        updateCardStatus('gap-filler', 'Sync Oculus memory', null);
        return;
    }

    const uploadedDate = saved.uploadedAt ? new Date(saved.uploadedAt).toLocaleDateString() : 'saved';
    updateCardStatus('gap-filler', `Oculus Memory: ${total} records (${uploadedDate})`, true);
}

async function handleOculusFileSelection(type) {
    const filePath = await window.api.openFile();
    if (!filePath) return;

    updateOculusUploadStatus(type, "Reading...", null);

    try {
        const rawData = await window.api.readCsvFile(filePath);
        const rows = parseCSV(rawData, []);
        const parsed = parseOculusCsvRows(rows, type);
        const fileName = filePath.split(/[/\\]/).pop();

        pendingOculusUploads[type] = parsed;
        updateOculusUploadStatus(type, `Loaded: ${fileName} (${parsed.count} ISA records)`, parsed.count > 0);
    } catch (error) {
        console.error(`Failed to read Oculus ${type} file:`, error);
        pendingOculusUploads[type] = null;
        updateOculusUploadStatus(type, "Failed to load file.", false);
    }

    updateOculusSyncButton();
    updateFileClearButtons();
}

window.processHubData = function() {
    const vendorUpload = pendingOculusUploads.vendor;
    const transshipUpload = pendingOculusUploads.transship;

    if (!vendorUpload?.count || !transshipUpload?.count) {
        alert("Please load both the Oculus Vendor CSV and Transship CSV before syncing.");
        return;
    }

    const records = {
        ...vendorUpload.records,
        ...transshipUpload.records
    };
    const total = Object.keys(records).length;

    if (typeof saveOculusMemory === 'function') {
        saveOculusMemory(records, {
            vendor: vendorUpload.count,
            transship: transshipUpload.count
        });
    }

    document.getElementById('research-hub-modal').style.display = 'none';
    refreshOculusMemoryCard();

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
    if (!isMemoryBypassEnabled() && typeof rememberTrailer === 'function') {
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
    const hasDisruptionDetails = Array.isArray(lastProcessedStats.disruptions?.[metricId]);
    
    if (isResearchQueue) records = lastProcessedStats.researchQueueRecords;
    if (metricId === 'excluded') records = lastProcessedStats.excluded;
    if (hasDisruptionDetails) {
        const usableRecords = (lastProcessedStats[metricId] || []).map(record => ({
            ...record,
            detailStatus: 'USABLE'
        }));
        const disruptions = (lastProcessedStats.disruptions[metricId] || []).map(record => ({
            ...record,
            detailStatus: 'DISRUPTION'
        }));

        records = [...usableRecords, ...disruptions];
    }

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

    if (hasDisruptionDetails) headers = ['ISA', 'VRID', 'LOCATION', 'DWELL', 'PALLETS', 'STATUS', 'NOTES'];

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
            const defaultUnits = record.suggestedUnits ? String(record.suggestedUnits) : "";
            const cellAssign = row.insertCell();
            cellAssign.innerHTML = `
                <div class="research-assignment-controls">
                <button onclick="window.editResearchItem(${index})" class="research-edit-btn">EDIT LOC</button>
                <select id="assign-select-${index}" class="research-select">
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
                <input type="text" inputmode="decimal" id="assign-units-${index}" class="research-units-input" placeholder="Units" value="${escapeHtmlAttr(defaultUnits)}">
                <button onclick="window.moveResearchItem(${index})" class="research-move-btn">MOVE</button>
                </div>`;
        } else if (hasDisruptionDetails) {
            row.insertCell().textContent = record.dwell || 'N/A';
            row.insertCell().textContent = record.pallets || '0';
            row.insertCell().textContent = record.detailStatus || 'USABLE';
            row.insertCell().textContent = record.notes || '';
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
    updateFileClearButtons();
}

function updateFileClearButtons() {
    const clearYmsBtn = document.getElementById('clear-yms-btn');
    const clearDockdashBtn = document.getElementById('clear-dockdash-btn');
    const clearVendorBtn = document.getElementById('clear-oculus-vendor-btn');
    const clearTransshipBtn = document.getElementById('clear-oculus-transship-btn');

    if (clearYmsBtn) clearYmsBtn.disabled = !ymsFilePath;
    if (clearDockdashBtn) clearDockdashBtn.disabled = !dockdashFilePath;
    if (clearVendorBtn) clearVendorBtn.disabled = !(pendingOculusUploads.vendor?.count > 0);
    if (clearTransshipBtn) clearTransshipBtn.disabled = !(pendingOculusUploads.transship?.count > 0);
}

function updateRequiredFileControls() {
    const reconcileBtn = document.getElementById('reconcile-btn');
    const exportBtn = document.getElementById('export-btn');
    const dockdashBtn = document.getElementById('browse-dockdash-btn');

    if (dockdashBtn) dockdashBtn.disabled = !ymsFilePath;
    if (reconcileBtn) reconcileBtn.disabled = !(ymsFilePath && dockdashFilePath);
    if (exportBtn && !(ymsFilePath && dockdashFilePath)) exportBtn.disabled = true;
    updateFileClearButtons();
}

function clearLoadedFile(type) {
    if (type === 'yms') {
        ymsFilePath = null;
        ymsData = [];
        dockdashFilePath = null;
        dockdashData = [];
        lastProcessedStats = {};
        updateCardStatus('yms', 'Select YMS File', null);
        updateCardStatus('dockdash', 'Select Dock Dash File', null);
    } else if (type === 'dockdash') {
        dockdashFilePath = null;
        dockdashData = [];
        lastProcessedStats = {};
        updateCardStatus('dockdash', 'Select Dock Dash File', null);
    }

    updateRequiredFileControls();
    updateActionPanel({ reconciled: false, message: 'Awaiting file selections...' });
}

function clearOculusUpload(type) {
    pendingOculusUploads[type] = null;
    updateOculusUploadStatus(type, type === 'vendor' ? 'Drops and AF lives/live-drops.' : 'Transship trailers and unit counts.', null);
    updateOculusSyncButton();
    updateFileClearButtons();
}

function clearSavedOculusMemory() {
    if (typeof clearOculusMemory === 'function') clearOculusMemory();
    pendingOculusUploads = { vendor: null, transship: null };
    updateOculusUploadStatus('vendor', 'Drops and AF lives/live-drops.', null);
    updateOculusUploadStatus('transship', 'Transship trailers and unit counts.', null);
    refreshOculusMemoryCard();
    updateOculusSyncButton();
    updateFileClearButtons();

    const status = document.getElementById('oculus-memory-admin-status');
    if (status) status.textContent = 'Oculus memory cleared.';

    if (typeof cutBuildRows === 'function') cutBuildRows();
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
        volumeDoors: 0, volumeYard: 0, excluded: excluded, disruptions: createDisruptionBuckets()
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
            loadType: type,
            notes: getField(record, "__YMS_NOTES") || getField(record, "NOTES") || ""
        };
        
        if (isDoorLocation(loc)) stats.volumeDoors += units;
        else if (isYardLocation(loc)) stats.volumeYard += units;

        if (type === "DROP" && appt === "CARP" && isYardLocation(loc)) {
            const dropCategory = (parseFloat(getField(record, "PALLETS")) > 0 || isClampLoadNote(info.notes)) ? 'dropPallets' : 'dropFloor';
            addCategorizedRecord(stats, dropCategory, info);
        }
        if (isParcel) {
            if (isDoorLocation(loc)) addCategorizedRecord(stats, 'parcelsDock', info);
            if (isYardLocation(loc)) addCategorizedRecord(stats, 'parcelsYard', info);
        }
        if (appt === "TRANSSHIP" && isYardLocation(loc)) addCategorizedRecord(stats, 'transshipYard', info);
        if (carrier.startsWith("AZNG") && dwell >= 72 && isYardLocation(loc)) addCategorizedRecord(stats, 'azngOver72', info);
        if (type === "LIVE" && isDoorLocation(loc)) {
            addCategorizedRecord(stats, 'livesHanded', info);
            if (!isDisruptionNote(info.notes, 'livesHanded') && isLiveDropCarrier(carrier)) stats.liveDrops.push(info);
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
                finalMetricsData.push({
                    ...r,
                    __YMS_NOTES: ymsLookup[isa]?.notes || ""
                });
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

                let oculusMatch = null;
                let finalCategory = null;

                if (typeof recallOculusTrailer === 'function') {
                    oculusMatch = recallOculusTrailer(isa);
                    if (oculusMatch) finalCategory = resolveOculusCategory(oculusMatch, ymsInfo);
                }

                // --- MEMORY CHECK ---
                let memory = null;
                if ((!oculusMatch || !finalCategory) && !isMemoryBypassEnabled() && typeof recallTrailer === 'function') {
                    memory = recallTrailer(isa, vrid);
                }

                if (oculusMatch && finalCategory && !(oculusMatch.units > 0)) {
                    researchQueueRecords.push({
                        isa,
                        vrid,
                        location: ymsInfo.location,
                        dwell: ymsInfo.dwell,
                        notes: `OCULUS ${normalize(oculusMatch.sourceType)} matched but units were missing: ${ymsInfo.notes}`,
                        owner: ymsInfo.owner,
                        suggestedCategory: finalCategory,
                        confidence: 'MEDIUM'
                    });
                } else if (oculusMatch && finalCategory) {
                    autoAssignedGhosts.push({
                        isa, vrid: oculusMatch.vrid || vrid,
                        location: ymsInfo.location, dwell: ymsInfo.dwell,
                        category: finalCategory,
                        units: oculusMatch.units,
                        cartons: oculusMatch.cartons,
                        pallets: oculusMatch.pallets,
                        carrier: ymsInfo.carrier, loadType: ymsInfo.loadType,
                        isMemory: true,
                        notes: `OCULUS ${normalize(oculusMatch.sourceType)}: ${ymsInfo.notes}`
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
                addCategorizedRecord(lastProcessedStats, ghost.category, ghost);
                if (
                    ghost.category === 'livesHanded' &&
                    ghost.loadType === "LIVE" &&
                    !isDisruptionNote(ghost.notes, 'livesHanded') &&
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
    const memoryBypassToggle = document.getElementById('memory-bypass-toggle');
    const clearOculusMemoryBtn = document.getElementById('clear-oculus-memory-btn');

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
    if (memoryBypassToggle) {
        memoryBypassToggle.checked = isMemoryBypassEnabled();
        memoryBypassToggle.addEventListener('change', (event) => {
            setMemoryBypassEnabled(event.target.checked);
        });
    }
    if (clearOculusMemoryBtn) {
        clearOculusMemoryBtn.addEventListener('click', clearSavedOculusMemory);
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

    setupMonitorAwareScaling();
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

    const clearYmsBtn = document.getElementById('clear-yms-btn');
    if (clearYmsBtn) {
        clearYmsBtn.addEventListener('click', () => clearLoadedFile('yms'));
    }

    const ddBtn = document.getElementById('browse-dockdash-btn');
    if (ddBtn) {
        ddBtn.addEventListener('click', () => handleFileSelection('dockdash'));
        console.log("Dock Dash button connected");
    }

    const clearDockdashBtn = document.getElementById('clear-dockdash-btn');
    if (clearDockdashBtn) {
        clearDockdashBtn.addEventListener('click', () => clearLoadedFile('dockdash'));
    }
    
    // --- UPDATED: HUB BUTTON LISTENER ---
    const hubBtn = document.getElementById('open-hub-btn');
    if (hubBtn) {
        hubBtn.addEventListener('click', () => {
            document.getElementById('research-hub-modal').style.display = 'block';
            updateOculusSyncButton();
        });
        console.log("Hub button connected");
    }

    const oculusVendorBtn = document.getElementById('browse-oculus-vendor-btn');
    if (oculusVendorBtn) {
        oculusVendorBtn.addEventListener('click', () => handleOculusFileSelection('vendor'));
    }

    const clearOculusVendorBtn = document.getElementById('clear-oculus-vendor-btn');
    if (clearOculusVendorBtn) {
        clearOculusVendorBtn.addEventListener('click', () => clearOculusUpload('vendor'));
    }

    const oculusTransshipBtn = document.getElementById('browse-oculus-transship-btn');
    if (oculusTransshipBtn) {
        oculusTransshipBtn.addEventListener('click', () => handleOculusFileSelection('transship'));
    }

    const clearOculusTransshipBtn = document.getElementById('clear-oculus-transship-btn');
    if (clearOculusTransshipBtn) {
        clearOculusTransshipBtn.addEventListener('click', () => clearOculusUpload('transship'));
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

    const fcApiBtn = document.getElementById('test-fc-api-btn');
    if (fcApiBtn) {
        fcApiBtn.addEventListener('click', testFcApiForResearchQueue);
        console.log("FC API test button connected");
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
    refreshOculusMemoryCard();
    updateOculusSyncButton();
    updateRequiredFileControls();
});




