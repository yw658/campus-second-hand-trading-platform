const BASE = '';

export async function adminListUsers() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token || ''}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function adminListItems() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/api/admin/items`, {
        headers: { Authorization: `Bearer ${token || ''}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function adminHideItem(itemId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/api/admin/items/${itemId}/hide`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token || ''}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function adminUnhideItem(itemId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/api/admin/items/${itemId}/unhide`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token || ''}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}