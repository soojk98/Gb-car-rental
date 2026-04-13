// =====================================================================
// Shared helpers for admin list pages: Excel export + simple search.
// Requires SheetJS (xlsx) loaded via CDN before this file:
//   <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
// =====================================================================

// Download an .xlsx file from a 2D array of values.
//   filename: e.g. 'leads_2026-04-13.xlsx'
//   sheetName: tab name in the workbook
//   headers: ['Name', 'WhatsApp', ...]
//   rows: array of arrays, one per record
function downloadXlsx(filename, sheetName, headers, rows) {
    if (typeof XLSX === 'undefined') {
        alert('Excel export library failed to load. Please reload the page and try again.');
        return;
    }
    const aoa = [headers].concat(rows || []);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (sheetName || 'Sheet1').slice(0, 31));
    XLSX.writeFile(wb, filename);
}

// Filename helper: 'leads_2026-04-13.xlsx'
function xlsxFilename(prefix) {
    const d = new Date().toISOString().slice(0, 10);
    return prefix + '_' + d + '.xlsx';
}

// Case-insensitive multi-field search. Returns true if `query` matches
// any of the supplied field strings (substring match).
function matchSearch(query, fields) {
    if (!query) return true;
    const q = String(query).trim().toLowerCase();
    if (!q) return true;
    for (let i = 0; i < fields.length; i++) {
        const v = fields[i];
        if (v != null && String(v).toLowerCase().indexOf(q) !== -1) return true;
    }
    return false;
}
