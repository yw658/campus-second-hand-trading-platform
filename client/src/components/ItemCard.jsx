import { Link } from 'react-router-dom';
import '../styles/card.css';

function condClass(cond = '') {
    const k = cond.toLowerCase();
    if (k.includes('brand new')) return 'is-new';
    if (k.includes('like new')) return 'is-like';
    if (k.includes('good')) return 'is-good';
    if (k.includes('fair')) return 'is-fair';
    if (k.includes('poor')) return 'is-poor';
    return 'is-good';
}

export default function ItemCard({ item }) {
    if (!item) return null;

    const { _id, title, description, category, price, brand, condition, image, isSold } = item;
    const href = isSold ? '#' : `/items/${_id}`;
    const stopIfSold = (e) => {
        if (isSold) e.preventDefault();
    };

    return (
        <Link
            to={href}
            onClick={stopIfSold}
            className={`card ${isSold ? 'card--sold' : ''}`}
            aria-disabled={isSold ? 'true' : 'false'}
        >
            {/* Media */}
            <div className="card__media">
                {condition && (
                    <span className={`badge badge--cond ${condClass(condition)}`}>{condition}</span>
                )}
                <img className="card__img" src={image} alt={title} />
                {isSold && (
                    <div className="card__soldOverlay" aria-label="sold-out">
                        <span className="card__soldTag">SOLD OUT</span>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="card__body">
                <div className="card__title" title={title}>{title}</div>
                {brand && <div className="subtle">{brand}</div>}

                {/* 底部分类 + 价格 */}
                <div className="card__metaRow">
                    <span className="chip chip--cat">{category || 'Other'}</span>
                    <span className="card__price">${Number(price ?? 0).toLocaleString()}</span>
                </div>
            </div>
        </Link>
    );
}