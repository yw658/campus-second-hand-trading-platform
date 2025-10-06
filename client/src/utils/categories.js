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

export const POST_CATEGORY_OPTIONS = [
    { group: 'Books', items: ['Books', 'Textbooks'] },
    { group: 'Electronics', items: ['Electronics', 'Phones', 'Laptops', 'Tablets', 'Cameras', 'Headphones', 'Consoles', 'Gaming'] },
    { group: 'Fashion', items: ['Clothing', 'Shoes', 'Beauty'] },
    { group: 'Home & Living', items: ['Home', 'Furniture', 'Appliances'] },
    { group: 'Sports & Outdoor', items: ['Sports', 'Outdoors', 'Bikes'] },
    { group: 'Others', items: ['Instruments', 'Tickets', 'Other'] },
];


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


const PARENTS = {
    Electronics: ['Phones', 'Laptops', 'Tablets', 'Cameras', 'Headphones', 'Consoles', 'Gaming'],
    Books: ['Textbooks'],
    Home: ['Furniture', 'Appliances'],
    Sports: ['Outdoors', 'Bikes'],
};

const toKey = (s) => String(s || '').trim().toLowerCase();

export function normalizeCategory(raw) {
    if (!raw) return 'Other';
    const k = toKey(raw);
    if (ALIAS_TO_MAIN[k]) return ALIAS_TO_MAIN[k];

    const stem = k.endsWith('s') ? k.slice(0, -1) : k;
    if (ALIAS_TO_MAIN[stem]) return ALIAS_TO_MAIN[stem];

    const direct = HOME_CATEGORIES.find((x) => toKey(x) === k);
    if (direct) return direct;

    return 'Other';
}

const RX_MAP = Object.fromEntries(
    Object.keys(ALIAS_TO_MAIN).map((alias) => [
        alias,
        new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
    ])
);

export function inferCategoriesFromText(text) {
    const t = String(text || '');
    const hinted = new Set();
    for (const alias in RX_MAP) {
        if (RX_MAP[alias].test(t)) hinted.add(ALIAS_TO_MAIN[alias]);
    }
    return hinted;
}


export function belongsToCategory(item, selected) {
    if (!selected) return true;
    const wanted = normalizeCategory(selected);

    if (wanted === 'Other') {
        const main = normalizeCategory(item?.category);
        return main === 'Other';
    }

    const main = normalizeCategory(item?.category);
    if (main && main !== 'Other') {
        if (main === wanted) return true;
        if (PARENTS[wanted]?.includes(main)) return true;
        return false;
    }

    const text = [
        item?.title || '',
        item?.brand || '',
        (item?.description || '').slice(0, 160),
        ...(Array.isArray(item?.tags) ? item.tags : []),
    ].join(' ');

    const hints = inferCategoriesFromText(text);
    if (hints.has(wanted)) return true;

    for (const c of hints) {
        if (PARENTS[wanted]?.includes(c)) return true;
    }
    return false;
}