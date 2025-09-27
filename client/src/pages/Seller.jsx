// client/src/pages/Seller.jsx
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

    // 新增：卖家所有评价
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);

                const rUser  = await fetch(`http://localhost:5002/api/users/${sellerId}`);
                if (rUser.ok) setSeller(await rUser.json());

                const rItems = await fetch(`http://localhost:5002/api/items/seller/${sellerId}?status=all`);
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

    // 拉评价
    useEffect(() => {
        (async () => {
            try {
                setLoadingReviews(true);
                const r = await fetch(`http://localhost:5002/api/reviews/seller/${sellerId}`);
                const list = r.ok ? await r.json() : [];
                setReviews(Array.isArray(list) ? list : []);
            } catch (e) {
                console.error('Fetch reviews error:', e);
                setReviews([]);
            } finally {
                setLoadingReviews(false);
            }
        })();
    }, [sellerId]);

    const activeItems = useMemo(() => items.filter(i => !i.isSold), [items]);
    const soldItems   = useMemo(() => items.filter(i =>  i.isSold), [items]);

    // 计算平均星级
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

    // 评论卡片
    const renderReviews = () => {
        if (loadingReviews) return <div className="seller-empty">Loading reviews…</div>;
        if (!reviews.length) return <div className="seller-empty">No reviews yet.</div>;
        return (
            <div className="reviews-list">
                {reviews.map(rv => {
                    const buyer = rv.buyerId?.username || 'Buyer';
                    const itm   = rv.orderId?.itemId || {};
                    const thumb = itm.image || (Array.isArray(itm.images) && itm.images[0]) || '';
                    const when  = new Date(rv.createdAt).toLocaleDateString();
                    return (
                        <div key={rv._id} className="review-card">
                            <Link to={`/items/${itm._id || ''}`} className="review-thumb" aria-label="View item">
                                {thumb ? <img src={thumb} alt={itm.title || 'item'} /> : <div className="noimg">📦</div>}
                            </Link>
                            <div className="review-main">
                                <div className="review-row">
                                    <strong className="review-buyer">{buyer}</strong>
                                    <Stars value={rv.rating} />
                                    <span className="review-date">{when}</span>
                                </div>
                                <div className="review-text">{rv.comment || 'No comment.'}</div>
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
            {/* 顶部信息 */}
            <div className="seller-header" role="region" aria-label="Seller header">
                <div className="seller-avatar" aria-hidden>👤</div>
                <div className="seller-info">
                    <div className="seller-title" title={sellerName}>{sellerName}</div>

                    {/* 新增：评价汇总行（星级 + 评价数） */}
                    <div className="seller-rating-line">
                        <Stars value={avgRating} />
                        <span className="rating-number">{avgRating.toFixed(1)}</span>
                        <span className="rating-count">· {reviews.length} reviews</span>
                    </div>

                    <div className="seller-sub">
                        Joined {joinedSince || '—'} · Sold {soldCount} · Active {activeCount}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="seller-tabs" role="tablist" aria-label="Seller filters">
                <button
                    role="tab"
                    aria-selected={tab === 'active'}
                    className={`seller-tab ${tab === 'active' ? 'is-active' : ''}`}
                    onClick={() => setTab('active')}
                >
                    Active <span className="badge">{activeItems.length}</span>
                </button>
                <button
                    role="tab"
                    aria-selected={tab === 'sold'}
                    className={`seller-tab ${tab === 'sold' ? 'is-active' : ''}`}
                    onClick={() => setTab('sold')}
                >
                    Sold <span className="badge">{soldItems.length}</span>
                </button>
                <button
                    role="tab"
                    aria-selected={tab === 'all'}
                    className={`seller-tab ${tab === 'all' ? 'is-active' : ''}`}
                    onClick={() => setTab('all')}
                >
                    All <span className="badge">{items.length}</span>
                </button>

                {/* 新增 Reviews 标签 */}
                <button
                    role="tab"
                    aria-selected={tab === 'reviews'}
                    className={`seller-tab ${tab === 'reviews' ? 'is-active' : ''}`}
                    onClick={() => setTab('reviews')}
                >
                    Reviews <span className="badge">{reviews.length}</span>
                </button>
            </div>

            {/* 列表/评论 */}
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