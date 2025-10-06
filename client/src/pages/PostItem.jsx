import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/form.css';
import { POST_CATEGORY_OPTIONS } from '../utils/categories';
import MultiImageUploader from '../components/MultiImageUploader';

export default function PostItem() {
    const nav = useNavigate();
    const [params] = useSearchParams();
    const editId = params.get('id');
    const isEdit = !!editId;

    const me = JSON.parse(localStorage.getItem('user') || '{}');
    const sellerId = me?._id;
    const token = localStorage.getItem('token');

    const [title, setTitle] = useState('');
    const [brand, setBrand] = useState('');
    const [price, setPrice] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [category, setCategory] = useState('Other');
    const [condition, setCondition] = useState('Like New');
    const [tags, setTags] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        if (!isEdit) return;
        (async () => {
            try {
                setLoading(true);
                const r = await fetch(`/api/items/${editId}`);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const it = await r.json();

                if (String(it?.sellerId?._id || it?.sellerId) !== String(sellerId || '')) {
                    alert('You can only edit your own item.');
                    nav(`/items/${editId}`, { replace: true });
                    return;
                }

                setTitle(it.title || '');
                setBrand(it.brand || '');
                setPrice(it.price != null ? String(it.price) : '');
                setOriginalPrice(it.originalPrice != null ? String(it.originalPrice) : '');
                setCategory(it.category || 'Other');
                setCondition(it.condition || 'Like New');
                setTags(Array.isArray(it.tags) ? it.tags.join(', ') : '');
                setDescription(it.description || '');
                setImages(Array.isArray(it.images) && it.images.length ? it.images : (it.image ? [it.image] : []));
            } catch (e) {
                console.error('[PostItem] load for edit error:', e);
                alert('Failed to load item for editing.');
                nav('/', { replace: true });
            } finally {
                setLoading(false);
            }
        })();
    }, [isEdit, editId, sellerId, nav]);

    const priceNum = useMemo(() => Number(price) || 0, [price]);
    const oriNum = useMemo(() => (originalPrice ? Number(originalPrice) : undefined), [originalPrice]);
    const priceError = useMemo(() => {
        if (oriNum == null) return '';
        if (oriNum < priceNum) return 'Original price cannot be lower than the current price.';
        return '';
    }, [oriNum, priceNum]);

    const onSubmit = async (e) => {
        e.preventDefault();

        if (!sellerId) {
            alert('Please login first.');
            return nav('/login?redirect=/post');
        }

        if (priceError) {
            alert(priceError);
            return;
        }

        const payload = {
            title,
            brand,
            price: Number(price) || 0,
            originalPrice: originalPrice ? Number(originalPrice) : undefined,
            category,
            condition,
            tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
            description,
            images,
            image: images?.[0] || '',
            sellerId,
        };

        try {
            const url = isEdit ? `/api/items/${editId}` : `/api/items`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
                body: JSON.stringify(payload),
            });

            const text = await res.text().catch(() => '');
            if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

            // 成功后跳到详情页
            const data = text ? JSON.parse(text) : null;
            const idToGo = isEdit ? editId : data?._id;
            nav(`/items/${idToGo}`, { replace: true });
        } catch (err) {
            console.error('[PostItem] submit error:', err);
            alert(`Save failed: ${err.message || err}`);
        }
    };

    if (loading) return <div className="form-page"><div className="form-card">Loading…</div></div>;

    return (
        <div className="form-page">
            {/* 顶部标题区 */}
            <div className="form-hero">
                <div className="form-hero__left">
                    <div className="form-hero__emoji">🛒</div>
                    <div>
                        <div className="form-hero__title">{isEdit ? 'Edit item' : 'Post your item'}</div>
                        <div className="form-hero__sub">
                            {isEdit ? 'Update your listing details.' : 'Clear photos and details help you sell faster.'}
                        </div>
                    </div>
                </div>
                <div className="form-hero__right">
                    <button className="btn btn-ghost" type="button" onClick={() => nav(-1)}>Back</button>
                    <button className="btn btn-primary" type="submit" form="post-form">{isEdit ? 'Save' : 'Publish'}</button>
                </div>
            </div>

            <form className="form-card" id="post-form" onSubmit={onSubmit}>
                <section className="form-section">
                    <h3 className="section-title">Basic Info</h3>

                    <div className="grid grid-2">
                        <div className="field">
                            <label className="field-label">Title<span className="req">*</span></label>
                            <input
                                className="field-input"
                                placeholder="What are you selling?"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="field">
                            <label className="field-label">Brand</label>
                            <input
                                className="field-input"
                                placeholder="e.g. Apple, Nike…"
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-3">
                        <div className="field">
                            <label className="field-label">Price<span className="req">*</span></label>
                            <input
                                className="field-input"
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                            <div className="field-help">Final price</div>
                        </div>

                        <div className="field">
                            <label className="field-label">Original Price</label>
                            <input
                                className="field-input"
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                placeholder="Optional"
                                value={originalPrice}
                                onChange={(e) => setOriginalPrice(e.target.value)}
                            />
                            <div className="field-help">
                                {priceError ? <span style={{ color: '#b5121b', fontWeight: 700 }}>{priceError}</span> : 'For reference'}
                            </div>
                        </div>

                        <div className="field">
                            <label className="field-label">Category<span className="req">*</span></label>
                            <select
                                className="field-input field-select"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                            >
                                {POST_CATEGORY_OPTIONS.map(({ group, items }) => (
                                    <optgroup key={group} label={group}>
                                        {items.map((it) => (
                                            <option key={it} value={it}>{it}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-2">
                        <div className="field">
                            <label className="field-label">Condition</label>
                            <select
                                className="field-input field-select"
                                value={condition}
                                onChange={(e) => setCondition(e.target.value)}
                            >
                                {['Brand New', 'Like New', 'Good', 'Fair', 'Poor'].map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label className="field-label">Tags</label>
                            <input
                                className="field-input"
                                placeholder="comma separated, e.g. student, bargain, urgent"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                            />
                            <div className="field-help">Use keywords to improve discoverability</div>
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <h3 className="section-title">Photos</h3>
                    <MultiImageUploader images={images} setImages={setImages} max={9} prefix="items" />
                </section>

                <section className="form-section">
                    <h3 className="section-title">Description</h3>
                    <div className="field">
            <textarea
                className="field-input"
                rows={6}
                placeholder="Brand/model, condition, purchase channel, usage, defects/wear, meet-up method..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />
                    </div>
                    <div className="tips">
                        <div className="tips-title">Tips</div>
                        <ul>
                            <li>Clear photos in good lighting help you sell faster.</li>
                            <li>Be honest about any defects or wear.</li>
                            <li>Use tags that students might search (e.g. “ECE111”, “textbook”).</li>
                        </ul>
                    </div>
                </section>

                <div className="form-actions">
                    <button className="btn btn-primary" type="submit">{isEdit ? 'Save' : 'Publish'}</button>
                    <button className="btn btn-ghost" type="button" onClick={() => nav(-1)}>Cancel</button>
                </div>
            </form>
        </div>
    );
}