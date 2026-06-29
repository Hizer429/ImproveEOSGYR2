// database.js - The Memory System

const DB_KEY = 'gyr2_trailer_memory';
const MEMORY_LIMIT_HOURS = 96;

function loadDatabase() {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : {};
}

function saveDatabase(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
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
