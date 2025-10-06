import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import ItemCard from '../components/ItemCard';
import '../styles/itemDetail.css';
import '../styles/card.css';

import ReportModal from '../components/ReportModal';
import { createReport } from '../api/reports';

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

export default function ItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const userId = user?._id;

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFavorited, setIsFavorited] = useState(false);
    const [busyFav, setBusyFav] = useState(false);

    const [sellerItems, setSellerItems] = useState([]);
    const [seller, setSeller] = useState(null);
    const [activeImg, setActiveImg] = useState('');

    const [openReport, setOpenReport] = useState(false);
    const [reporting, setReporting] = useState(false);

    const ensureAuthed = () => {
        if (!token) {
            const cur = location.pathname + location.search;
            navigate(`/login?redirect=${encodeURIComponent(cur)}`);
            return false;
        }
        return true;
    };

    const thumbs = useMemo(() => {
        if (!item) return [];
        const arr = (Array.isArray(item.images) && item.images.length)
            ? item.images
            : (item.image ? [item.image] : []);
        return arr.filter(Boolean);
    }, [item]);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/items/${id}?userId=${userId || ''}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setItem(data);
                setIsFavorited(!!data.isFavorited);

                const initImgs = (Array.isArray(data.images) && data.images.length)
                    ? data.images.filter(Boolean)
                    : (data.image ? [data.image] : []);
                setActiveImg(initImgs[0] || '');

                const sid = data?.sellerId?._id || data?.sellerId;
                if (sid) {
                    const rUser = await fetch(`/api/users/${sid}`);
                    if (rUser.ok) setSeller(await rUser.json());

                    const rActive = await fetch(`/api/items/seller/${sid}?status=active`);
                    if (rActive.ok) {
                        const list = await rActive.json();
                        setSellerItems((list || []).filter((x) => x._id !== data._id).slice(0, 6));
                    }
                }
            } catch (e) {
                console.error('[ItemDetail] fetch error:', e);
                setItem(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [id, userId]);

    useEffect(() => {
        if (thumbs.length && !thumbs.includes(activeImg)) {
            setActiveImg(thumbs[0]);
        }
    }, [thumbs, activeImg]);

    useEffect(() => {
        const p = new URLSearchParams(location.search);
        if (p.get('report') === '1') setOpenReport(true);
    }, [location.search]);

    const toggleFavorite = async () => {
        if (!ensureAuthed()) return;
        if (!item?._id) return;
        try {
            setBusyFav(true);
            const next = !isFavorited;
            setIsFavorited(next);
            const resp = await fetch('/api/favorites', {
                method: next ? 'POST' : 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userId, itemId: item._id }),
            });
            if (!resp.ok) setIsFavorited(!next);
        } catch {
            setIsFavorited((v) => !v);
        } finally {
            setBusyFav(false);
        }
    };

    const handleBuy = async () => {
        if (!ensureAuthed()) return;
        if (!item || item.isSold) return;
        try {
            const resp = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ itemId: item._id, userId }),
            });
            if (resp.ok) navigate('/orders');
        } catch (e) {
            console.error(e);
        }
    };

    async function handleMessageSeller() {
        if (!ensureAuthed()) return;
        try {
            const itemIdToUse = item?._id || id;
            if (!itemIdToUse) return;
            const resp = await fetch('/api/convos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
                body: JSON.stringify({ itemId: itemIdToUse }),
            });
            if (!resp.ok) return alert(`Create conversation failed (${resp.status}).`);
            const data = await resp.json();
            navigate(`/chat/${data._id}`);
        } catch (e) {
            console.error('[ItemDetail] open convo error:', e);
            alert('Network or server error.');
        }
    }

    // === 删除逻辑 ===
    const handleDelete = async () => {
        if (!item?._id) return;
        if (!window.confirm('Delete this item? This action cannot be undone.')) return;
        try {
            const resp = await fetch(`/api/items/${item._id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token || ''}`
                },
                body: JSON.stringify({ sellerId: userId }),
            });
            if (!resp.ok) throw new Error(await resp.text());
            alert('Item deleted.');
            navigate('/profile');
        } catch (e) {
            console.error('[ItemDetail] delete error:', e);
            alert(e.message || 'Failed to delete');
        }
    };

    if (loading) return <p style={{ padding: 16 }}>Loading...</p>;
    if (!item) return <p style={{ padding: 16 }}>Item not found.</p>;

    const sellerIdForLink = item.sellerId?._id || item.sellerId;
    const isMine = String(sellerIdForLink || '') === String(userId || '');
    const readOnly = !!item.isSold;

    const sellerName = seller?.username || seller?.name || item?.sellerInfo?.username || 'Seller';
    const joinedSince = humanizeSince(seller?.createdAt);
    const soldCount = seller?.stats?.soldCount ?? 0;
    const activeCount = seller?.stats?.activeCount ?? Math.max(0, sellerItems.length + (item?.isSold ? 0 : 1));

    return (
        <div className="item-detail-page">
            <div className="seller-card">
                <div className="seller-avatar">👤</div>
                <div className="seller-info">
                    <div className="seller-name">{sellerName}</div>
                    <div className="seller-meta">
                        Joined {joinedSince || '—'} · Sold {soldCount} · Active {activeCount}
                    </div>
                </div>
                <Link to={`/seller/${sellerIdForLink}`} className="seller-link">
                    Visit shop →
                </Link>
            </div>

            <div className="detail-main">
                <div className="detail-images" style={{ position: 'relative' }}>
                    {!!activeImg && <img className="main-img" src={activeImg} alt={item.title} />}
                    {item.isSold && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.25)', borderRadius: 6
                        }}>
                            <span style={{
                                color: '#fff', fontWeight: 800, fontSize: 18,
                                border: '2px solid #fff', padding: '4px 10px', borderRadius: 6
                            }}>
                                SOLD OUT
                            </span>
                        </div>
                    )}
                    <div className="thumbs">
                        {thumbs.map((src, i) => (
                            <img
                                key={`${src}-${i}`}
                                src={src}
                                alt={`thumb-${i}`}
                                className={src === activeImg ? 'thumb active' : 'thumb'}
                                onClick={() => setActiveImg(src)}
                            />
                        ))}
                    </div>
                </div>

                <div className="detail-info">
                    <h1 className="item-detail__title">{item.title}</h1>
                    <div className="price">
                        ${Number(item.price || 0).toLocaleString()}
                        {item.originalPrice > 0 && item.originalPrice > item.price && (
                            <span style={{
                                marginLeft: 8, color: '#6b7280',
                                textDecoration: 'line-through', fontWeight: 500
                            }}>
                                ${Number(item.originalPrice).toLocaleString()}
                            </span>
                        )}
                    </div>
                    {item.category && <div className="item-detail__meta">Category: {item.category}</div>}
                    {item.brand && <div className="item-detail__meta">Brand: {item.brand}</div>}
                    {item.condition && <div className="item-detail__meta">Condition: {item.condition}</div>}
                    {item.pickup && <div className="item-detail__meta">Pickup: {item.pickup}</div>}

                    <p className="item-detail__desc">{item.description}</p>

                    <div className="actions">
                        {!isMine && !readOnly && !item.isSold && (
                            <button className="btn btn-buy" onClick={handleBuy}>Buy Now</button>
                        )}
                        {!readOnly && (
                            <button className="btn" onClick={toggleFavorite} disabled={busyFav}>
                                {isFavorited ? '❤️ Favorited' : '🤍 Favorite'}
                            </button>
                        )}
                        {!isMine && (
                            <>
                                <button className="btn" onClick={handleMessageSeller}>Message Seller</button>
                                <button className="btn" onClick={() => setOpenReport(true)}>Reports</button>
                            </>
                        )}
                        {isMine && (
                            <>
                                <button className="btn btn-ghost" onClick={() => navigate(`/post?id=${item._id}`)}>Edit</button>
                                <button className="btn btn-ghost" style={{ color: 'red' }} onClick={handleDelete}>Delete</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {sellerItems.length > 0 && (
                <div className="seller-more" style={{ marginTop: 28 }}>
                    <h2>More from this seller</h2>
                    <div className="grid">
                        {sellerItems.map((it) => (
                            <ItemCard key={it._id} item={it} />
                        ))}
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <Link to={`/seller/${sellerIdForLink}`} className="link">View all →</Link>
                    </div>
                </div>
            )}

            <ReportModal open={openReport} onClose={() => setOpenReport(false)} onSubmit={(reason) => createReport({ itemId: item._id, reason })} />
        </div>
    );
}