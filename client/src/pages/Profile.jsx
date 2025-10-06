import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ItemCard from '../components/ItemCard';
import '../styles/profile.css';
import '../styles/card.css';

/** Utility: merge className */
function cx(base, active) {
    return active ? `${base} is-active` : base;
}

export default function Profile() {
    const navigate = useNavigate();
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = me?._id;

    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState('posted'); // posted | sold | bought | favorites

    // raw data
    const [sellerItems, setSellerItems] = useState([]);      // items I posted
    const [orders, setOrders] = useState([]);                // orders I bought
    const [favorites, setFavorites] = useState([]);          // my favorites

    // ---- fetch data
    useEffect(() => {
        let cancelled = false;
        if (!userId) return;

        (async () => {
            try {
                setLoading(true);

                // items I posted
                const r1 = await fetch(`/api/items/seller/${userId}`);

                const d1 = await r1.json();

                // orders I bought (backend should populate('itemId'))
                const r2 = await fetch(`/api/orders/user/${userId}`);
                const d2 = await r2.json();

                // my favorites (backend should populate('itemId'))
                const r3 = await fetch(`/api/favorites/${userId}`);
                const d3 = await r3.json();

                if (!cancelled) {
                    setSellerItems(Array.isArray(d1) ? d1 : (Array.isArray(d1?.items) ? d1.items : []));
                    setOrders(Array.isArray(d2) ? d2 : []);
                    setFavorites(Array.isArray(d3) ? d3 : []);
                }
            } catch (e) {
                if (!cancelled) {
                    setSellerItems([]);
                    setOrders([]);
                    setFavorites([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userId]);

    // ---- categorization
    const postedActive   = useMemo(() => sellerItems.filter(i => !i.isSold), [sellerItems]);
    const postedSold     = useMemo(() => sellerItems.filter(i =>  i.isSold), [sellerItems]);

    // filter out cancelled orders
    const activeOrders = useMemo(
        () => (orders || []).filter(o => o.status !== 'cancelled'),
        [orders]
    );

    // handle orders/favorites that might not be populated
    const boughtItems    = useMemo(
        () =>
            activeOrders
                .map(o => (typeof o.itemId === 'object' ? o.itemId : null))
                .filter(Boolean),
        [activeOrders]
    );

    const favoriteItems  = useMemo(
        () =>
            favorites
                .map(f => (typeof f.itemId === 'object' ? f.itemId : null))
                .filter(Boolean),
        [favorites]
    );

    // switch tab
    const switchTab = (key) => setActive(key);

    // render item grid
    const renderGrid = (arr) => {
        if (!arr || arr.length === 0) return <div className="pf-empty">No items here yet.</div>;
        return (
            <div className="pf-grid">
                {arr.map(it => <ItemCard key={it._id} item={it} />)}
            </div>
        );
    };

    // redirect if not logged in
    if (!userId) {
        navigate('/login?redirect=/profile', { replace: true });
        return null;
    }

    return (
        <div className="pf-layout">
            {/* Sidebar */}
            <aside className="pf-sidebar">
                <div className="pf-side-title">My Trades</div>
                <button className={cx('pf-side-item', active === 'posted')} onClick={() => switchTab('posted')}>I Posted</button>
                <button className={cx('pf-side-item', active === 'sold')}   onClick={() => switchTab('sold')}>I Sold</button>
                <button className={cx('pf-side-item', active === 'bought')} onClick={() => switchTab('bought')}>I Bought</button>

                <div className="pf-side-title" style={{ marginTop: 12 }}>Collections</div>
                <button className={cx('pf-side-item', active === 'favorites')} onClick={() => switchTab('favorites')}>My Favorites</button>
            </aside>

            {/* Main Section */}
            <section>
                {/* Hero */}
                <div className="pf-hero">
                    <div>
                        <div className="pf-name">{me?.username || 'My Profile'}</div>
                        <div className="pf-sub">
                            Posted {sellerItems.length} · Sold {postedSold.length} · Bought {boughtItems.length} · Favorites {favoriteItems.length}
                        </div>
                    </div>
                    <Link to="/post" className="pf-btn pf-btn--primary">Post Item</Link>
                </div>

                {/* Tabs with counts */}
                <div className="pf-tabs">
                    <button className={cx('pf-tab', active === 'posted')} onClick={() => switchTab('posted')}>
                        For Sale <span>{postedActive.length}</span>
                    </button>
                    <button className={cx('pf-tab', active === 'sold')} onClick={() => switchTab('sold')}>
                        Sold <span>{postedSold.length}</span>
                    </button>
                    <button className={cx('pf-tab', active === 'bought')} onClick={() => switchTab('bought')}>
                        Bought <span>{boughtItems.length}</span>
                    </button>
                    <button className={cx('pf-tab', active === 'favorites')} onClick={() => switchTab('favorites')}>
                        Favorites <span>{favoriteItems.length}</span>
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="pf-grid">
                        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="pf-skel" />)}
                    </div>
                ) : (
                    <>
                        {active === 'posted'    && renderGrid(sellerItems)}
                        {active === 'sold'      && renderGrid(postedSold)}
                        {active === 'bought'    && renderGrid(boughtItems)}
                        {active === 'favorites' && renderGrid(favoriteItems)}
                    </>
                )}
            </section>
        </div>
    );
}