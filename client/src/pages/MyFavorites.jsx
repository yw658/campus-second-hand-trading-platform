import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ItemCard from '../components/ItemCard';
import '../styles/favorites.css';

export default function MyFavorites() {
    const [favorites, setFavorites] = useState(null); // Favorite[]
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token || !user?._id) {
            navigate('/login?redirect=/favorites', { replace: true });
            return;
        }

        (async () => {
            try {
                // ✅ 注意：后端是 /api/favorites/:userId
                const res = await fetch(`http://localhost:5002/api/favorites/${user._id}`, {
                    // 你后端这个接口不强制鉴权，如果你需要可解开：
                    // headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                setFavorites(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error(e);
                setFavorites([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [user?._id, token, navigate]);

    if (loading) return <p>Loading...</p>;

    // 把 Favorite[] -> Item[]（有可能有空 itemId，比如商品被删）
    const items = (favorites || [])
        .map(f => f.itemId)
        .filter(Boolean);

    return (
        <div>
            <h2 className="favorites-header">My Favorites</h2>

            {items.length === 0 ? (
                <p style={{ color: '#6b7280' }}>
                    No favorites yet. Go <a href="/">explore items</a>!
                </p>
            ) : (
                <div className="favorites-grid">
                    {items.map(it => (
                        <ItemCard key={it._id} item={it} />
                    ))}
                </div>
            )}
        </div>
    );
}