// backend/routes/items.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Item = require('../models/Item');
const Favorite = require('../models/Favorite');

/* ========================
 *  分类映射 / 工具
 * =======================*/

// 父类包含自身，便于 $in
const CATEGORY_TREE = {
    // Electronics family
    Electronics: ['Electronics', 'Phones', 'Laptops', 'Tablets', 'Cameras', 'Headphones', 'Consoles', 'Gaming'],
    Phones: ['Phones'],
    Laptops: ['Laptops'],
    Tablets: ['Tablets'],
    Cameras: ['Cameras'],
    Headphones: ['Headphones'],
    Consoles: ['Consoles'],
    Gaming: ['Gaming'],

    // Books
    Books: ['Books', 'Textbooks'],
    Textbooks: ['Textbooks'],

    // Home & Living
    Home: ['Home', 'Furniture', 'Appliances'],
    Furniture: ['Furniture'],
    Appliances: ['Appliances'],

    // Sports & Outdoor
    Sports: ['Sports', 'Outdoors', 'Bikes'],
    Outdoors: ['Outdoors'],
    Bikes: ['Bikes'],

    // Others (互不包含)
    Clothing: ['Clothing'],
    Shoes: ['Shoes'],
    Beauty: ['Beauty'],
    Instruments: ['Instruments'],
    Tickets: ['Tickets'],
    Other: ['Other'],
};

// 主类清单（用于 Other 特例）
const ALL_MAIN_CATS = Object.keys(CATEGORY_TREE);

// 别名/型号 → 主类（注意：iphone 在 NEVER_MAP 中禁掉映射）
const ALIAS_TO_MAIN = {
    // Books
    book: 'Books', books: 'Books',
    textbook: 'Textbooks', textbooks: 'Textbooks',

    // Electronics family
    electronic: 'Electronics', electronics: 'Electronics', gadget: 'Electronics',
    phone: 'Phones', phones: 'Phones', android: 'Phones', smartphone: 'Phones', galaxy: 'Phones',
    laptop: 'Laptops', laptops: 'Laptops', notebook: 'Laptops', notebooks: 'Laptops', macbook: 'Laptops',
    tablet: 'Tablets', tablets: 'Tablets', ipad: 'Tablets',
    camera: 'Cameras', cameras: 'Cameras', dslr: 'Cameras',
    headphone: 'Headphones', headphones: 'Headphones', earphone: 'Headphones', earbuds: 'Headphones', headset: 'Headphones',
    console: 'Consoles', consoles: 'Consoles', 'game console': 'Consoles',

    // Gaming
    game: 'Gaming', games: 'Gaming', gaming: 'Gaming', 'pc gaming': 'Gaming', steam: 'Gaming',

    // Fashion
    clothing: 'Clothing', cloth: 'Clothing', clothes: 'Clothing', apparel: 'Clothing',
    shoe: 'Shoes', shoes: 'Shoes', sneaker: 'Shoes', sneakers: 'Shoes', boots: 'Shoes',

    // Beauty
    beauty: 'Beauty', makeup: 'Beauty', skincare: 'Beauty', cosmetics: 'Beauty',

    // Home & Living
    home: 'Home', kitchen: 'Home', decor: 'Home',
    furniture: 'Furniture', desk: 'Furniture', chair: 'Furniture', sofa: 'Furniture', table: 'Furniture', wardrobe: 'Furniture',
    appliance: 'Appliances', appliances: 'Appliances', microwave: 'Appliances', fridge: 'Appliances', refrigerator: 'Appliances', vacuum: 'Appliances', washer: 'Appliances',

    // Sports & Outdoor
    sport: 'Sports', sports: 'Sports', ball: 'Sports', racket: 'Sports',
    outdoor: 'Outdoors', outdoors: 'Outdoors', camp: 'Outdoors', camping: 'Outdoors', hike: 'Outdoors', hiking: 'Outdoors', tent: 'Outdoors',
    bike: 'Bikes', bicycle: 'Bikes', ebike: 'Bikes',

    // Instruments/Tickets
    instrument: 'Instruments', instruments: 'Instruments', guitar: 'Instruments', piano: 'Instruments', violin: 'Instruments',
    ticket: 'Tickets', tickets: 'Tickets', voucher: 'Tickets', pass: 'Tickets',

    other: 'Other', misc: 'Other',
};

