import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ItemCard from '../components/ItemCard';
import '../styles/card.css';
import '../styles/home.css';
import { belongsToCategory } from '../utils/categories';

const CATEGORIES = [
    { key: 'Books', label: 'Books', icon: '📚' },
    { key: 'Textbooks', label: 'Textbooks', icon: '📖' },

    { key: 'Electronics', label: 'Electronics', icon: '💻' },
    { key: 'Phones', label: 'Phones', icon: '📱' },
    { key: 'Laptops', label: 'Laptops', icon: '💼' },
    { key: 'Tablets', label: 'Tablets', icon: '📟' },
    { key: 'Cameras', label: 'Cameras', icon: '📷' },
    { key: 'Headphones', label: 'Headphones', icon: '🎧' },
    { key: 'Consoles', label: 'Consoles', icon: '🕹️' },
    { key: 'Gaming', label: 'Gaming', icon: '🎮' },

    { key: 'Clothing', label: 'Clothing', icon: '👕' },
    { key: 'Shoes', label: 'Shoes', icon: '👟' },
    { key: 'Beauty', label: 'Beauty', icon: '💄' },

    { key: 'Home', label: 'Home', icon: '🏠' },
    { key: 'Furniture', label: 'Furniture', icon: '🛋️' },
    { key: 'Appliances', label: 'Appliances', icon: '🧺' },

    { key: 'Sports', label: 'Sports', icon: '⚽' },
    { key: 'Outdoors', label: 'Outdoors', icon: '🏕️' },
    { key: 'Bikes', label: 'Bikes', icon: '🚲' },

    { key: 'Instruments', label: 'Instruments', icon: '🎸' },
    { key: 'Tickets', label: 'Tickets', icon: '🎫' },
    { key: 'Other', label: 'Other', icon: '🎲' },
];

const SUGGESTIONS = ['iPhone', 'Switch', 'Textbook', 'Shoes', 'Headphones'];

function QuickChips({ onPick }) {
    return (
        <div className="chips-row">
            {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => onPick(s)}>
                    {s}
                </button>
            ))}
        </div>
    );
}

function HeroCard({ onPost }) {
    return (
        <div className="hero-card">
            <div>
                <div className="hero-card__title">Welcome to Waikato Market</div>
                <div className="hero-card__sub">Buy & sell second-hand goods with students nearby.</div>
                <button className="hero-card__btn hero-card__btn--lg" onClick={onPost}>
                    Post your item now
                </button>
            </div>
            <div className="hero-card__emoji">🛒</div>
        </div>
    );
}

function RecommendRow({ items, activeCat }) {
    const [tab, setTab] = useState('foryou');
    const base = useMemo(() => items.filter((it) => !it.isSold), [items]);

    const view = useMemo(() => {
        const arr = [...base];
        if (tab === 'popular') return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)).slice(0, 12);
        if (tab === 'latest')
            return arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 12);

        const pool = activeCat ? arr.filter((it) => belongsToCategory(it, activeCat)) : arr;
        for (let i = pool.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, 12);
    }, [base, tab, activeCat]);

    return (
        <section className="rec-wrap">
            <div className="rec-head">
                <div className="rec-tabs">
                    <button className={`rec-tab ${tab === 'foryou' ? 'is-active' : ''}`} onClick={() => setTab('foryou')}>
                        For You
                    </button>
                    <button className={`rec-tab ${tab === 'popular' ? 'is-active' : ''}`} onClick={() => setTab('popular')}>
                        Popular
                    </button>
                    <button className={`rec-tab ${tab === 'latest' ? 'is-active' : ''}`} onClick={() => setTab('latest')}>
                        Latest
                    </button>
                </div>
            </div>

            <div className="rec-scroller">
                {view.map((it) => (
                    <a key={it._id} className="rec-card" href={`/items/${it._id}`}>
                        <div className="rec-thumb">
                            <img src={it.image} alt={it.title} />
                        </div>
                        <div className="rec-info">
                            <div className="rec-title" title={it.title}>
                                {it.title}
                            </div>
                            <div className="rec-meta">
                                <span className="rec-price">${Number(it.price || 0).toLocaleString()}</span>
                                <span className="rec-cat">{it.category || 'Other'}</span>
                            </div>
                        </div>
                    </a>
                ))}
                {!view.length && <div style={{ color: '#6b7280', padding: '8px 0' }}>No data</div>}
            </div>
        </section>
    );
}

function GridSkeleton() {
    return (
        <div className="grid">
            {Array.from({ length: 6 }).map((_, i) => (
                <div className="skeleton-card" key={i} />
            ))}
        </div>
    );
}

