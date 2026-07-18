// cut-view.js - CUT board view built from YMS truth plus Oculus/Dock Dash enrichment.

const CUT_VIEW_STATE = {
    rows: [],
    filteredRows: [],
    locationFilter: 'all',
    typeFilter: 'all',
    search: ''
};

function cutSafeText(value, fallback = '--') {
    const text = String(value || '').trim();
    return text || fallback;
}

function cutFormatNumber(value) {
    const number = Number(value || 0);
    return number > 0 ? Math.round(number).toLocaleString() : '--';
}

function cutExtractVridFromYms(loadId) {
    const match = String(loadId || '').match(/VRID\W*([A-Z0-9]+)/i);
    return match ? normalize(match[1]) : '';
}

function cutParseDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const normalized = raw.replace(/\//g, '-').replace(' ', 'T');
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cutFormatDate(value) {
    const parsed = cutParseDate(value);
    if (!parsed) return '--';

    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
}

function cutFormatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function cutReadDateInput(id) {
    const value = document.getElementById(id)?.value;
    if (!value) return null;
    const parsed = new Date(`${value}T00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cutReadNumberInput(id) {
    const value = Number(document.getElementById(id)?.value || 0);
    return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function cutWriteNumberInput(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = String(Math.max(Math.round(value || 0), 0));
}

function cutDefaultShiftWindow(now = new Date()) {
    const start = new Date(now);
    const end = new Date(now);
    const hour = now.getHours();

    if (hour >= 7 && hour < 19) {
        start.setHours(7, 0, 0, 0);
        end.setHours(17, 30, 0, 0);
    } else if (hour >= 19) {
        start.setHours(19, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        end.setHours(5, 30, 0, 0);
    } else {
        start.setDate(start.getDate() - 1);
        start.setHours(19, 0, 0, 0);
        end.setHours(5, 30, 0, 0);
    }

    return { start, end };
}

function cutSetDefaultShiftInputs() {
    const shiftInput = document.getElementById('cut-shift-type-input');
    const dateInput = document.getElementById('cut-shift-date-input');
    if (!shiftInput || !dateInput || dateInput.value) return;

    const now = new Date();
    if (now.getHours() >= 7 && now.getHours() < 19) {
        shiftInput.value = 'day';
        dateInput.value = cutFormatDateInput(now);
    } else if (now.getHours() >= 19) {
        shiftInput.value = 'night';
        dateInput.value = cutFormatDateInput(now);
    } else {
        const previousDay = new Date(now);
        previousDay.setDate(previousDay.getDate() - 1);
        shiftInput.value = 'night';
        dateInput.value = cutFormatDateInput(previousDay);
    }
}

function cutCutStatus(cutDate) {
    if (!cutDate) return 'Missing CUT';

    const now = new Date();
    const diffHours = (cutDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 0) return 'Past due';
    if (diffHours <= 4) return 'Next 4 hrs';
    return 'Future';
}

function cutGetShiftWindow() {
    cutSetDefaultShiftInputs();
    const shiftDate = cutReadDateInput('cut-shift-date-input');
    const shiftType = document.getElementById('cut-shift-type-input')?.value || 'day';

    if (!shiftDate) {
        return cutDefaultShiftWindow();
    }

    const start = new Date(shiftDate);
    const end = new Date(shiftDate);

    if (shiftType === 'night') {
        start.setHours(19, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        end.setHours(5, 30, 0, 0);
    } else {
        start.setHours(7, 0, 0, 0);
        end.setHours(17, 30, 0, 0);
    }

    return { start, end };
}

function cutDueBucket(row, window = cutGetShiftWindow()) {
    if (!row?.cutDate) return 'missing';
    if (row.cutDate < window.start) return 'past';
    if (row.cutDate <= window.end) return 'current';
    return 'future';
}

function cutBuildDockDashLookup() {
    const lookup = {};
    (dockdashData || []).forEach(row => {
        const isa = normalize(getField(row, 'ISA'));
        if (!isa) return;
        lookup[isa] = row;
    });
    return lookup;
}

function cutGetOculusMemory() {
    if (typeof loadOculusMemory !== 'function') return {};
    return loadOculusMemory().byIsa || {};
}

function cutClassifyTrailer(ymsRow, oculusRecord) {
    const carrier = normalize(getField(ymsRow, 'CARRIER') || oculusRecord?.scac);
    const appt = normalize(getField(ymsRow, 'APPOINTMENT TYPE') || oculusRecord?.apptType);
    const loadType = normalize(getField(ymsRow, 'CARRIER LOAD TYPE') || oculusRecord?.liveVsDrop);
    const sourceType = normalize(oculusRecord?.sourceType);

    if (sourceType === 'TRANSSHIP') return { key: 'transship', label: 'Transship' };
    if (appt === 'SMALL_PARCEL' || isParcelCarrier(carrier)) return { key: 'parcel', label: 'Parcel' };
    if (loadType === 'LIVE') return { key: 'live', label: 'Live' };
    if (loadType === 'DROP') return { key: 'vendor', label: 'Vendor Drop' };
    return { key: 'other', label: 'Other' };
}

function cutBuildRows() {
    const oculusByIsa = cutGetOculusMemory();
    const dockDashByIsa = cutBuildDockDashLookup();

    CUT_VIEW_STATE.rows = (ymsData || [])
        .map(ymsRow => {
            const isa = extractYmsIsa(ymsRow);
            if (!isa) return null;

            const location = normalize(getField(ymsRow, 'LOCATION'));
            if (!isDoorLocation(location) && !isYardLocation(location)) return null;

            const oculusRecord = oculusByIsa[isa] || null;
            const dockDashRow = dockDashByIsa[isa] || null;
            const fullLoadId = getField(ymsRow, 'LOAD IDENTIFIER(S)');
            const vrid = oculusRecord?.vrid ||
                cutExtractVridFromYms(fullLoadId) ||
                normalize(getField(dockDashRow, 'VRID')) ||
                'UNKNOWN';
            const cutValue = oculusRecord?.cut || getField(dockDashRow, 'CUT') || '';
            const cutDate = cutParseDate(cutValue);
            const trailerType = cutClassifyTrailer(ymsRow, oculusRecord);
            const ymsNotes = getField(ymsRow, 'NOTES') || '';
            const units = oculusRecord?.units || parseFloat(String(getField(dockDashRow, 'UNITS') || '0').replace(/,/g, '')) || 0;
            const cartons = oculusRecord?.cartons || 0;
            const pallets = oculusRecord?.pallets ||
                parseFloat(String(getField(dockDashRow, 'PALLETS') || '0').replace(/,/g, '')) ||
                (isClampLoadNote(ymsNotes) ? 1 : 0);
            const sourceParts = ['YMS'];
            if (oculusRecord) sourceParts.push('Oculus');
            if (dockDashRow) sourceParts.push('Dock Dash');

            return {
                isa,
                vrid,
                location,
                typeKey: trailerType.key,
                typeLabel: trailerType.label,
                cutValue,
                cutDate,
                dueBucket: cutDate ? cutDueBucket({ cutDate }) : 'missing',
                cutStatus: cutCutStatus(cutDate),
                units,
                cartons,
                pallets,
                carrier: normalize(getField(ymsRow, 'CARRIER') || oculusRecord?.scac),
                notes: ymsNotes,
                source: sourceParts.join(' + '),
                hasOculus: Boolean(oculusRecord),
                hasDockDash: Boolean(dockDashRow)
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            if (a.cutDate && b.cutDate) return a.cutDate - b.cutDate;
            if (a.cutDate) return -1;
            if (b.cutDate) return 1;
            return a.location.localeCompare(b.location) || a.isa.localeCompare(b.isa);
        });

    cutApplyFilters();
}

function cutRefreshDueBuckets() {
    const window = cutGetShiftWindow();
    CUT_VIEW_STATE.rows.forEach(row => {
        row.dueBucket = cutDueBucket(row, window);
    });
}

function cutApplyFilters() {
    cutRefreshDueBuckets();
    const search = CUT_VIEW_STATE.search.toLowerCase();

    CUT_VIEW_STATE.filteredRows = CUT_VIEW_STATE.rows.filter(row => {
        if (CUT_VIEW_STATE.locationFilter === 'doors' && !isDoorLocation(row.location)) return false;
        if (CUT_VIEW_STATE.locationFilter === 'yard' && !isYardLocation(row.location)) return false;
        if (CUT_VIEW_STATE.locationFilter === 'missing' && row.cutDate) return false;
        if (CUT_VIEW_STATE.typeFilter !== 'all' && row.typeKey !== CUT_VIEW_STATE.typeFilter) return false;
        if (!search) return true;

        return [
            row.isa,
            row.vrid,
            row.location,
            row.typeLabel,
            row.carrier,
            row.notes,
            row.source
        ].some(value => String(value || '').toLowerCase().includes(search));
    });

    cutRender();
}

function cutRenderSourceCards() {
    const ymsCard = document.getElementById('cut-yms-source');
    const oculusCard = document.getElementById('cut-oculus-source');
    const dockDashCard = document.getElementById('cut-dockdash-source');
    const ymsCount = (ymsData || []).filter(row => {
        const loc = normalize(getField(row, 'LOCATION'));
        return isDoorLocation(loc) || isYardLocation(loc);
    }).length;
    const oculusCount = Object.keys(cutGetOculusMemory()).length;
    const dockDashCount = (dockdashData || []).length;

    cutUpdateSourceCard(ymsCard, ymsCount > 0, `${ymsCount} PS/DD trailers shown`);
    cutUpdateSourceCard(oculusCard, oculusCount > 0, `${oculusCount} ISA records available`);
    cutUpdateSourceCard(dockDashCard, dockDashCount > 0, `${dockDashCount} Dock Dash rows loaded`);
}

function cutUpdateSourceCard(card, isReady, text) {
    if (!card) return;
    card.classList.toggle('ready', isReady);
    const status = card.querySelector('span');
    if (status) status.textContent = text;
}

function cutRenderMetrics() {
    const now = new Date();
    const fourHours = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const past = CUT_VIEW_STATE.rows.filter(row => row.cutDate && row.cutDate < now).length;
    const soon = CUT_VIEW_STATE.rows.filter(row => row.cutDate && row.cutDate >= now && row.cutDate <= fourHours).length;
    const yard = CUT_VIEW_STATE.rows.filter(row => isYardLocation(row.location)).length;
    const doors = CUT_VIEW_STATE.rows.filter(row => isDoorLocation(row.location)).length;
    const missing = CUT_VIEW_STATE.rows.filter(row => !row.cutDate || !(row.units > 0)).length;

    cutSetText('cut-past-count', past);
    cutSetText('cut-soon-count', soon);
    cutSetText('cut-yard-count', yard);
    cutSetText('cut-door-count', doors);
    cutSetText('cut-visible-count', CUT_VIEW_STATE.filteredRows.length);
    cutSetText('cut-past-summary', `${past} trailers past CUT`);
    cutSetText('cut-yard-summary', `${yard} yard trailers need review`);
    cutSetText('cut-missing-summary', `${missing} missing CUT or units`);
}

function cutCalculateCompliance(inputs) {
    const outstandingCurrent = Math.max(Number(inputs.outstandingCurrent) || 0, 0);
    const outstandingPast = Math.max(Number(inputs.outstandingPast) || 0, 0);
    const processedCurrent = Math.max(Number(inputs.processedCurrent) || 0, 0);
    const processedPast = Math.max(Number(inputs.processedPast) || 0, 0);
    const processedFuture = Math.max(Number(inputs.processedFuture) || 0, 0);
    const totalProcessed = processedCurrent + processedPast + processedFuture;

    if (totalProcessed <= 0) {
        return {
            totalProcessed: 0,
            dueRequired: 0,
            pastRequired: 0,
            missedCurrent: 0,
            missedPast: 0,
            compliantProcessed: 0,
            compliance: null
        };
    }

    const dueRequired = Math.min(outstandingCurrent, totalProcessed);
    const pastRequired = Math.min(outstandingPast, Math.max(totalProcessed - dueRequired, 0));
    const missedCurrent = Math.max(dueRequired - processedCurrent, 0);
    const missedPast = Math.max(pastRequired - processedPast, 0);
    const compliantProcessed = Math.max(totalProcessed - missedCurrent - missedPast, 0);

    return {
        totalProcessed,
        dueRequired,
        pastRequired,
        missedCurrent,
        missedPast,
        compliantProcessed,
        compliance: compliantProcessed / totalProcessed
    };
}

function cutFindSafeFutureAdds(inputs, targetPercent, baseResult = cutCalculateCompliance(inputs), maxToTest = 300) {
    if (
        baseResult.totalProcessed <= 0 ||
        baseResult.missedCurrent > 0 ||
        baseResult.missedPast > 0
    ) {
        return {
            safeAdds: 0,
            safeResult: baseResult,
            firstUnsafe: baseResult,
            locked: baseResult.totalProcessed > 0
        };
    }

    let safeAdds = 0;
    let safeResult = baseResult;
    let firstUnsafe = null;

    for (let extraFuture = 1; extraFuture <= maxToTest; extraFuture++) {
        const result = cutCalculateCompliance({
            ...inputs,
            processedFuture: inputs.processedFuture + extraFuture
        });

        if (result.compliance !== null && result.compliance * 100 >= targetPercent) {
            safeAdds = extraFuture;
            safeResult = result;
        } else {
            firstUnsafe = result;
            break;
        }
    }

    return { safeAdds, safeResult, firstUnsafe, locked: false };
}

function cutGetCalculatorInputs() {
    return {
        outstandingCurrent: cutReadNumberInput('cut-outstanding-current-input'),
        outstandingPast: cutReadNumberInput('cut-outstanding-past-input'),
        processedCurrent: cutReadNumberInput('cut-processed-current-input'),
        processedPast: cutReadNumberInput('cut-processed-past-input'),
        processedFuture: cutReadNumberInput('cut-processed-future-input')
    };
}

function cutFormatPercent(value) {
    if (value === null || value === undefined) return '--';
    return `${(value * 100).toFixed(1)}%`;
}

function cutSetActionMessage(message, tone = 'neutral') {
    const element = document.getElementById('cut-next-action');
    if (!element) return;
    element.classList.remove('good', 'warning', 'danger');
    if (tone !== 'neutral') element.classList.add(tone);
    element.textContent = message;
}

function cutBuildActionMessage(inputs, result, targetPercent, safeFuture) {
    if (!result.totalProcessed) {
        return {
            tone: 'neutral',
            text: 'Enter processed counts to forecast CUT compliance.'
        };
    }

    const currentGap = Math.max(Math.min(inputs.outstandingCurrent, result.totalProcessed) - inputs.processedCurrent, 0);
    if (currentGap > 0) {
        return {
            tone: 'danger',
            text: `Process ${currentGap} more Current-Due trailer${currentGap === 1 ? '' : 's'} before Future-Due work.`
        };
    }

    const pastGap = Math.max(result.pastRequired - inputs.processedPast, 0);
    if (pastGap > 0) {
        return {
            tone: 'warning',
            text: `Process ${pastGap} more Past-Due trailer${pastGap === 1 ? '' : 's'} before bringing in more Future-Due.`
        };
    }

    if (result.compliance * 100 < targetPercent) {
        return {
            tone: 'danger',
            text: `Forecast is below ${targetPercent}%. Add Current/Past-Due work before any more Future-Due.`
        };
    }

    if (safeFuture.safeAdds >= 300) {
        return {
            tone: 'good',
            text: `Future-Due is unlocked. You can keep processing Future-Due and remain at or above ${targetPercent}% in this forecast.`
        };
    }

    return {
        tone: safeFuture.safeAdds > 0 ? 'good' : 'warning',
        text: `You can add ${safeFuture.safeAdds} Future-Due trailer${safeFuture.safeAdds === 1 ? '' : 's'} before dropping below ${targetPercent}%.`
    };
}

function cutBuildForecastExplanation(inputs, result, targetPercent, safeFuture) {
    if (!result.totalProcessed) {
        return `
            <p>Enter processed trailer counts first. The helper will show which SOP slots were covered, which were skipped, and what trailer category should come in next.</p>
        `;
    }

    const currentGap = Math.max(result.dueRequired - inputs.processedCurrent, 0);
    const pastGap = Math.max(result.pastRequired - inputs.processedPast, 0);
    const currentSlots = result.dueRequired;
    const pastSlots = result.pastRequired;
    const futureAllowedSlots = Math.max(result.totalProcessed - currentSlots - pastSlots, 0);
    const totalPenalty = result.missedCurrent + result.missedPast;
    const statusLine = result.compliance * 100 >= targetPercent ?
        `This is at or above the ${targetPercent}% target.` :
        `This is below the ${targetPercent}% target.`;
    const currentSlotText = currentSlots > 0 ?
        `Slots 1-${currentSlots} should be Current-Due.` :
        'No Current-Due slots were required for this processed volume.';
    const pastStart = currentSlots + 1;
    const pastEnd = currentSlots + pastSlots;
    const pastSlotText = pastSlots > 0 ?
        `Slots ${pastStart}-${pastEnd} should be Past-Due.` :
        'No Past-Due slots have been reached yet, so Past-Due misses are not counted yet.';
    const futureStart = currentSlots + pastSlots + 1;
    const futureSlotText = futureAllowedSlots > 0 ?
        `Slots ${futureStart}-${result.totalProcessed} can be Future-Due without creating a new SOP miss.` :
        'The processed volume has not reached a clean Future-Due slot yet.';
    const pastPoolNote = inputs.outstandingPast > result.pastRequired ?
        `Even though ${inputs.outstandingPast} Past-Due trailer${inputs.outstandingPast === 1 ? '' : 's'} exist, only ${result.pastRequired} ${result.pastRequired === 1 ? 'is' : 'are'} required at ${result.totalProcessed} total processed. The rest are not penalized until your total processed volume reaches those slots.` :
        `At this processed volume, all required Past-Due slots from the starting pool have been reached.`;

    let recommendation;
    if (currentGap > 0) {
        recommendation = `Bring in ${currentGap} more Current-Due trailer${currentGap === 1 ? '' : 's'} before Future-Due. Future-Due is locked because Current-Due is still short.`;
    } else if (pastGap > 0) {
        recommendation = `Bring in ${pastGap} more Past-Due trailer${pastGap === 1 ? '' : 's'} before Future-Due. Current-Due is covered, so Past-Due is the next SOP priority.`;
    } else if (safeFuture.safeAdds >= 300) {
        recommendation = `Current-Due and Past-Due are covered. Future-Due is unlocked in this forecast.`;
    } else {
        recommendation = `Current-Due and Past-Due are covered. You can add ${safeFuture.safeAdds} Future-Due trailer${safeFuture.safeAdds === 1 ? '' : 's'} before dropping below ${targetPercent}%.`;
    }

    return `
        <p><strong>Short version:</strong> the score is not asking whether every Past-Due trailer was completed. It is asking whether the ${result.totalProcessed} trailers processed followed the SOP order: Current first, then Past, then Future.</p>
        <div class="cut-explanation-grid">
            <div><span>Total Processed</span><strong>${result.totalProcessed}</strong></div>
            <div><span>Current Required</span><strong>${currentSlots}</strong></div>
            <div><span>Past Required</span><strong>${pastSlots}</strong></div>
            <div><span>Future Slots Reached</span><strong>${futureAllowedSlots}</strong></div>
        </div>
        <p><strong>SOP slots:</strong> ${currentSlotText} ${pastSlotText} ${futureSlotText}</p>
        <p><strong>What happened:</strong> you processed ${inputs.processedCurrent} Current-Due, ${inputs.processedPast} Past-Due, and ${inputs.processedFuture} Future-Due. That leaves ${result.missedCurrent} missed Current and ${result.missedPast} missed Past for the slots reached so far.</p>
        <p><strong>Why Past missed can look lower:</strong> ${pastPoolNote}</p>
        <p><strong>Math:</strong> ${result.totalProcessed} total - ${totalPenalty} SOP miss${totalPenalty === 1 ? '' : 'es'} = ${result.compliantProcessed} compliant. ${result.compliantProcessed} / ${result.totalProcessed} = ${cutFormatPercent(result.compliance)}. ${statusLine}</p>
        <p><strong>What to tell a manager:</strong> ${recommendation}</p>
    `;
}

function cutRenderExplanation() {
    const panel = document.getElementById('cut-explanation-panel');
    const body = document.getElementById('cut-explanation-body');
    if (!panel || !body || panel.hidden) return;

    const inputs = cutGetCalculatorInputs();
    const targetPercent = cutReadNumberInput('cut-target-input') || 85;
    const result = cutCalculateCompliance(inputs);
    const safeFuture = cutFindSafeFutureAdds(inputs, targetPercent, result);
    body.innerHTML = cutBuildForecastExplanation(inputs, result, targetPercent, safeFuture);
}

function cutToggleExplanation(show) {
    const panel = document.getElementById('cut-explanation-panel');
    if (!panel) return;
    panel.hidden = typeof show === 'boolean' ? !show : !panel.hidden;
    cutRenderExplanation();
}

function cutUpdateCalculator() {
    const inputs = cutGetCalculatorInputs();
    const targetPercent = cutReadNumberInput('cut-target-input') || 85;
    const result = cutCalculateCompliance(inputs);
    const safeFuture = cutFindSafeFutureAdds(inputs, targetPercent, result);
    const action = cutBuildActionMessage(inputs, result, targetPercent, safeFuture);

    cutSetText('cut-compliance-percent', cutFormatPercent(result.compliance));
    cutSetText('cut-compliant-count', result.totalProcessed ? `${result.compliantProcessed} / ${result.totalProcessed}` : '--');
    cutSetText('cut-missed-current-count', result.totalProcessed ? result.missedCurrent : '--');
    cutSetText('cut-missed-past-count', result.totalProcessed ? result.missedPast : '--');
    cutSetText('cut-safe-future-count', result.totalProcessed ? safeFuture.safeAdds : '--');
    cutSetActionMessage(action.text, action.tone);
    cutRenderExplanation();
}

function cutUseBoardCounts() {
    cutRefreshDueBuckets();
    const current = CUT_VIEW_STATE.rows.filter(row => row.dueBucket === 'current').length;
    const past = CUT_VIEW_STATE.rows.filter(row => row.dueBucket === 'past').length;

    cutWriteNumberInput('cut-outstanding-current-input', current);
    cutWriteNumberInput('cut-outstanding-past-input', past);
    cutUpdateCalculator();
}

function cutSetText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

function cutRenderRows() {
    const tbody = document.getElementById('cut-table-body');
    if (!tbody) return;

    if (CUT_VIEW_STATE.filteredRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10">No trailers match the current CUT filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    CUT_VIEW_STATE.filteredRows.forEach((row, index) => {
        const tr = document.createElement('tr');
        if (row.cutDate && row.cutDate < new Date()) tr.classList.add('risk-high');
        else if (row.cutDate && row.cutDate <= new Date(Date.now() + 4 * 60 * 60 * 1000)) tr.classList.add('risk-soon');

        tr.innerHTML = `
            <td><span class="cut-rank">${index + 1}</span></td>
            <td><strong>${cutEscapeHtml(cutSafeText(row.isa))}</strong><span>${cutEscapeHtml(cutSafeText(row.vrid))}</span></td>
            <td>${cutEscapeHtml(cutSafeText(row.location))}</td>
            <td><span class="cut-type-pill ${cutEscapeHtml(row.typeKey)}">${cutEscapeHtml(cutSafeText(row.typeLabel))}</span></td>
            <td><strong>${cutEscapeHtml(cutFormatDate(row.cutValue))}</strong><span>${cutEscapeHtml(cutSafeText(row.cutStatus))}</span></td>
            <td>${cutFormatNumber(row.units)}</td>
            <td>${cutFormatNumber(row.cartons)}</td>
            <td>${cutFormatNumber(row.pallets)}</td>
            <td><span class="cut-source ${row.hasOculus ? 'good' : 'warn'}">${cutEscapeHtml(cutSafeText(row.source))}</span></td>
            <td title="${cutEscapeAttr(row.notes)}">${cutEscapeHtml(cutSafeText(row.notes, ''))}</td>
        `;
        tbody.appendChild(tr);
    });
}

function cutEscapeAttr(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function cutEscapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function cutBuildCopyText(rows) {
    return rows.map((row, index) =>
        `${index + 1}. ${row.isa} ${row.location} CUT ${cutFormatDate(row.cutValue)} ${cutFormatNumber(row.units)} units`
    ).join('\n');
}

function cutRender() {
    cutRenderSourceCards();
    cutRenderMetrics();
    cutRenderRows();
    cutUpdateCalculator();
}

function cutShowView() {
    document.getElementById('action-panel')?.classList.add('cut-hidden');
    document.getElementById('eos-dashboard-view')?.classList.add('hidden-section');
    document.getElementById('admin-tools')?.classList.remove('visible');
    document.getElementById('cut-board-view')?.classList.remove('hidden-section');
    cutBuildRows();
}

function cutShowDashboard() {
    document.getElementById('cut-board-view')?.classList.add('hidden-section');
    document.getElementById('action-panel')?.classList.remove('cut-hidden');
    document.getElementById('eos-dashboard-view')?.classList.remove('hidden-section');
}

function cutCopyPriorityList() {
    const text = cutBuildCopyText(CUT_VIEW_STATE.filteredRows);
    if (!text) return;
    window.api.writeToClipboard(text);
}

function setupCutView() {
    cutSetDefaultShiftInputs();
    document.getElementById('open-cut-view-btn')?.addEventListener('click', cutShowView);
    document.getElementById('back-to-eos-btn')?.addEventListener('click', cutShowDashboard);
    document.getElementById('refresh-cut-board-btn')?.addEventListener('click', cutBuildRows);
    document.getElementById('copy-cut-list-btn')?.addEventListener('click', cutCopyPriorityList);
    document.getElementById('cut-use-board-counts-btn')?.addEventListener('click', cutUseBoardCounts);
    document.getElementById('cut-explain-btn')?.addEventListener('click', () => cutToggleExplanation());
    document.getElementById('cut-close-explanation-btn')?.addEventListener('click', () => cutToggleExplanation(false));

    [
        'cut-shift-type-input',
        'cut-shift-date-input',
        'cut-target-input',
        'cut-outstanding-current-input',
        'cut-outstanding-past-input',
        'cut-processed-current-input',
        'cut-processed-past-input',
        'cut-processed-future-input'
    ].forEach(id => {
        const input = document.getElementById(id);
        const update = () => {
            if (id === 'cut-shift-type-input' || id === 'cut-shift-date-input') {
                cutRefreshDueBuckets();
                cutRenderMetrics();
                cutRenderRows();
            }
            cutUpdateCalculator();
        };
        input?.addEventListener('input', update);
        input?.addEventListener('change', update);
    });

    document.querySelectorAll('[data-cut-location-filter]').forEach(button => {
        button.addEventListener('click', () => {
            CUT_VIEW_STATE.locationFilter = button.dataset.cutLocationFilter || 'all';
            document.querySelectorAll('[data-cut-location-filter]').forEach(item => item.classList.toggle('selected', item === button));
            cutSetText('cut-active-view-label', button.textContent.trim());
            cutApplyFilters();
        });
    });

    document.querySelectorAll('[data-cut-type-filter]').forEach(button => {
        button.addEventListener('click', () => {
            CUT_VIEW_STATE.typeFilter = button.dataset.cutTypeFilter || 'all';
            document.querySelectorAll('[data-cut-type-filter]').forEach(item => item.classList.toggle('selected', item === button));
            cutApplyFilters();
        });
    });

    document.getElementById('cut-search-input')?.addEventListener('input', event => {
        CUT_VIEW_STATE.search = event.target.value || '';
        cutApplyFilters();
    });
}

window.addEventListener('DOMContentLoaded', setupCutView);
