import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/theme.css';

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const [q, setQ] = useState('');
    const [unread, setUnread] = useState(0);

    const token = localStorage.getItem('token');
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    const isAuthed = !!token;
    const isAdmin = !!me?.isAdmin;

    // 解析搜索参数
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setQ(params.get('q') || '');
    }, [location.search]);

    // 拉取未读总数
    const fetchUnreadTotal = async () => {
        if (!token) {
            setUnread(0);
            return;
        }
        try {
            const r = await fetch('/api/convos/unread-count', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const d = await r.json().catch(() => ({ count: 0 }));
            setUnread(Number(d?.count || 0));
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        fetchUnreadTotal();
        const t = setInterval(fetchUnreadTotal, 15000);
        const onFocus = () => fetchUnreadTotal();
        window.addEventListener('focus', onFocus);
        return () => {
            clearInterval(t);
            window.removeEventListener('focus', onFocus);
        };
    }, [token]);

    const goSearch = () => {
        const keyword = q.trim();
        navigate({
            pathname: '/',
            search: keyword ? `?q=${encodeURIComponent(keyword)}` : '',
        });
    };
    const onKeyDown = (e) => e.key === 'Enter' && goSearch();

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/', { replace: true });
    };

    const badge = unread > 99 ? '99+' : unread;

    return (
        <header className="wm-header">
            <div className="wm-header__inner">
                {/* Logo */}
                <Link to="/" className="wm-logo">
                    Waikato Market
                </Link>

                {/* Search */}
                <div className="wm-search">
                    <input
                        className="wm-search__input"
                        placeholder="Search items..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={onKeyDown}
                    />
                    <button className="wm-search__btn" onClick={goSearch}>
                        Search
                    </button>
                </div>

                {/* Right actions */}
                <nav className="wm-actions">
                    {!isAdmin && (
                        <Link to="/orders" className="wm-link">
                            Orders
                        </Link>
                    )}

                    {/* Messages + 未读徽标 */}
                    {isAuthed && (
                        <Link to="/chat" className="wm-link wm-link--messages">
                            Messages
                            {unread > 0 && <span className="wm-badge">{badge}</span>}
                        </Link>
                    )}

                    {!isAuthed ? (
                        <Link to="/login" className="wm-cta">
                            Login
                        </Link>
                    ) : (
                        <div className="wm-profile" tabIndex={0}>
              <span className="wm-cta wm-cta--user">
                {me?.username || 'My Profile'}
              </span>
                            <div className="wm-menu" role="menu" aria-label="Profile menu">
                                {isAdmin ? (
                                    <Link
                                        className="wm-menu__item"
                                        to="/admin"
                                        role="menuitem"
                                    >
                                        Admin
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            className="wm-menu__item"
                                            to="/profile"
                                            role="menuitem"
                                        >
                                            My Profile
                                        </Link>
                                        <Link
                                            className="wm-menu__item"
                                            to="/orders"
                                            role="menuitem"
                                        >
                                            Orders
                                        </Link>
                                        <Link
                                            className="wm-menu__item"
                                            to="/chat"
                                            role="menuitem"
                                        >
                                            Messages{' '}
                                            {unread > 0 && (
                                                <span className="wm-badge wm-badge--inline">
                          {badge}
                        </span>
                                            )}
                                        </Link>
                                    </>
                                )}
                                <button
                                    className="wm-menu__logout"
                                    onClick={logout}
                                    role="menuitem"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </nav>
            </div>
        </header>
    );
}