function useQuerySearch(location) {
    const [q, setQ] = useState(new URLSearchParams(location.search).get('q') || '');
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const keyword = params.get('q') || '';
        setQ(keyword);
    }, [location.search]);
    return [q, setQ];
}

export default function Home() {
    const location = useLocation();
    const navigate = useNavigate();

    const PAGE_SIZE = 12;

    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [q, setQ] = useQuerySearch(location);
    const [activeCat, setActiveCat] = useState('');
    const [sort, setSort] = useState('latest');

    const isSearchMode = !!q.trim();
    const hasMore = page < pages;

    useEffect(() => {
        if (q && activeCat) {
            setActiveCat('');
        }
    }, [q]);

    useEffect(() => {
        setLoading(true);
        setPage(1);
        setItems([]);
    }, [q, activeCat, sort]);

    useEffect(() => {
        let aborted = false;

        (async () => {
            try {
                const params = new URLSearchParams();
                params.set('page', String(page));
                params.set('pageSize', String(PAGE_SIZE));
                params.set('sort', sort);

                const kw = q.trim();
                if (kw) params.set('search', kw);
                if (activeCat) params.set('category', activeCat);

                console.log('[GET /api/items] params=', params.toString());

                const res = await fetch(`/api/items?${params.toString()}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

                const totalVal = Number.isFinite(data?.total) ? data.total : page === 1 ? list.length : total;
                const pagesVal = Number.isFinite(data?.pages)
                    ? data.pages
                    : Math.max(1, Math.ceil((totalVal || 0) / PAGE_SIZE));

                if (aborted) return;
                setItems((prev) => (page === 1 ? list : [...prev, ...list]));
                setTotal(totalVal);
                setPages(pagesVal);
            } catch (e) {
                if (!aborted) {
                    console.error('[Home] fetch error:', e);
                    setItems([]);
                    setTotal(0);
                    setPages(1);
                }
            } finally {
                if (!aborted) setLoading(false);
            }
        })();

        return () => {
            aborted = true;
        };
    }, [page, q, activeCat, sort]);

    const pickChip = (word) => {
        setActiveCat('');
        navigate({ pathname: '/', search: `?q=${encodeURIComponent(word)}` });
    };

    return (
        <div className="home-wrap">
            <QuickChips onPick={pickChip} />

            <div className="home-layout">
                <aside className="categories">
                    {CATEGORIES.map((c) => (
                        <div
                            key={c.key}
                            className={`cat-item ${activeCat === c.key ? 'cat-item--active' : ''}`}
                            onClick={() => {
                                const next = activeCat === c.key ? '' : c.key;
                                setLoading(true);
                                setItems([]);
                                setPage(1);
                                setActiveCat(next);
                                setQ('');
                                navigate('/');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        >
                            <span className="cat-icon">{c.icon}</span>
                            <span className="cat-label">{c.label}</span>
                        </div>
                    ))}
                </aside>

                <main className="home-main">
                    <HeroCard onPost={() => navigate('/post')} />

                    <RecommendRow items={items} activeCat={activeCat} />

                    <div className="section-head">
                        <h2 className="section-title">
                            {isSearchMode ? <>Search results for “{q}”</> : activeCat ? activeCat : 'All Items'}
                        </h2>
                        <div className="section-meta">
                            {(Number.isFinite(total) && total !== 0 ? total : items.length)} result
                            {(Number.isFinite(total) ? total : items.length) === 1 ? '' : 's'}
                        </div>
                    </div>

                    {loading ? (
                        <GridSkeleton />
                    ) : items.length > 0 ? (
                        <div className="grid">
                            {items.map((it) => (
                                <ItemCard key={it._id} item={it} />
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: '#6b7280', textAlign: 'center', margin: '20px 0' }}>
                            No items found.
                            {q && <div style={{ fontSize: '13px' }}>Try another keyword or category.</div>}
                        </div>
                    )}

                    <div style={{ textAlign: 'center', margin: '16px 0' }}>
                        {hasMore ? (
                            <button className="chip" disabled={loading} onClick={() => setPage((p) => p + 1)}>
                                {loading ? 'Loading…' : 'Load more'}
                            </button>
                        ) : (
                            !!items.length && <span style={{ color: '#888' }}>No more items</span>
                        )}
                    </div>
                </main>
            </div>

            <button className="sell-fab" onClick={() => navigate('/post')} aria-label="sell">
                Post
            </button>
        </div>
    );
}