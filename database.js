// database.js - The Memory System

const DB_KEY = 'gyr2_trailer_memory';
const OCULUS_DB_KEY = 'gyr2_oculus_memory';
const MEMORY_LIMIT_HOURS = 96;

function loadDatabase() {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : {};
}

function saveDatabase(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function loadOculusMemory() {
    const raw = localStorage.getItem(OCULUS_DB_KEY);
    return raw ? JSON.parse(raw) : { byIsa: {}, uploadedAt: null, counts: { vendor: 0, transship: 0 } };
}

function saveOculusMemory(records, counts) {
    const db = {
        byIsa: records || {},
        uploadedAt: Date.now(),
        counts: counts || { vendor: 0, transship: 0 }
    };

    localStorage.setItem(OCULUS_DB_KEY, JSON.stringify(db));
    return db;
}

function clearOculusMemory() {
    localStorage.removeItem(OCULUS_DB_KEY);
}

function recallOculusTrailer(isa) {
    const db = loadOculusMemory();
    const record = db.byIsa?.[isa];
    if (!record) return null;

    const now = Date.now();
    const limitMS = MEMORY_LIMIT_HOURS * 60 * 60 * 1000;
    if (db.uploadedAt && now - db.uploadedAt > limitMS) {
        localStorage.removeItem(OCULUS_DB_KEY);
        console.log("Oculus memory expired and was cleared.");
        return null;
    }

    return record;
}

function purgeOldRecords() {
    const db = loadDatabase();
    const now = Date.now();
    const limitMS = MEMORY_LIMIT_HOURS * 60 * 60 * 1000;
    let deletedCount = 0;

    Object.keys(db).forEach(isa => {
        if (now - db[isa].timestamp > limitMS) {
            delete db[isa];
            deletedCount++;
        }
    });

    saveDatabase(db);
    if (deletedCount > 0) console.log(`Cleaned up ${deletedCount} old records from memory.`);
}

function rememberTrailer(isa, vrid, category, units, notes) {
    const db = loadDatabase();
    db[isa] = {
        vrid,
        category,
        units: parseInt(units, 10) || 0,
        notes,
        timestamp: Date.now(),
    };
    saveDatabase(db);
}

function recallTrailer(isa, currentVrid) {
    const db = loadDatabase();
    const record = db[isa];

    if (!record) return null;

    if (record.vrid !== currentVrid) {
        console.log(`Memory mismatch for ${isa}: old VRID ${record.vrid} vs new ${currentVrid}`);
        return null;
    }

    return record;
}

purgeOldRecords();