// 这些词即使在 ALIAS_TO_MAIN 里，也不做类目映射（“只当关键词”）
const NEVER_MAP = new Set(['iphone']);

const toKey = (s='') => String(s).trim().toLowerCase();
const toTitleCase = (s='') => {
    s = String(s || '').trim();
    if (!s) return 'Other';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

// 创建时分类规范化
function normalizeCategory(raw) {
    const c = toTitleCase(raw);
    return CATEGORY_TREE[c] ? c : 'Other';
}

// 搜索词 → 主类名（如 "textbook"→"Textbooks"，否则 ''）
function normalizeCategoryFromSearch(raw) {
    if (!raw) return '';
    const k = toKey(raw);
    if (NEVER_MAP.has(k)) return '';
    if (ALIAS_TO_MAIN[k]) return ALIAS_TO_MAIN[k];
    const stem = k.endsWith('s') ? k.slice(0, -1) : k;
    if (NEVER_MAP.has(stem)) return '';
    if (ALIAS_TO_MAIN[stem]) return ALIAS_TO_MAIN[stem];
    const direct = ALL_MAIN_CATS.find((x) => toKey(x) === k);
    return direct || '';
}

// 转义正则元字符
function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 构建“词边界”正则。
 * - 默认只匹配独立单词，避免 switch→switches 的误命中
 * - token === 'iphone' 时，允许常见型号后缀（14 / Pro / Pro Max / SE / XR / XS Max 等）
 */
function buildWordRegex(q, { allowSimplePlural = true } = {}) {
    const token = String(q).trim();
    const core = escapeRe(token);

    if (token.toLowerCase() === 'iphone') {
        const suffix =
            '(?:\\s*[\\-/]?\\s*(?:' +
            '\\d{1,2}' +                 // 10~15 等
            '|se\\s*\\d?' +              // SE / SE2
            '|x|xr|xs(?:\\s*max)?' +     // X / XR / XS / XS Max
            '|plus|max|mini' +           // Plus / Max / Mini
            '|pro(?:\\s*max)?' +         // Pro / Pro Max
            '))?';
        return new RegExp(`(^|[^A-Za-z0-9])${core}${suffix}($|[^A-Za-z0-9])`, 'i');
    }

    let tail = '';
    if (allowSimplePlural) {
        if (/(ch|sh|x|z)$/i.test(core)) tail = '(es)?';
        else tail = 's?';
    }
    return new RegExp(`(^|[^A-Za-z0-9])${core}${tail}($|[^A-Za-z0-9])`, 'i');
}

/** 普通类目与 Other 特例过滤 */
function buildCategoryFilterObject(wanted) {
    if (wanted !== 'Other') {
        const cats = CATEGORY_TREE[wanted] || [wanted];
        return { category: { $in: cats } };
    }
    return {
        $or: [
            { category: { $exists: false } },
            { category: '' },
            { category: { $regex: /^other$/i } },
            { category: { $nin: ALL_MAIN_CATS } },
        ],
    };
}

/* ========================
 *  路由
 * =======================*/

/* ========== Create Item ========== */
router.post('/', async (req, res) => {
    try {
        const {
            title,
            description = '',
            category = 'Other',
            price,
            originalPrice,
            brand = '',
            condition = 'Good',
            location = '',
            warranty = false,
            tags = [],
            image = '',
            images = [],
            sellerId, // 必须
        } = req.body || {};

        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({ message: 'sellerId is required' });
        }
        if (!title || typeof price === 'undefined' || price === null) {
            return res.status(400).json({ message: 'title and price are required' });
        }

        const normCategory = normalizeCategory(category);

        const doc = await Item.create({
            title,
            description,
            category: normCategory,
            price,
            originalPrice,
            brand,
            condition,
            location,
            warranty,
            tags,
            image: image || (Array.isArray(images) && images[0]) || '',
            images: Array.isArray(images) ? images : [],
            sellerId: new mongoose.Types.ObjectId(sellerId),
        });

        return res.status(201).json(doc);
    } catch (err) {
        console.error('[POST /api/items] create error:', err);
        if (err?.name === 'ValidationError') {
            return res.status(400).json({ message: err.message });
        }
        return res.status(500).json({ message: 'Failed to create item' });
    }
});

