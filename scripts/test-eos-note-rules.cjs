const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function app() {
    const fields = {
        'assign-select-0': { value: 'dropFloor' },
        'assign-units-0': { value: '125' },
        'detail-modal': { style: {} },
        'export-btn': {}
    };
    const context = vm.createContext({
        window: { addEventListener() {} },
        document: { addEventListener() {}, getElementById: id => fields[id] || null },
        localStorage: { getItem: () => null },
        console, alert: message => { throw new Error(message); }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'renderer.js'), 'utf8'), context);
    vm.runInContext(`updateMetricsUI = () => {}; copyStatsToClipboard = () => {}; updateActionPanel = () => {};
        findOldestSpdRecord = () => null; findOldestTrailerInYard = () => null;`, context);
    return context;
}

test('reject, misship, and missing-manifest spelling variants are disruptions', () => {
    const context = app();
    for (const note of ['reject', 'rejected load', 'rejection', 'rejecting trailer', 'REJECTS',
        'misship', 'mis-ship', 'mis ship', 'misships', 'mis-shipped', 'misshipment', 'mis shipments',
        'No mani', 'NO MANIFEST', 'no-mani', 'missing manifest', 'manifest missing',
        'without a manifest', 'awaiting manifest', 'manifest not found', 'manifest is not available',
        'unmanifested', 'not manifested']) {
        assert.equal(context.isDisruptionNote(note, 'parcelsYard'), true, note);
    }
});

test('ordinary notes and explicit negation do not trigger new disruption rules', () => {
    const context = app();
    for (const note of ['manifest received', 'shipment ready', 'ISA pending', 'not rejected',
        'no misships', 'no rejection', 'no longer rejected', 'not missing manifest', 'manifest available']) {
        assert.equal(context.isDisruptionNote(note, 'parcelsYard'), false, note);
    }
    assert.equal(context.isDisruptionNote('not rejected; missing manifest', 'parcelsYard'), true);
    assert.equal(context.isDisruptionNote('PROBLEM SOLVE', 'parcelsYard'), false);
    assert.equal(context.isDisruptionNote('PROBLEM SOLVE', 'dropFloor'), true);
    assert.equal(context.isDisruptionNote('damaged', 'parcelsYard'), true);
});

const parcel = (overrides = {}) => ({
    Location: 'PS101', Type: 'Trailer', 'Owner (Operator)': 'UPSN',
    'Vehicle ID': 'PARCEL1', 'Load identifier(s)': '', Notes: 'needs isa', ...overrides
});

test('all specified parcel carriers count without ISA, from Owner or Carrier', () => {
    const context = app();
    for (const carrier of ['UPSS', 'UPSN', 'FEDEX', 'FDEG', 'DHLC', 'Fed Ex']) {
        const result = context.collectUnassignedYardParcels([parcel({ 'Owner (Operator)': carrier })]);
        assert.equal(result.length, 1, carrier);
        assert.equal(result[0].isa, '');
        assert.equal(result[0].units, 0);
        assert.equal(result[0].trailer, 'PARCEL1');
    }
    assert.equal(context.collectUnassignedYardParcels([parcel({ Carrier: 'DHLC', 'Owner (Operator)': '' })]).length, 1);
});

test('requires yard trailer, parcel carrier, standalone ISA note, and no attached ISA', () => {
    const context = app();
    const rejected = [
        parcel({ Location: 'DD101' }), parcel({ Notes: 'empty' }), parcel({ Notes: 'VISA paperwork' }),
        parcel({ 'Owner (Operator)': 'OTHER' }), parcel({ Type: 'Tractor' }),
        parcel({ 'Load identifier(s)': 'ISA: 210000000001' })
    ];
    assert.equal(context.collectUnassignedYardParcels(rejected).length, 0);
});

test('deduplicates vehicle/VRID identities and rows already represented by an attached ISA', () => {
    const context = app();
    assert.equal(context.collectUnassignedYardParcels([parcel(), parcel()]).length, 1);
    assert.equal(context.collectUnassignedYardParcels([
        parcel(), parcel({ 'Load identifier(s)': 'ISA: 210000000001' })
    ]).length, 0);
    assert.equal(context.collectUnassignedYardParcels([
        parcel({ 'Load identifier(s)': 'VRID: VR123' }),
        parcel({ 'Vehicle ID': '', 'Load identifier(s)': 'VRID: VR123' })
    ]).length, 1);
    assert.equal(context.collectUnassignedYardParcels([
        parcel({ 'Vehicle ID': '' }), parcel({ 'Vehicle ID': '' })
    ]).length, 1);
    assert.equal(context.collectUnassignedYardParcels([
        parcel(), parcel({ 'Vehicle ID': 'PARCEL2', Location: 'PS102' })
    ]).length, 2);
});

test('Dock Dash disruption notes are retained when Yard notes are also present', () => {
    const context = app();
    const stats = context.calculateMetrics([{
        ISA: '210000000001', LOCATION: 'PS100', CARRIER: 'UPSN', UNITS: '100',
        '__YMS_NOTES': 'ISA attached', NOTES: 'mis-ship'
    }], []);
    assert.equal(stats.parcelsYard.length, 0);
    assert.equal(stats.disruptions.parcelsYard.length, 1);
    assert.equal(stats.volumeYard, 100);
});

test('manual research assignment preserves disruption notes', () => {
    const context = app();
    vm.runInContext(`lastProcessedStats = calculateMetrics([], []);
        lastProcessedStats.researchQueueRecords = [{isa:'210000000004', vrid:'VR4', location:'PS104', notes:'No mani'}];
        lastProcessedStats.researchQueue = 1;
        window.moveResearchItem(0);`, context);
    const stats = vm.runInContext('lastProcessedStats', context);
    assert.equal(stats.dropFloor.length, 0);
    assert.equal(stats.disruptions.dropFloor.length, 1);
    assert.equal(stats.disruptions.dropFloor[0].notes, 'No mani');
    assert.equal(stats.volumeYard, 125);
    assert.equal(stats.researchQueue, 0);
});

test('full reconciliation counts no-ISA parcels once, with disruption separation and no added units', async () => {
    const context = app();
    const yard = [parcel(), parcel(), parcel({ 'Vehicle ID': 'PARCEL2', Location: 'PS102', Notes: 'ISA pending - No mani' }),
        parcel({ 'Vehicle ID': 'PARCEL3', Location: 'PS103', 'Load identifier(s)': 'ISA: 210000000003' }),
        parcel({ 'Vehicle ID': 'PARCEL3', Location: 'PS103' })];
    vm.runInContext(`ymsData = ${JSON.stringify(yard)};
        dockdashData = [{ISA:'210000000003', LOCATION:'PS103', CARRIER:'UPSN', UNITS:200}];`, context);
    await context.reconcileAndDisplay();
    const stats = vm.runInContext('lastProcessedStats', context);
    assert.equal(stats.parcelsYard.length, 2);
    assert.equal(stats.disruptions.parcelsYard.length, 1);
    assert.equal(stats.volumeYard, 200);
    assert.equal(stats.researchQueue, 0);
    assert.equal(stats.parcelsYard[1].countSource, 'yard-notes');
});
