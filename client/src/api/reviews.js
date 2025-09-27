const BASE = 'http://localhost:5002';

export async function fetchSellerReviewSummary(sellerId) {
    const r = await fetch(`${BASE}/api/reviews/seller/${sellerId}/summary`);
    if (!r.ok) throw new Error('Failed to fetch review summary');
    return r.json();
}

export async function fetchSellerReviews(sellerId, { limit = 10, offset = 0 } = {}) {
    const r = await fetch(`${BASE}/api/reviews/seller/${sellerId}?limit=${limit}&offset=${offset}`);
    if (!r.ok) throw new Error('Failed to fetch reviews');
    return r.json();
}