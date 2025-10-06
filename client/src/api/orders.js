const BASE = '';

export async function fetchMyOrders(userId) {
    const res = await fetch(`${BASE}/api/orders/user/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
}

export async function confirmReceived(orderId) {
    const res = await fetch(`${BASE}/api/orders/${orderId}/confirm-received`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to confirm received');
    return res.json();
}

export async function cancelOrder(orderId) {
    const res = await fetch(`${BASE}/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to cancel order');
    return res.json();
}