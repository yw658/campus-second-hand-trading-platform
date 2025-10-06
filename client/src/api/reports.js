const BASE = '';

export async function createReport({ itemId, reason }) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ itemId, reason }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function fetchReports(status = 'pending') {
    const token = localStorage.getItem('token');
    const url = `${BASE}/api/reports${status ? `?status=${encodeURIComponent(status)}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token || ''}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function resolveReport(id) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/api/admin/reports/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function dismissReport(id) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/api/admin/reports/${id}/dismiss`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}