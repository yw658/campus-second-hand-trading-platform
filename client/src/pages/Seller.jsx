import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import ItemCard from '../components/ItemCard';
import '../styles/seller.css';

function humanizeSince(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const t = new Date(dateStr).getTime();
    const days = Math.max(1, Math.floor((now - t) / (1000 * 60 * 60 * 24)));
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} ago`;
}

function Stars({ value = 0, size = 14 }) {
    const full = Math.round(value);
    return (
        <span className="stars" style={{ fontSize: size }}>
      {'★★★★★'.slice(0, full)}
            <span className="stars-dim">{'★★★★★'.slice(full)}</span>
    </span>
    );
}

export default function Seller() {
    const { sellerId } = useParams();

    const [seller, setSeller]   = useState(null);
    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab]         = useState('active'); // active | sold | all | reviews

    // 卖家收到的评价（分页）
    const [reviews, setReviews] = useState([]);
    const [reviewsMeta, setReviewsMeta] = useState({ total: 0, page: 1, pageSize: 20 });
    const [loadingReviews, setLoadingReviews] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const rUser  = await fetch(`/api/users/${sellerId}`);
                if (rUser.ok) setSeller(await rUser.json());

                const rItems = await fetch(`/api/items/seller/${sellerId}?status=all`);
                const data   = rItems.ok ? await rItems.json() : [];
                setItems(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error('Fetch seller page error:', e);
                setItems([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [sellerId]);

    useEffect(() => {
        (async () => {
            try {
                setLoadingReviews(true);
                const r = await fetch(`/api/reviews/seller/${sellerId}?page=1&pageSize=20`);
                const data = r.ok ? await r.json() : { items: [], total: 0, page: 1, pageSize: 20 };
                setReviews(Array.isArray(data.items) ? data.items : []);
                setReviewsMeta({ total: data.total || 0, page: data.page || 1, pageSize: data.pageSize || 20 });
            } catch (e) {
                console.error('Fetch reviews error:', e);
                setReviews([]);
                setReviewsMeta({ total: 0, page: 1, pageSize: 20 });
            } finally {
                setLoadingReviews(false);
            }
        })();
    }, [sellerId]);

    const activeItems = useMemo(() => items.filter(i => !i.isSold), [items]);
    const soldItems   = useMemo(() => items.filter(i =>  i.isSold), [items]);

    const avgRating = useMemo(() => {
        if (!reviews.length) return 0;
        const sum = reviews.reduce((a, b) => a + (b.rating || 0), 0);
        return Math.round((sum / reviews.length) * 10) / 10;
    }, [reviews]);

    const sellerName   = seller?.username || seller?.name || 'Seller';
    const joinedSince  = humanizeSince(seller?.createdAt);
    const soldCount    = seller?.stats?.soldCount ?? soldItems.length;
    const activeCount  = seller?.stats?.activeCount ?? activeItems.length;

    const renderGrid = (arr) =>
        arr.length ? (
            <div className="seller-grid">
                {arr.map(it => <ItemCard key={it._id} item={it} />)}
            </div>
        ) : (
            <div className="seller-empty">No items here.</div>
        );

    const renderReviews = () => {
        if (loadingReviews) return <div className="seller-empty">Loading reviews…</div>;
        if (!reviews.length) return <div className="seller-empty">No reviews yet.</div>;
        return (
            <div className="reviews-list">
                {reviews.map(rv => {
                    const buyerName = rv?.buyer?.username || rv?.buyer?.name || 'Buyer';
                    const itm = rv?.item || {};
                    const thumb = itm.image || (Array.isArray(itm.images) && itm.images[0]) || '';
                    const when = new Date(rv.createdAt).toLocaleDateString();
                    return (
                        <div key={rv._id} className="review-card">
                            <Link to={itm._id ? `/items/${itm._id}` : '#'} className="review-thumb" aria-label="View item">
                                {thumb ? <img src={thumb} alt={itm.title || 'item'} /> : <div className="noimg">📦</div>}
                            </Link>
                            <div className="review-main">
                                <div className="review-row">
                                    <strong className="review-buyer">{buyerName}</strong>
                                    <Stars value={rv.rating} />
                                    <span className="review-date">{when}</span>
                                </div>
                                <div className="review-text">{rv.content || 'No comment.'}</div>
                                {!!itm._id && (
                                    <Link to={`/items/${itm._id}`} className="review-item-link">
                                        {itm.title || 'Item'}
                                    </Link>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="seller-page">
            <div className="seller-header" role="region" aria-label="Seller header">
                <div className="seller-avatar" aria-hidden>👤</div>
                <div className="seller-info">
                    <div className="seller-title" title={sellerName}>{sellerName}</div>

                    <div className="seller-rating-line">
                        <Stars value={avgRating} />
                        <span className="rating-number">{avgRating.toFixed(1)}</span>
                        <span className="rating-count">· {reviewsMeta.total || reviews.length} reviews</span>
                    </div>

                    <div className="seller-sub">
                        Joined {joinedSince || '—'} · Sold {soldCount} · Active {activeCount}
                    </div>
                </div>
            </div>

            <div className="seller-tabs" role="tablist" aria-label="Seller filters">
                <button role="tab" aria-selected={tab === 'active'} className={`seller-tab ${tab === 'active' ? 'is-active' : ''}`} onClick={() => setTab('active')}>
                    Active <span className="badge">{activeItems.length}</span>
                </button>
                <button role="tab" aria-selected={tab === 'sold'} className={`seller-tab ${tab === 'sold' ? 'is-active' : ''}`} onClick={() => setTab('sold')}>
                    Sold <span className="badge">{soldItems.length}</span>
                </button>
                <button role="tab" aria-selected={tab === 'all'} className={`seller-tab ${tab === 'all' ? 'is-active' : ''}`} onClick={() => setTab('all')}>
                    All <span className="badge">{items.length}</span>
                </button>
                <button role="tab" aria-selected={tab === 'reviews'} className={`seller-tab ${tab === 'reviews' ? 'is-active' : ''}`} onClick={() => setTab('reviews')}>
                    Reviews <span className="badge">{reviewsMeta.total || reviews.length}</span>
                </button>
            </div>

            {loading ? (
                <div className="seller-grid">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="seller-skel" />)}
                </div>
            ) : (
                <>
                    {tab === 'active'  && renderGrid(activeItems)}
                    {tab === 'sold'    && renderGrid(soldItems)}
                    {tab === 'all'     && renderGrid(items)}
                    {tab === 'reviews' && renderReviews()}
                </>
            )}
        </div>
    );
}