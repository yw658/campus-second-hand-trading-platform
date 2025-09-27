// client/src/utils/categories.js

/** 顶部/侧边栏/搜索使用的“主类”清单（展示顺序） */
export const HOME_CATEGORIES = [
    'Books', 'Textbooks',
    'Electronics', 'Phones', 'Laptops', 'Tablets', 'Cameras', 'Headphones',
    'Consoles', 'Gaming',
    'Clothing', 'Shoes', 'Beauty',
    'Home', 'Furniture', 'Appliances',
    'Sports', 'Outdoors', 'Bikes',
    'Instruments', 'Tickets',
    'Other',
];

/** PostItem 下拉的分组选项（用于表单选择） */
export const POST_CATEGORY_OPTIONS = [
    { group: 'Books', items: ['Books', 'Textbooks'] },
    { group: 'Electronics', items: ['Electronics', 'Phones', 'Laptops', 'Tablets', 'Cameras', 'Headphones', 'Consoles', 'Gaming'] },
    { group: 'Fashion', items: ['Clothing', 'Shoes', 'Beauty'] },
    { group: 'Home & Living', items: ['Home', 'Furniture', 'Appliances'] },
    { group: 'Sports & Outdoor', items: ['Sports', 'Outdoors', 'Bikes'] },
    { group: 'Others', items: ['Instruments', 'Tickets', 'Other'] },
];

/* ========================
 *   语义映射 & 父子关系
 * =======================*/

/** 搜索/标题里的常见别名 → 主类 */
const ALIAS_TO_MAIN = {
    // Books
    book: 'Books', books: 'Books',
    textbook: 'Textbooks', textbooks: 'Textbooks',

    // Electronics family
    electronic: 'Electronics', electronics: 'Electronics', gadget: 'Electronics',
    phone: 'Phones', phones: 'Phones', iphone: 'Phones', android: 'Phones', smartphone: 'Phones', galaxy: 'Phones',
    laptop: 'Laptops', laptops: 'Laptops', notebook: 'Laptops', notebooks: 'Laptops', macbook: 'Laptops',
    tablet: 'Tablets', tablets: 'Tablets', ipad: 'Tablets',
    camera: 'Cameras', cameras: 'Cameras', dslr: 'Cameras',
    headphone: 'Headphones', headphones: 'Headphones', earphone: 'Headphones', earbuds: 'Headphones', headset: 'Headphones',
    console: 'Consoles', consoles: 'Consoles', 'game console': 'Consoles',
    switch: 'Consoles', nintendo: 'Consoles', ps4: 'Consoles', ps5: 'Consoles', xbox: 'Consoles',
    game: 'Gaming', games: 'Gaming', gaming: 'Gaming', 'pc gaming': 'Gaming', steam: 'Gaming',

    // Fashion（严格区分：Clothing ≠ Beauty）
    clothing: 'Clothing', cloth: 'Clothing', clothes: 'Clothing', apparel: 'Clothing',
    shoe: 'Shoes', shoes: 'Shoes', sneaker: 'Shoes', sneakers: 'Shoes', boots: 'Shoes',
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

    // Other
    other: 'Other', misc: 'Other',
};

/**
 * 父类包含子类（严格区分版：不再让 Clothing 包含 Beauty，也不让 Beauty 被 Clothing 吸收）
 * 只保留真正的层级：Books→Textbooks、Electronics→其电子子类、Home→(Furniture/Appliances)、Sports→(Outdoors/Bikes)
 */
const PARENTS = {
    Electronics: ['Phones', 'Laptops', 'Tablets', 'Cameras', 'Headphones', 'Consoles', 'Gaming'],
    Books: ['Textbooks'],
    Home: ['Furniture', 'Appliances'],
    Sports: ['Outdoors', 'Bikes'],
    // ❌ 不再有 Clothing: ['Shoes','Beauty']；Clothing、Shoes、Beauty 互不包含
};

/* ========================
 *   推断逻辑
 * =======================*/

const toKey = (s) => String(s || '').trim().toLowerCase();

/** 将任意原始分类/关键词标准化为主类 */
export function normalizeCategory(raw) {
    if (!raw) return 'Other';
    const k = toKey(raw);
    if (ALIAS_TO_MAIN[k]) return ALIAS_TO_MAIN[k];

    // 单复数简化：shoes → shoe
    const stem = k.endsWith('s') ? k.slice(0, -1) : k;
    if (ALIAS_TO_MAIN[stem]) return ALIAS_TO_MAIN[stem];

    // 直接命中主类
    const direct = HOME_CATEGORIES.find((x) => toKey(x) === k);
    if (direct) return direct;

    return 'Other';
}

/** 预编译别名正则（整词匹配，避免误伤） */
const RX_MAP = Object.fromEntries(
    Object.keys(ALIAS_TO_MAIN).map((alias) => [
        alias,
        new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
    ])
);

/** 从文本（标题/品牌/描述/标签）里推断可能类目 */
export function inferCategoriesFromText(text) {
    const t = String(text || '');
    const hinted = new Set();
    for (const alias in RX_MAP) {
        if (RX_MAP[alias].test(t)) hinted.add(ALIAS_TO_MAIN[alias]);
    }
    return hinted;
}

/**
 * 判断 item 是否属于 selected：
 * 1) 若 item.category 命中 selected 或 selected 的子类 → true
 * 2) 若没有明确分类，则用标题/品牌/描述/标签推断；严格区分 Clothing 与 Beauty
 */
export function belongsToCategory(item, selected) {
    if (!selected) return true;
    const wanted = normalizeCategory(selected);

    // 明确写了分类
    const main = normalizeCategory(item?.category);
    if (main && main !== 'Other') {
        if (main === wanted) return true;
        if (PARENTS[wanted]?.includes(main)) return true;
        return false;
    }

    // 无明确分类 → 文本/标签推断
    const text = [
        item?.title || '',
        item?.brand || '',
        (item?.description || '').slice(0, 160),
        ...(Array.isArray(item?.tags) ? item.tags : []),
    ].join(' ');

    const hints = inferCategoriesFromText(text);
    if (hints.has(wanted)) return true;

    // 仅对存在父子的条目进行父类包含判断（Clothing 与 Beauty 不互含）
    for (const c of hints) {
        if (PARENTS[wanted]?.includes(c)) return true;
    }
    return false;
}