/* ========== 列表（支持 forYou；售出排后；含 Other 兜底） ========== */
// GET /api/items?search=&category=&page=&pageSize=&sort=&strict=0
router.get('/', async (req, res) => {
    try {
        const {
            search = '',
            category = '',
            page = 1,
            pageSize = 12,
            sort = 'latest',
            strict = '0',
        } = req.query;

        // 轻日志看清前端到底传了什么
        console.log('[GET /api/items] q=', { search, category, page, pageSize, sort, strict });

        const p = Math.max(parseInt(page, 10) || 1, 1);
        const ps = Math.min(Math.max(parseInt(pageSize, 10) || 12, 1), 48);
        const simplePlural = strict !== '1';

        // 基础过滤：排除被举报/隐藏
        const baseFilter = { isReported: { $ne: true }, isHidden: { $ne: true } };

        // 分类参数（父类包含子类；Other 有特例）
        let explicitWanted = '';
        if (category) {
            explicitWanted = toTitleCase(category);
            Object.assign(baseFilter, buildCategoryFilterObject(explicitWanted));
        }

        // 统一排序：未售优先
        let sortSpec;
        if (sort === 'priceAsc') sortSpec = { isSold: 1, price: 1, createdAt: -1 };
        else if (sort === 'priceDesc') sortSpec = { isSold: 1, price: -1, createdAt: -1 };
        else if (sort === 'forYou') sortSpec = { isSold: 1, createdAt: -1 };
        else sortSpec = { isSold: 1, createdAt: -1 };

        // 无搜索词
        if (!search.trim()) {
            const [items, total] = await Promise.all([
                Item.find(baseFilter).sort(sortSpec).skip((p - 1) * ps).limit(ps),
                Item.countDocuments(baseFilter),
            ]);

            // 兜底：forYou + （明确要 Other）且结果空 → 用 Other 特例再查一次
            if (sort === 'forYou' && (!items || items.length === 0) && explicitWanted === 'Other') {
                const otherFilter = { isReported: { $ne: true }, isHidden: { $ne: true }, ...buildCategoryFilterObject('Other') };
                const [f2, t2] = await Promise.all([
                    Item.find(otherFilter).sort(sortSpec).skip((p - 1) * ps).limit(ps),
                    Item.countDocuments(otherFilter),
                ]);
                return res.json({ page: p, pageSize: ps, total: t2, items: f2 });
            }

            return res.json({ page: p, pageSize: ps, total, items });
        }

        // 搜索词 → 是否映射为类目
        const mapped = normalizeCategoryFromSearch(search);
        if (mapped) {
            const mappedFilter = buildCategoryFilterObject(mapped);
            const filter = category ? { $and: [baseFilter, mappedFilter] } : { ...baseFilter, ...mappedFilter };

            let [items, total] = await Promise.all([
                Item.find(filter).sort(sortSpec).skip((p - 1) * ps).limit(ps),
                Item.countDocuments(filter),
            ]);

            // 兜底：forYou +（显式要 Other 或 搜索映射到 Other）且结果空 → 再用 Other 特例
            if (sort === 'forYou' && (!items || items.length === 0) && (explicitWanted === 'Other' || mapped === 'Other')) {
                const otherFilter = { isReported: { $ne: true }, isHidden: { $ne: true }, ...buildCategoryFilterObject('Other') };
                const [f2, t2] = await Promise.all([
                    Item.find(otherFilter).sort(sortSpec).skip((p - 1) * ps).limit(ps),
                    Item.countDocuments(otherFilter),
                ]);
                items = f2; total = t2;
            }

            return res.json({ page: p, pageSize: ps, total, items });
        }

        // 普通关键词：仅在【标题/品牌】做词边界（多词 AND；支持 "短语"）
        const phraseMatches = [...search.matchAll(/"([^"]+)"/g)].map(m => m[1].trim()).filter(Boolean);
        const rest = search.replace(/"[^"]*"/g, ' ').trim();
        const words = rest.split(/\s+/).filter(Boolean);
        const tokens = [...phraseMatches, ...words];
        if (!tokens.length) {
            return res.json({ page: p, pageSize: ps, total: 0, items: [] });
        }

        const tokenRegexes = tokens.map(tok => buildWordRegex(tok, { allowSimplePlural: simplePlural }));
        const andConds = tokenRegexes.map(rx => ({
            $or: [
                { title: { $regex: rx } },
                { brand: { $regex: rx } },
            ]
        }));

        let filter = { ...baseFilter, $and: andConds };

        let [items, total] = await Promise.all([
            Item.find(filter).sort(sortSpec).skip((p - 1) * ps).limit(ps),
            Item.countDocuments(filter),
        ]);

        // 兜底：forYou + 明确要 Other（通过 category=Other 传入）且结果空 → Other 特例再查一次
        if (sort === 'forYou' && (!items || items.length === 0) && explicitWanted === 'Other') {
            const otherFilter = { isReported: { $ne: true }, isHidden: { $ne: true }, ...buildCategoryFilterObject('Other') };
            const [f2, t2] = await Promise.all([
                Item.find(otherFilter).sort(sortSpec).skip((p - 1) * ps).limit(ps),
                Item.countDocuments(otherFilter),
            ]);
            items = f2; total = t2;
        }

        return res.json({ page: p, pageSize: ps, total, items });

    } catch (err) {
        console.error('Fetch items error:', err);
        res.status(500).json({ message: 'Failed to fetch items' });
    }
});

