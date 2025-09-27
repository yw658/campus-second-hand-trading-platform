import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchMyOrders, confirmReceived, cancelOrder } from '../api/orders';
import '../styles/orders.css';

/* ---------- 简易星级组件 ---------- */
function StarsInput({ value = 5, onChange }) {
    return (
        <div className="rv-stars" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    className={`rv-star ${n <= value ? 'on' : ''}`}
                    aria-checked={n === value}
                    onClick={() => onChange?.(n)}
                    title={`${n} stars`}
                >
                    ★
                </button>
            ))}
        </div>
    );
}

/* ---------- 评价弹窗 ---------- */
function ReviewModal({ open, onClose, onSubmit, submitting }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (open) {
            setRating(5);
            setComment('');
            // 锁滚
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [open]);

    if (!open) return null;

    return (
        <div className="rv-mask" role="dialog" aria-modal="true" aria-labelledby="rv-title">
            <div className="rv-panel">
                <div className="rv-head" id="rv-title">Leave a review</div>

                <div className="rv-body">
                    <label className="rv-label">Rating</label>
                    <StarsInput value={rating} onChange={setRating} />

                    <label className="rv-label">Comment (optional)</label>
                    <textarea
                        className="rv-textarea"
                        rows={4}
                        placeholder="Share your experience with the seller…"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>

                <div className="rv-foot">
                    <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button
                        className="btn btn--primary"
                        onClick={() => onSubmit?.({ rating, comment })}
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting…' : 'Submit'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MyOrders() {
    const [orders, setOrders] = useState(null);
    const [loading, setLoading] = useState(true);
    const nav = useNavigate();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?._id;
    const token = localStorage.getItem('token');

    // 弹窗状态
    const [openReview, setOpenReview] = useState(false);
    const [reviewOrder, setReviewOrder] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await fetchMyOrders(userId);
                setOrders(Array.isArray(data) ? data : []);
            } catch {
                setOrders([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [userId]);

    const reload = async () => {
        const data = await fetchMyOrders(userId);
        setOrders(Array.isArray(data) ? data : []);
    };

    const onConfirm = async (id) => {
        await confirmReceived(id);
        await reload();
    };

    const onCancel = async (id) => {
        await cancelOrder(id);
        await reload();
    };

    const contactSeller = async (itemId) => {
        try {
            const resp = await fetch('http://localhost:5002/api/convos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ itemId, buyerId: userId }),
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const convo = await resp.json();
            nav(`/chat/${convo._id}`);
        } catch (err) {
            console.error('[MyOrders] contact seller error:', err);
            alert('Failed to open chat.');
        }
    };

    const badgeText = (st) =>
        ({ created: 'Pending', completed: 'Completed', cancelled: 'Cancelled' }[st] || st);

    // 打开弹窗
    const openReviewModal = (order) => {
        setReviewOrder(order);
        setOpenReview(true);
    };

    // 提交评价
    const submitReview = async ({ rating, comment }) => {
        if (!reviewOrder?._id) return;
        try {
            setSubmitting(true);
            const res = await fetch(`http://localhost:5002/api/reviews/${reviewOrder._id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating, comment, buyerId: userId }),
            });
            if (!res.ok) {
                const msg = await res.text().catch(() => '');
                throw new Error(msg || `HTTP ${res.status}`);
            }
            // 乐观更新：标记 Reviewed
            setOrders(list => list.map(o => o._id === reviewOrder._id ? { ...o, reviewed: true } : o));
            setOpenReview(false);
            setReviewOrder(null);
        } catch (e) {
            console.error('[MyOrders] review error:', e);
            alert(e.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="orders-page">
                <div className="orders-header">My Orders</div>
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <div className="orders-page">
            <div className="orders-header">My Orders</div>

            {(orders || []).map((o) => {
                const item = o.itemId || {};
                const itemId = item?._id || o.itemId;
                const canOperate = o.status === 'created';
                const priceNum =
                    typeof o.price === 'number'
                        ? o.price
                        : typeof item?.price === 'number'
                            ? item.price
                            : 0;

                return (
                    <div key={o._id} className="order-card">
                        {/* Left: thumbnail */}
                        <Link to={`/items/${itemId}`} className="order-thumb">
                            <img
                                src={item?.image || item?.images?.[0] || 'https://via.placeholder.com/80x80?text=Item'}
                                alt={item?.title || 'item'}
                            />
                        </Link>

                        {/* Center: title + time + actions */}
                        <div className="order-center">
                            <div className="order-title-row">
                                <Link to={`/items/${itemId}`} className="order-title">
                                    {item?.title || 'Untitled'}
                                </Link>
                                <span className={`order-badge order-badge--${o.status}`}>
                  {badgeText(o.status)}
                </span>
                            </div>

                            <div className="order-sub">{new Date(o.createdAt).toLocaleString()}</div>

                            <div className="order-actions">
                                <button className="btn" onClick={() => contactSeller(itemId)}>
                                    Contact Seller
                                </button>

                                {canOperate && (
                                    <>
                                        <button className="btn btn--primary" onClick={() => onConfirm(o._id)}>
                                            Confirm Received
                                        </button>
                                        <button className="btn btn--ghost" onClick={() => onCancel(o._id)}>
                                            Cancel Order
                                        </button>
                                    </>
                                )}

                                {o.status === 'completed' && !o.reviewed && (
                                    <button className="btn" onClick={() => openReviewModal(o)}>
                                        Leave a Review
                                    </button>
                                )}
                                {o.status === 'completed' && o.reviewed && (
                                    <span className="order-reviewed">Reviewed</span>
                                )}
                            </div>
                        </div>

                        {/* Right: price */}
                        <div className="order-price">${priceNum.toFixed(2)}</div>
                    </div>
                );
            })}

            {(orders || []).length === 0 && (
                <div style={{ color: '#6b7280', marginTop: 16 }}>No orders yet</div>
            )}

            {/* Review Modal */}
            <ReviewModal
                open={openReview}
                onClose={() => setOpenReview(false)}
                onSubmit={submitReview}
                submitting={submitting}
            />
        </div>
    );
}