/* ========== For You 专用（前端 For You 卡片用） ========== */
// GET /api/items/for-you?category=Other&size=8
router.get('/for-you', async (req, res) => {
    try {
        const { category = '', size = '8' } = req.query;
        console.log('[GET /api/items/for-you] q=', { category, size });

        const n = Math.min(Math.max(parseInt(size, 10) || 8, 1), 24);

        const baseFilter = { isReported: { $ne: true }, isHidden: { $ne: true } };

        if (category) {
            const wanted = toTitleCase(category);
            Object.assign(baseFilter, buildCategoryFilterObject(wanted));
        }

        let items = await Item.find(baseFilter)
            .sort({ isSold: 1, createdAt: -1 })
            .limit(n)
            .lean();

        // 兜底：明确要 Other 但结果为空 → 再用 Other 特例（防止大小写/拼写异）
        if ((!items || items.length === 0) && toTitleCase(category) === 'Other') {
            const otherFilter = { isReported: { $ne: true }, isHidden: { $ne: true }, ...buildCategoryFilterObject('Other') };
            items = await Item.find(otherFilter)
                .sort({ isSold: 1, createdAt: -1 })
                .limit(n)
                .lean();
        }

        res.json(items);
    } catch (err) {
        console.error('[GET /api/items/for-you] error:', err);
        res.status(500).json({ message: 'Failed to fetch for-you items' });
    }
});

/* ========== Items by Seller（未售优先） ========== */
// GET /api/items/seller/:sellerId?status=active|sold|all
router.get('/seller/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { status } = req.query;

        if (!mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({ message: 'Invalid sellerId' });
        }

        const filter = {
            sellerId: new mongoose.Types.ObjectId(sellerId),
            isReported: { $ne: true },
            isHidden: { $ne: true },
        };
        if (status === 'active') filter.isSold = false;
        if (status === 'sold')   filter.isSold = true;

        const items = await Item.find(filter).sort({ isSold: 1, createdAt: -1 });
        res.json(items);
    } catch (err) {
        console.error('Fetch seller items error:', err.message);
        res.status(500).json({ message: 'Failed to fetch seller items' });
    }
});

/* ========== Detail (with isFavorited) ========== */
// GET /api/items/:id?userId=xxx
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid item id' });
        }

        const item = await Item.findById(id)
            .populate('sellerId', 'username name createdAt')
            .lean();
        if (!item) return res.status(404).json({ message: 'Item not found' });

        let isFavorited = false;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const fav = await Favorite.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                itemId: new mongoose.Types.ObjectId(id),
            });
            isFavorited = !!fav;
        }

        res.json({ ...item, isFavorited });
    } catch (err) {
        console.error('Fetch item detail error:', err.message);
        res.status(500).json({ message: 'Failed to fetch item' });
    }
});

module.exports = router;