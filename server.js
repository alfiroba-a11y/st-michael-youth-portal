// Full Production server.js - Restoring all features, models, endpoints, and authentication
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// All API data is live/dynamic — never let a browser, proxy, or CDN cache
// these responses. (This is the likely cause of "I updated a name and it
// never showed up": a cached GET response quietly served stale data.)
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    next();
});

const MONGO_URI = process.env.MONGO_URI;
let db = null;

const automatedReflections = [
    { title: "Walking in Divine Strength", reference: "Philippians 4:13", content: "I can do all things through Christ who strengthens me. No matter the challenges you face today, rely not on your own power, but on His infinite grace." },
    { title: "Trusting the Journey", reference: "Proverbs 3:5-6", content: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
    { title: "A Heart of Pure Service", reference: "Colossians 3:23", content: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters." },
    { title: "The Peace That Surpasses Understanding", reference: "John 14:27", content: "Peace I leave with you; my peace I give you. Do not let your hearts be troubled and do not be afraid." },
    { title: "Renewed Hope", reference: "Isaiah 40:31", content: "Those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary." }
];

// "Saint of the Day" rotation — factual name/feast-day info plus a short
// ORIGINAL one-line description written for this app (not quoted from any
// missal, breviary, or biography). Rotates by day-of-year so it's the same
// for every visitor on a given day. `seed` just drives the fallback portrait's
// color/style deterministically when no AI image is configured.
const SAINTS_OF_THE_DAY = [
    { name: "St. Michael the Archangel", feastDay: "September 29", seed: "michael", blurb: "Warrior-protector of the Church, invoked for courage and defense against evil." },
    { name: "St. Charles Lwanga", feastDay: "June 3", seed: "lwanga", blurb: "Ugandan martyr who held firm in his faith even at the cost of his life." },
    { name: "St. Kizito", feastDay: "June 3", seed: "kizito", blurb: "The youngest of the Uganda Martyrs, a witness that holiness has no minimum age." },
    { name: "St. Aloysius Gonzaga", feastDay: "June 21", seed: "aloysius", blurb: "Patron of Christian youth, known for humility and single-hearted devotion." },
    { name: "St. Thérèse of Lisieux", feastDay: "October 1", seed: "therese", blurb: "Taught that small, everyday acts done with love are their own path to holiness." },
    { name: "St. Francis of Assisi", feastDay: "October 4", seed: "francis", blurb: "Left wealth behind to live simply, caring for the poor and all creation." },
    { name: "St. Joseph", feastDay: "March 19", seed: "joseph", blurb: "Foster father of Jesus, a quiet model of faithfulness and steady provision." },
    { name: "St. Anthony of Padua", feastDay: "June 13", seed: "anthony", blurb: "Known for his preaching and his closeness to the poor and the lost." },
    { name: "St. Teresa of Calcutta", feastDay: "September 5", seed: "teresa", blurb: "Served the poorest of the poor, seeing the face of Christ in every person." },
    { name: "St. Monica", feastDay: "August 27", seed: "monica", blurb: "Prayed for years for her son's conversion — a patron of persistent hope." },
    { name: "St. Augustine", feastDay: "August 28", seed: "augustine", blurb: "A restless seeker whose story shows it's never too late to turn back to God." },
    { name: "St. Catherine of Siena", feastDay: "April 29", seed: "catherine", blurb: "A young laywoman whose courage and counsel shaped the Church of her time." },
    { name: "St. Raphael the Archangel", feastDay: "September 29", seed: "raphael", blurb: "Called \"God heals\" — patron of travelers, healing, and safe journeys." },
    { name: "St. Jude Thaddeus", feastDay: "October 28", seed: "jude", blurb: "Apostle invoked in difficult and seemingly hopeless situations." }
];

function getSaintOfDay(date) {
    date = date || new Date();
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
    const dayOfYear = Math.floor((date - start) / (1000 * 60 * 60 * 24));
    const saint = SAINTS_OF_THE_DAY[dayOfYear % SAINTS_OF_THE_DAY.length];
    return { ...saint, dayOfYear };
}

const VALID_PURPOSES = ['Christmas collection', 'Easter collection', 'Diocesan collection', 'Youth harambee', 'PMC contribution', 'Other'];

const JUMUIYAS_LIST = [
    { id: 'st_catherine', name: 'St. Catherine', username: 'catherine_admin', pass: 'Cath2026!' },
    { id: 'st_ann', name: 'St. Ann', username: 'ann_admin', pass: 'Ann2026!' },
    { id: 'st_michael', name: 'St. Michael', username: 'michael_admin', pass: 'Mich2026!' },
    { id: 'st_raphael', name: 'St. Raphael', username: 'raphael_admin', pass: 'Raph2026!' },
    { id: 'st_francisco', name: 'St. Francisco', username: 'francisco_admin', pass: 'Fran2026!' },
    { id: 'st_monica', name: 'St. Monica', username: 'monica_admin', pass: 'Mon2026!' },
    { id: 'st_stephen', name: 'St. Stephen', username: 'stephen_admin', pass: 'Steph2026!' },
    { id: 'st_jacinta', name: 'St. Jacinta', username: 'jacinta_admin', pass: 'Jac2026!' },
    { id: 'st_paul', name: 'St. Paul', username: 'paul_admin', pass: 'Paul2026!' },
    { id: 'st_francis_assisi', name: 'St. Francis of Assisi', username: 'assisi_admin', pass: 'Assisi2026!' },
    { id: 'st_charles_lwanga', name: 'St. Charles Lwanga', username: 'charles_admin', pass: 'Char2026!' }
];

let fallbackData = {
    members: [],
    pending: [],
    jumuiyaSubmissions: [],
    polls: [],
    archives: [],
    targetAmount: 500000,
    jumuiyaTargets: {},
    events: [{ id: '1', title: 'Sunday Holy Mass & Youth Fellowship', date: 'Next Sunday at 10:00 AM', description: 'Main service at St. Michael Kasaini Church.', type: 'upcoming' }],
    messages: [],
    readings: [{ id: '1', title: "Sunday Holy Mass Readings", firstReading: "1 Kings 3:5...", psalm: "Psalm 119...", secondReading: "Romans 8...", gospel: "Matthew 13..." }],
    passwordRequests: [],
    hymns: [],
    candles: [
        { id: 'family',    label: 'For my family',     lit: true },
        { id: 'healing',   label: 'For healing',        lit: false },
        { id: 'guidance',  label: 'For guidance',       lit: true },
        { id: 'departed',  label: 'For the departed',   lit: false },
        { id: 'peace',     label: 'For peace',          lit: true },
        { id: 'vocations', label: 'For vocations',      lit: false }
    ],
    memorialNames: [],
    prayerPoints: [],
    mentors: []
};

async function readData() {
    if (!db) return fallbackData;
    try {
        let doc = await db.collection('portal_data').findOne({ _id: 'main_store' });
        if (!doc) {
            await db.collection('portal_data').insertOne({ _id: 'main_store', ...fallbackData });
            return fallbackData;
        }
        return {
            members: doc.members || fallbackData.members,
            pending: doc.pending || fallbackData.pending,
            jumuiyaSubmissions: doc.jumuiyaSubmissions || fallbackData.jumuiyaSubmissions,
            polls: doc.polls || fallbackData.polls,
            archives: doc.archives || fallbackData.archives,
            targetAmount: doc.targetAmount !== undefined ? doc.targetAmount : fallbackData.targetAmount,
            jumuiyaTargets: doc.jumuiyaTargets || fallbackData.jumuiyaTargets,
            events: doc.events || fallbackData.events,
            messages: doc.messages || fallbackData.messages,
            readings: doc.readings || fallbackData.readings,
            passwordRequests: doc.passwordRequests || fallbackData.passwordRequests,
            hymns: doc.hymns || fallbackData.hymns,
            candles: doc.candles || fallbackData.candles,
            memorialNames: doc.memorialNames || fallbackData.memorialNames,
            prayerPoints: doc.prayerPoints || fallbackData.prayerPoints,
            mentors: doc.mentors || fallbackData.mentors
        };
    } catch (e) {
        return fallbackData;
    }
}

async function writeData(newData) {
    fallbackData = { ...fallbackData, ...newData };
    if (db) {
        try {
            await db.collection('portal_data').updateOne(
                { _id: 'main_store' },
                { $set: fallbackData },
                { upsert: true }
            );
        } catch (e) {
            console.error('Database write error:', e.message);
        }
    }
}

async function getSpiritualContent() {
    let reflection = null;
    let patronSaint = { name: "St. Aloysius Gonzaga", feastDay: "June 21", message: "Model of purity, youth, and selfless charity." };
    if (db) {
        try {
            reflection = await db.collection('settings').findOne({ type: 'reflection' });
            const ps = await db.collection('settings').findOne({ type: 'patronSaint' });
            if (ps) patronSaint = ps;
        } catch (err) {}
    }
    if (!reflection) {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const auto = automatedReflections[dayOfYear % automatedReflections.length];
        reflection = { title: auto.title, reference: auto.reference, content: auto.content };
    }
    return { reflection, patronSaint };
}

async function initDB() {
    if (MONGO_URI) {
        try {
            const client = new MongoClient(MONGO_URI);
            await client.connect();
            db = client.db('kasaini_youth_db');
            console.log('Connected successfully to MongoDB Atlas.');
            const existing = await db.collection('portal_data').findOne({ _id: 'main_store' });
            if (!existing) {
                await db.collection('portal_data').insertOne({ _id: 'main_store', ...fallbackData });
            } else {
                fallbackData = { ...fallbackData, ...existing };
            }
        } catch (err) {
            console.error('MongoDB connection error:', err.message);
        }
    }
}
initDB();

const normalize = (str) => (str || '').toLowerCase().replace(/[\.\s]/g, '');
const maskPhone = (phone) => (!phone || phone.length < 6) ? '****' : phone.slice(0, 3) + '****' + phone.slice(-3);

// =============================================================
// GLOBAL "APP SHELL" LAYOUT
// Every HTML page on this site (index, login, dashboard, admin,
// jumuiya-portal, and any other .html file) is served through this
// middleware, which injects one shared stylesheet and wraps the page
// body in a fixed-width frame. This is what keeps every page a fixed
// shape instead of stretching/shifting on wide laptop screens — and
// because it happens here on the server, individual pages never need
// their own copy of this CSS, and adding a new page automatically
// gets the same treatment.
// =============================================================
const HTML_ROUTE_MAP = {
    '/': 'index.html',
    '/index': 'index.html',
    '/login': 'login.html',
    '/dashboard': 'dashboard.html',
    '/secret-admin-portal-kasaini-2026': 'admin.html',
    '/jumuiya-portal': 'jumuiya-portal.html'
};

// =============================================================
// LITURGICAL SEASON ENGINE
// Computes the current Catholic liturgical season/color from the date
// alone — this is calendar math (like Easter's date), not copyrighted
// text, so it's safe to compute directly. Boundaries are a reasonable
// approximation for UI theming (exact pastoral dates can shift by a
// day or two around Baptism of the Lord / local calendars) — good
// enough to drive a color theme, not meant as a canonical ordo.
// =============================================================
function addDays(date, days) {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

// Anonymous Gregorian algorithm (Meeus/Jones/Butcher) for Easter Sunday.
function computeEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day));
}

function adventStartForYear(year) {
    const dec25 = new Date(Date.UTC(year, 11, 25));
    const dow = dec25.getUTCDay(); // 0 = Sunday
    const fourthAdventSunday = addDays(dec25, -dow);
    return addDays(fourthAdventSunday, -21);
}

const LITURGICAL_COLORS = {
    advent:   { name: 'Purple', hex: '#5b2d8e', soft: 'rgba(91,45,142,0.35)',  note: 'A season of watchful hope, preparing the way for the Lord.' },
    christmas:{ name: 'White & Gold', hex: '#caa23a', soft: 'rgba(202,162,58,0.35)', note: 'Rejoicing in the birth of Christ, Light of the World.' },
    lent:     { name: 'Purple', hex: '#5b2d8e', soft: 'rgba(91,45,142,0.35)',  note: 'A season of prayer, fasting, and turning back to God.' },
    triduum:  { name: 'Red', hex: '#8e1f1f', soft: 'rgba(142,31,31,0.35)',     note: 'The heart of the Church\u2019s year: the Passion of the Lord.' },
    easter:   { name: 'White & Gold', hex: '#caa23a', soft: 'rgba(202,162,58,0.35)', note: 'He is risen! A season of Easter joy and new life.' },
    pentecost:{ name: 'Red', hex: '#8e1f1f', soft: 'rgba(142,31,31,0.35)',     note: 'The Holy Spirit poured out upon the Church.' },
    ordinary: { name: 'Green', hex: '#2f6f4e', soft: 'rgba(47,111,78,0.35)',   note: 'Ordinary Time — growing in faith day by day.' }
};

function getLiturgicalInfo(date) {
    date = date || new Date();
    const year = date.getUTCFullYear();
    const easterThisYear = computeEaster(year);
    const easterPrevYear = computeEaster(year - 1);

    const ashWednesday = addDays(easterThisYear, -46);
    const holyThursday = addDays(easterThisYear, -3);
    const easterSunday = easterThisYear;
    const pentecost = addDays(easterThisYear, 49);

    const christmasThisYear = new Date(Date.UTC(year, 11, 25));
    const christmasPrevYear = new Date(Date.UTC(year - 1, 11, 25));
    const baptismOfLordEnd = new Date(Date.UTC(year, 0, 12)); // approx. end of Christmas season
    const adventStartThisYear = adventStartForYear(year);

    let seasonKey;
    let extraLabel = null;

    if (date >= christmasPrevYear && date <= baptismOfLordEnd) {
        seasonKey = 'christmas';
    } else if (date >= holyThursday && date < easterSunday) {
        seasonKey = 'triduum';
    } else if (date >= ashWednesday && date < holyThursday) {
        seasonKey = 'lent';
    } else if (date >= easterSunday && date < pentecost) {
        seasonKey = 'easter';
    } else if (date.getUTCFullYear() === pentecost.getUTCFullYear() &&
               date.getUTCMonth() === pentecost.getUTCMonth() &&
               date.getUTCDate() === pentecost.getUTCDate()) {
        seasonKey = 'pentecost';
        extraLabel = 'Pentecost Sunday';
    } else if (date >= adventStartThisYear && date < christmasThisYear) {
        seasonKey = 'advent';
    } else if (date >= christmasThisYear) {
        seasonKey = 'christmas';
    } else {
        seasonKey = 'ordinary';
    }

    const info = LITURGICAL_COLORS[seasonKey];
    return {
        seasonKey,
        seasonName: extraLabel || (seasonKey.charAt(0).toUpperCase() + seasonKey.slice(1)),
        colorName: info.name,
        hex: info.hex,
        soft: info.soft,
        note: info.note
    };
}

app.get('/api/liturgical/season', (req, res) => {
    res.json({ success: true, ...getLiturgicalInfo(new Date()) });
});

function injectAppShell(html) {
    const linkTag = '<link rel="stylesheet" href="/app-shell.css">';
    const liturgical = getLiturgicalInfo(new Date());
    const themeStyle = `<style>
        :root {
            --liturgical-color: ${liturgical.hex};
            --liturgical-color-soft: ${liturgical.soft};
        }
    </style>`;
    const bannerHtml = `<div class="liturgical-banner" style="background:${liturgical.hex};">
        <span class="liturgical-banner-dot"></span>
        <span>${liturgical.seasonName} &middot; ${liturgical.colorName}</span>
    </div>`;

    let out = html;
    out = /<\/head>/i.test(out)
        ? out.replace(/<\/head>/i, `    ${linkTag}\n    ${themeStyle}\n</head>`)
        : linkTag + themeStyle + out;
    out = out.replace(/(<body[^>]*>)/i, `$1\n<div class="app-shell">\n${bannerHtml}`);
    out = out.replace(/(<\/body>)/i, `</div><!-- /.app-shell -->\n$1`);
    return out;
}

function sendShelledPage(res, filename) {
    const filePath = path.join(__dirname, filename);
    fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.status(404).send('Page not found.');
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(injectAppShell(html));
    });
}

app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    const urlPath = req.path;

    if (HTML_ROUTE_MAP[urlPath]) {
        return sendShelledPage(res, HTML_ROUTE_MAP[urlPath]);
    }
    if (urlPath.toLowerCase().endsWith('.html')) {
        // path.basename strips any directory traversal attempt (../, etc.)
        return sendShelledPage(res, path.basename(urlPath));
    }
    next();
});

// Serves everything else — CSS, JS, images, app-shell.css itself, etc.
// (Deliberately placed after the shell middleware above so .html
// requests are always intercepted for shell injection first.)
app.use(express.static(path.join(__dirname)));


// Spiritual & Content API Endpoints
app.get('/api/spiritual/content', async (req, res) => {
    const content = await getSpiritualContent();
    res.json({ success: true, ...content });
});

// "Saint of the Day" — factual name/feast-day rotation, see SAINTS_OF_THE_DAY above.
app.get('/api/saint-of-day', (req, res) => {
    res.json({ success: true, saint: getSaintOfDay(new Date()) });
});

// Optional AI-generated portrait. Only runs if the server has an
// OPENAI_API_KEY configured (Render → Environment). Without one, this
// simply reports { available: false } and the front-end falls back to a
// generated-look CSS/canvas portrait instead — the feature still works,
// it just isn't a real AI image until a key + budget are set up.
// The image is generated once per saint per day and cached in memory.
let cachedPortrait = { dayOfYear: null, dataUrl: null };
app.get('/api/saint-of-day/portrait', async (req, res) => {
    const saint = getSaintOfDay(new Date());
    if (!process.env.OPENAI_API_KEY) {
        return res.json({ success: true, available: false, reason: 'No OPENAI_API_KEY configured on the server.' });
    }
    if (cachedPortrait.dayOfYear === saint.dayOfYear && cachedPortrait.dataUrl) {
        return res.json({ success: true, available: true, image: cachedPortrait.dataUrl });
    }
    try {
        const prompt = `A reverent, painterly portrait of the Catholic saint ${saint.name}, warm golden light, dignified and peaceful expression, traditional devotional art style, no text or watermark.`;
        const apiRes = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', n: 1 })
        });
        const json = await apiRes.json();
        const b64 = json && json.data && json.data[0] && json.data[0].b64_json;
        if (!b64) throw new Error('No image returned from provider.');
        const dataUrl = `data:image/png;base64,${b64}`;
        cachedPortrait = { dayOfYear: saint.dayOfYear, dataUrl };
        res.json({ success: true, available: true, image: dataUrl });
    } catch (e) {
        res.json({ success: true, available: false, reason: 'Image generation failed: ' + e.message });
    }
});

// Real-time-ish Global Prayer Globe: visitors submit an approximate
// location (from their browser, with permission) when they light a
// prayer intention; everyone polling sees the shared point set.
app.post('/api/prayer-globe/submit', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const latNum = Number(lat), lngNum = Number(lng);
        if (!isFinite(latNum) || !isFinite(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
            return res.status(400).json({ success: false, message: 'Invalid coordinates.' });
        }
        const data = await readData();
        const points = [...(data.prayerPoints || []), { id: Date.now().toString(), lat: latNum, lng: lngNum, ts: Date.now() }];
        // Keep only the most recent 300 points so this never grows unbounded.
        const trimmed = points.slice(-300);
        await writeData({ prayerPoints: trimmed });
        res.json({ success: true, points: trimmed });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error submitting prayer point.' });
    }
});

// Fallback for when a visitor's browser denies or lacks geolocation — this
// is what actually makes "light an intention" reliable for most people,
// since many will decline the browser location prompt. Uses the request's
// IP address for an approximate location; if that lookup fails too, falls
// back to a point near the parish itself so the action always succeeds.
app.post('/api/prayer-globe/submit-auto', async (req, res) => {
    try {
        const forwarded = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
        const ip = forwarded || (req.socket && req.socket.remoteAddress) || '';
        let latNum, lngNum;
        try {
            const geoRes = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,lat,lon`);
            const geoJson = await geoRes.json();
            if (geoJson && geoJson.status === 'success' && isFinite(geoJson.lat) && isFinite(geoJson.lon)) {
                latNum = geoJson.lat;
                lngNum = geoJson.lon;
            }
        } catch (e) { /* fall through to default below */ }
        if (latNum === undefined || lngNum === undefined) {
            // Approximate Nairobi-area default with a little jitter, so the
            // globe still gets a point rather than the action failing outright.
            latNum = -1.28 + (Math.random() - 0.5) * 0.6;
            lngNum = 36.82 + (Math.random() - 0.5) * 0.6;
        }
        const data = await readData();
        const points = [...(data.prayerPoints || []), { id: Date.now().toString(), lat: latNum, lng: lngNum, ts: Date.now() }];
        const trimmed = points.slice(-300);
        await writeData({ prayerPoints: trimmed });
        res.json({ success: true, points: trimmed });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error submitting prayer point.' });
    }
});

app.get('/api/prayer-globe/points', async (req, res) => {
    const data = await readData();
    res.json({ success: true, points: data.prayerPoints || [] });
});

// Fixed contact info for the youth board (matches what's published on the
// public homepage) — used as fallback knowledge for the assistant.
const YOUTH_BOARD_CONTACTS = [
    { role: 'Moderator', name: 'Alphonse', phone: '0745225589' },
    { role: 'V. Moderator', name: 'Eric', phone: '0714826281' },
    { role: 'O.G.', name: 'Victor', phone: '0754920679' }
];

// "St. Michael Companion" — the youth assistant. Always answers from the
// portal's own live data (events, readings, mentor assignments, contacts).
// If OPENAI_API_KEY is configured, it upgrades to a real conversational
// model grounded in that same data; without a key it uses straightforward
// keyword matching so it still gives real, accurate answers rather than
// nothing. Either way, when it can't help, it says so and offers to
// connect the member directly to an admin.
app.post('/api/assistant/ask', async (req, res) => {
    try {
        const { question, currentUser } = req.body;
        if (!question || !question.trim()) {
            return res.status(400).json({ success: false, message: 'Please type a question.' });
        }
        const data = await readData();
        const q = question.toLowerCase();

        const member = currentUser
            ? (data.members || []).find(m => (m.name || '').toLowerCase() === String(currentUser).toLowerCase())
            : null;
        const nextEvent = (data.events || [])[0] || null;
        const currentReading = (data.readings || [])[0] || null;
        const mentorForMember = member
            ? (data.mentors || []).find(m => (m.group || '').toLowerCase() === (member.group || '').toLowerCase())
            : null;

        // ---- Path 1: real LLM, grounded in the same live context ----
        if (process.env.OPENAI_API_KEY) {
            try {
                const contextLines = [
                    `Next event: ${nextEvent ? `${nextEvent.title} — ${nextEvent.date}. ${nextEvent.description || ''}` : 'None scheduled yet.'}`,
                    `Current Mass readings title: ${currentReading ? currentReading.title : 'Not posted yet.'}`,
                    `Youth board contacts: ${YOUTH_BOARD_CONTACTS.map(c => `${c.role} ${c.name} (${c.phone})`).join('; ')}`,
                    member ? `This member's group: ${member.group || 'unknown'}.` : `The asker is not logged in or not matched to a member record.`,
                    mentorForMember ? `Their assigned mentor: ${mentorForMember.mentorName} (${mentorForMember.mentorContact || 'no contact on file'}), for ${mentorForMember.month || 'the current period'}.` : `No mentor is on file for this member's group yet.`,
                    `Known hymns/songs in the hymnal: ${(data.hymns || []).slice(0, 15).map(h => h.title).join(', ') || 'none added yet'}.`
                ].join('\n');

                const systemPrompt = `You are the "St. Michael Companion", a friendly assistant for the St. Michael Kasaini Youth Portal. Answer ONLY using the parish information given below — never invent events, contacts, mentors, or facts that aren't listed. Keep answers short (2-4 sentences) and warm. If the answer isn't in the information provided, clearly say you don't have that information and that you'll connect them to an admin.\n\nParish information:\n${contextLines}`;

                const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: question }
                        ],
                        max_tokens: 220,
                        temperature: 0.4
                    })
                });
                const json = await apiRes.json();
                const answer = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
                if (answer) {
                    const escalate = /don'?t have|not sure|connect you|no information|do not have/i.test(answer);
                    return res.json({ success: true, answer: answer.trim(), escalate, mode: 'ai' });
                }
            } catch (e) {
                // Fall through to the rule-based path below if the API call fails.
            }
        }

        // ---- Path 2: rule-based fallback (always available, no API key needed) ----
        function reply(answer, escalate) {
            res.json({ success: true, answer, escalate: !!escalate, mode: 'rules' });
        }

        if (/mentor/.test(q)) {
            if (mentorForMember) {
                return reply(`Your mentor for ${mentorForMember.month || 'this period'} is ${mentorForMember.mentorName}${mentorForMember.mentorContact ? ` (${mentorForMember.mentorContact})` : ''}.`);
            }
            return reply("I don't have a mentor on file for your group yet — let me connect you to an admin.", true);
        }
        if (/camp|event|upcoming|schedule|next\b/.test(q)) {
            if (nextEvent) {
                return reply(`The next event is "${nextEvent.title}" — ${nextEvent.date}. ${nextEvent.description || ''}`.trim());
            }
            return reply("There's nothing on the events calendar yet — let me connect you to an admin to check.", true);
        }
        if (/reading|gospel|mass|psalm|scripture/.test(q)) {
            if (currentReading) {
                return reply(`This week's readings are posted under "${currentReading.title}" — check the Mass Readings section on the homepage for the full text.`);
            }
            return reply("Readings haven't been posted yet — let me connect you to an admin.", true);
        }
        if (/contact|admin|leader|moderator|phone|reach|call/.test(q)) {
            return reply('You can reach the youth board directly: ' + YOUTH_BOARD_CONTACTS.map(c => `${c.role} ${c.name} (${c.phone})`).join(', ') + '.');
        }
        if (/hymn|song|music/.test(q)) {
            const titles = (data.hymns || []).slice(0, 6).map(h => h.title);
            if (titles.length) return reply(`A few songs in our hymnal: ${titles.join(', ')}. Check the homepage Hymnal section for the full list.`);
            return reply("No songs have been added to the hymnal yet.");
        }
        if (/candle|pray|intention/.test(q)) {
            return reply('You can light a virtual prayer candle or a Global Prayer Globe intention from the homepage and dashboard — look for the Prayer Sanctuary and Prayer Globe sections.');
        }

        return reply("I don't have an answer for that yet — I'll connect you directly to an admin.", true);
    } catch (e) {
        res.status(500).json({ success: false, message: 'The assistant hit an error. Please try again.' });
    }
});

app.get('/api/analytics/jumuiya-graph', async (req, res) => {
    const data = await readData();
    const labels = JUMUIYAS_LIST.map(j => j.name);
    const totalsMap = {};
    labels.forEach(name => { totalsMap[name] = 0; });

    (data.jumuiyaSubmissions || []).forEach(record => {
        if (record.published && record.jumuiyaName) {
            const matchedLabel = labels.find(l => normalize(l) === normalize(record.jumuiyaName));
            if (matchedLabel) {
                totalsMap[matchedLabel] += Number(record.amount || 0);
            }
        }
    });
    res.json({ success: true, labels, datasetsData: labels.map(name => totalsMap[name]) });
});

app.get('/api/jumuiyas/list', (req, res) => {
    res.json({ success: true, jumuiyas: JUMUIYAS_LIST.map(j => ({ id: j.id, name: j.name, username: j.username })) });
});

app.post('/api/jumuiya/login', (req, res) => {
    const { jumuiyaId, username, password } = req.body;
    const jumuiya = JUMUIYAS_LIST.find(j => j.id === jumuiyaId);
    if (jumuiya && jumuiya.username === username && jumuiya.pass === password) {
        return res.json({ success: true, name: jumuiya.name });
    }
    res.json({ success: false, message: 'Invalid credentials.' });
});

// Fully updated Jumuiya portal endpoint providing submissions, registered members directory filtered for that group, and targets/graph values
app.get('/api/jumuiya/data', async (req, res) => {
    const { jumuiyaName } = req.query;
    const data = await readData();
    const targetNorm = normalize(jumuiyaName);
    const submissions = (data.jumuiyaSubmissions || []).filter(s => normalize(s.jumuiyaName) === targetNorm);
    const members = (data.members || []).filter(m => normalize(m.jumuiya) === targetNorm);
    
    let jumuiyaTotal = 0;
    submissions.forEach(s => {
        if (s.published) jumuiyaTotal += Number(s.amount || 0);
    });

    res.json({ 
        success: true, 
        submissions, 
        members,
        jumuiyaTotal,
        jumuiyaTarget: (data.jumuiyaTargets && jumuiyaName) ? (data.jumuiyaTargets[jumuiyaName] || 0) : 0,
        validPurposes: VALID_PURPOSES 
    });
});

app.post('/api/jumuiya/submit-record', async (req, res) => {
    const { jumuiyaName, name, amount, purpose } = req.body;
    if (!name || !jumuiyaName) return res.json({ success: false, message: 'Missing fields.' });
    const data = await readData();
    const submissions = [...(data.jumuiyaSubmissions || []), {
        id: Date.now().toString(),
        jumuiyaName,
        name: name.trim(),
        amount: parseFloat(amount) || 0,
        purpose: VALID_PURPOSES.includes(purpose) ? purpose : 'Other',
        published: false
    }];
    await writeData({ jumuiyaSubmissions: submissions });
    res.json({ success: true, message: 'Submitted successfully!' });
});

// Virtual prayer candles — a shared, persistent board every visitor sees
// and can light/extinguish (like a real vigil candle rack).
app.post('/api/candles/toggle', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Missing candle id.' });
        const data = await readData();
        let found = false;
        const candles = (data.candles || []).map(c => {
            if (c.id === id) { found = true; return { ...c, lit: !c.lit }; }
            return c;
        });
        if (!found) return res.status(404).json({ success: false, message: 'Candle not found.' });
        await writeData({ candles });
        res.json({ success: true, candles });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error toggling candle.' });
    }
});

app.get('/api/youth/directory', async (req, res) => {
    const data = await readData();
    const { reflection, patronSaint } = await getSpiritualContent();
    let contributionsMap = {};
    JUMUIYAS_LIST.forEach(j => { contributionsMap[j.name] = 0; });
    (data.jumuiyaSubmissions || []).forEach(r => {
        if (r.published) {
            const matched = JUMUIYAS_LIST.find(j => normalize(j.name) === normalize(r.jumuiyaName));
            if (matched) contributionsMap[matched.name] += Number(r.amount || 0);
        }
    });
    res.json({ 
        success: true, 
        members: (data.members || []).map(m => ({ ...m, phone: maskPhone(m.phone) })), 
        masterContributions: (data.jumuiyaSubmissions || []).filter(s => s.published), 
        contributionsMap,
        jumuiyaTargets: data.jumuiyaTargets || {},
        events: data.events || [], 
        readings: data.readings || [], 
        messages: data.messages || [],
        hymns: data.hymns || [],
        candles: data.candles || [],
        memorialNames: data.memorialNames || [],
        mentors: data.mentors || [],
        reflection,
        patronSaint,
        validPurposes: VALID_PURPOSES
    });
});

app.post('/api/youth/register', async (req, res) => {
    const { name, phone, jumuiya, group, pass } = req.body;
    if (!name || !pass) return res.json({ success: false, message: 'Name & password required.' });
    const data = await readData();
    const cleanName = name.trim().toLowerCase();
    if ((data.members || []).some(m => m.name.toLowerCase() === cleanName) || (data.pending || []).some(p => p.name.toLowerCase() === cleanName)) {
        return res.json({ success: false, message: 'Account exists.' });
    }
    const pending = [...(data.pending || []), { id: Date.now().toString(), name: name.trim(), phone: phone || '', jumuiya: jumuiya || 'St. Michael', group: group || 'Youth General', pass, date: new Date().toLocaleDateString() }];
    await writeData({ pending });
    res.json({ success: true, message: 'Registered successfully!' });
});

app.post('/api/youth/login', async (req, res) => {
    const { name, pass } = req.body;
    const data = await readData();
    const cleanName = name.trim().toLowerCase();
    const member = (data.members || []).find(m => m.name.toLowerCase() === cleanName);
    if (member) {
        if (member.pass === pass) return res.json({ success: true, name: member.name, jumuiya: member.jumuiya });
        return res.json({ success: false, message: 'Incorrect password.' });
    }
    res.json({ success: false, message: 'Member not found or pending approval.' });
});

// These two were called by dashboard.html (Community Board posts, assistant
// escalations, and the Profile Settings form) but were never actually
// implemented here — every request to them was silently 404ing, which is
// why messages never reached the admin dashboard.
app.post('/api/youth/message', async (req, res) => {
    try {
        const { sender, text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Message text is required.' });
        const data = await readData();
        const messages = [...(data.messages || []), {
            id: Date.now().toString(),
            sender: sender || 'Anonymous',
            text: text.trim(),
            time: new Date().toLocaleString()
        }];
        await writeData({ messages });
        res.json({ success: true, messages });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error posting message.' });
    }
});

app.post('/api/youth/update-profile', async (req, res) => {
    try {
        const { currentUser, name, group, password } = req.body;
        if (!currentUser || !name) return res.status(400).json({ success: false, message: 'Missing required fields.' });
        const data = await readData();
        const cleanCurrent = currentUser.trim().toLowerCase();
        let found = false;
        const members = (data.members || []).map(m => {
            if (m.name.toLowerCase() === cleanCurrent) {
                found = true;
                return {
                    ...m,
                    name: name.trim(),
                    group: group !== undefined ? group : m.group,
                    pass: password && password.trim() ? password.trim() : m.pass
                };
            }
            return m;
        });
        if (!found) return res.status(404).json({ success: false, message: 'Member not found.' });
        await writeData({ members });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error updating profile.' });
    }
});

// Master Admin APIs
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    res.json({ success: (username === 'Admin' && password === 'Admin0247') });
});

app.get('/api/admin/data', async (req, res) => {
    const data = await readData();
    const { reflection, patronSaint } = await getSpiritualContent();
    let contributionsMap = {};
    JUMUIYAS_LIST.forEach(j => { contributionsMap[j.name] = 0; });
    (data.jumuiyaSubmissions || []).forEach(r => {
        if (r.published) {
            const matched = JUMUIYAS_LIST.find(j => normalize(j.name) === normalize(r.jumuiyaName));
            if (matched) contributionsMap[matched.name] += Number(r.amount || 0);
        }
    });
    // Never send plaintext passwords to the browser, even to the admin.
    const safePending = (data.pending || []).map(({ pass, ...rest }) => rest);
    const safeMembers = (data.members || []).map(({ pass, ...rest }) => rest);

    res.json({ 
        success: true, 
        pending: safePending, 
        members: safeMembers, 
        jumuiyaSubmissions: data.jumuiyaSubmissions || [],
        polls: data.polls || [],
        archives: data.archives || [],
        targetAmount: data.targetAmount !== undefined ? data.targetAmount : 500000,
        jumuiyaTargets: data.jumuiyaTargets || {},
        contributionsMap,
        readings: data.readings || [], 
        events: data.events || [], 
        messages: data.messages || [],
        hymns: data.hymns || [],
        candles: data.candles || [],
        memorialNames: data.memorialNames || [],
        mentors: data.mentors || [],
        passwordRequests: data.passwordRequests || [],
        reflection,
        patronSaint,
        validPurposes: VALID_PURPOSES
    });
});

app.post('/api/admin/set-target', async (req, res) => {
    try {
        const { targetAmount, jumuiyaTargets } = req.body;
        let updatePayload = {};
        
        if (targetAmount !== undefined) {
            const newTarget = parseFloat(targetAmount);
            if (!isNaN(newTarget)) updatePayload.targetAmount = newTarget;
        }
        
        if (jumuiyaTargets && typeof jumuiyaTargets === 'object') {
            updatePayload.jumuiyaTargets = jumuiyaTargets;
        }

        await writeData(updatePayload);
        res.json({ success: true, targetAmount: fallbackData.targetAmount, jumuiyaTargets: fallbackData.jumuiyaTargets });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error updating target amounts.' });
    }
});

app.post('/api/admin/save-event', async (req, res) => {
    try {
        const { id, title, date, description } = req.body;
        const data = await readData();
        let events = data.events || [];
        if (id) {
            events = events.map(ev => ev.id === id ? { ...ev, title, date, description } : ev);
        } else {
            events.push({ id: Date.now().toString(), title, date, description, type: 'upcoming' });
        }
        await writeData({ events });
        res.json({ success: true, events });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error saving event' });
    }
});

app.post('/api/admin/save-reading', async (req, res) => {
    try {
        const { id, title, firstReading, psalm, secondReading, gospel } = req.body;
        const data = await readData();
        let readings = data.readings || [];
        if (id) {
            readings = readings.map(r => r.id === id ? { ...r, title, firstReading, psalm, secondReading, gospel } : r);
        } else {
            readings.push({ id: Date.now().toString(), title, firstReading, psalm, secondReading, gospel });
        }
        await writeData({ readings });
        res.json({ success: true, readings });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error saving reading' });
    }
});

// Hymnal manager — lets the parish transcribe their own songs/prayers
// (e.g. from a hymnal they own the rights to use) so the homepage can
// list them as a table of contents and show the full text on request.
app.post('/api/admin/save-hymn', async (req, res) => {
    try {
        const { id, title, number, category, lyrics } = req.body;
        if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });
        const data = await readData();
        let hymns = data.hymns || [];
        if (id) {
            let found = false;
            hymns = hymns.map(h => {
                if (h.id === id) { found = true; return { ...h, title, number, category, lyrics }; }
                return h;
            });
            if (!found) return res.status(404).json({ success: false, message: 'Hymn not found.' });
        } else {
            hymns.push({ id: Date.now().toString(), title, number: number || '', category: category || '', lyrics: lyrics || '' });
        }
        await writeData({ hymns });
        res.json({ success: true, hymns });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error saving hymn.' });
    }
});

app.post('/api/admin/delete-hymn', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Missing hymn id.' });
        const data = await readData();
        const before = (data.hymns || []).length;
        const hymns = (data.hymns || []).filter(h => h.id !== id);
        if (hymns.length === before) return res.status(404).json({ success: false, message: 'Hymn not found.' });
        await writeData({ hymns });
        res.json({ success: true, hymns });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error deleting hymn.' });
    }
});

// Memorial Wall — names for the virtual chapel's glowing memorial garden.
app.post('/api/admin/save-memorial-name', async (req, res) => {
    try {
        const { id, name, years } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });
        const data = await readData();
        let memorialNames = data.memorialNames || [];
        if (id) {
            let found = false;
            memorialNames = memorialNames.map(m => {
                if (m.id === id) { found = true; return { ...m, name, years }; }
                return m;
            });
            if (!found) return res.status(404).json({ success: false, message: 'Entry not found.' });
        } else {
            memorialNames.push({ id: Date.now().toString(), name, years: years || '' });
        }
        await writeData({ memorialNames });
        res.json({ success: true, memorialNames });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error saving memorial name.' });
    }
});

app.post('/api/admin/delete-memorial-name', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Missing id.' });
        const data = await readData();
        const before = (data.memorialNames || []).length;
        const memorialNames = (data.memorialNames || []).filter(m => m.id !== id);
        if (memorialNames.length === before) return res.status(404).json({ success: false, message: 'Entry not found.' });
        await writeData({ memorialNames });
        res.json({ success: true, memorialNames });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error deleting memorial name.' });
    }
});

// Mentor assignments — lets an admin say which mentor covers each group,
// so the Companion assistant can actually answer "who is my mentor?"
app.post('/api/admin/save-mentor', async (req, res) => {
    try {
        const { id, group, mentorName, mentorContact, month } = req.body;
        if (!group || !mentorName) return res.status(400).json({ success: false, message: 'Group and mentor name are required.' });
        const data = await readData();
        let mentors = data.mentors || [];
        if (id) {
            let found = false;
            mentors = mentors.map(m => {
                if (m.id === id) { found = true; return { ...m, group, mentorName, mentorContact, month }; }
                return m;
            });
            if (!found) return res.status(404).json({ success: false, message: 'Mentor entry not found.' });
        } else {
            mentors.push({ id: Date.now().toString(), group, mentorName, mentorContact: mentorContact || '', month: month || '' });
        }
        await writeData({ mentors });
        res.json({ success: true, mentors });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error saving mentor.' });
    }
});

app.post('/api/admin/delete-mentor', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Missing id.' });
        const data = await readData();
        const before = (data.mentors || []).length;
        const mentors = (data.mentors || []).filter(m => m.id !== id);
        if (mentors.length === before) return res.status(404).json({ success: false, message: 'Mentor entry not found.' });
        await writeData({ mentors });
        res.json({ success: true, mentors });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error deleting mentor.' });
    }
});

app.post('/api/admin/toggle-publish', async (req, res) => {
    try {
        const { id } = req.body;
        const data = await readData();
        let submissions = data.jumuiyaSubmissions || [];
        submissions = submissions.map(sub => {
            if (sub.id === id) {
                return { ...sub, published: !sub.published };
            }
            return sub;
        });
        await writeData({ jumuiyaSubmissions: submissions });
        res.json({ success: true, jumuiyaSubmissions: submissions });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error updating publish status' });
    }
});

// --- Previously missing endpoints ---
// The admin dashboard's Delete/Edit buttons for jumuiya submissions and
// members, and the Delete buttons for events/readings, had no matching
// route on the server at all. Any request to them fell through to
// Express's default 404 handler, which is why the browser showed
// "Failed to delete the record." instead of anything happening.

app.post('/api/admin/delete-jumuiya-record', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Missing record id.' });
        const data = await readData();
        const before = (data.jumuiyaSubmissions || []).length;
        const jumuiyaSubmissions = (data.jumuiyaSubmissions || []).filter(s => s.id !== id);
        if (jumuiyaSubmissions.length === before) {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }
        await writeData({ jumuiyaSubmissions });
        res.json({ success: true, jumuiyaSubmissions });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error deleting record.' });
    }
});

app.post('/api/admin/edit-jumuiya-record', async (req, res) => {
    try {
        const { id, name, amount, purpose } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Missing record id.' });
        const data = await readData();
        let found = false;
        const jumuiyaSubmissions = (data.jumuiyaSubmissions || []).map(s => {
            if (s.id === id) {
                found = true;
                return {
                    ...s,
                    name: name !== undefined ? name : s.name,
                    amount: amount !== undefined ? (parseFloat(amount) || 0) : s.amount,
                    purpose: purpose !== undefined ? purpose : s.purpose
                };
            }
            return s;
        });
        if (!found) return res.status(404).json({ success: false, message: 'Record not found.' });
        await writeData({ jumuiyaSubmissions });
        res.json({ success: true, jumuiyaSubmissions });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error editing record.' });
    }
});

app.post('/api/admin/edit-member', async (req, res) => {
    try {
        const { id, name, phone, jumuiya, group } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Missing member id.' });
        const data = await readData();
        let found = false;
        const members = (data.members || []).map(m => {
            if (m.id === id) {
                found = true;
                return {
                    ...m,
                    name: name !== undefined ? name : m.name,
                    phone: phone !== undefined ? phone : m.phone,
                    jumuiya: jumuiya !== undefined ? jumuiya : m.jumuiya,
                    group: group !== undefined ? group : m.group
                };
            }
            return m;
        });
        if (!found) return res.status(404).json({ success: false, message: 'Member not found.' });
        await writeData({ members });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error editing member.' });
    }
});

app.post('/api/admin/remove-member', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Missing member id.' });
        const data = await readData();
        const before = (data.members || []).length;
        const members = (data.members || []).filter(m => m.id !== id);
        if (members.length === before) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }
        await writeData({ members });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error removing member.' });
    }
});

app.post('/api/admin/events/delete', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Missing event id.' });
        const data = await readData();
        const events = (data.events || []).filter(ev => ev.id !== id);
        await writeData({ events });
        res.json({ success: true, events });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error deleting event.' });
    }
});

app.post('/api/admin/readings/delete', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Missing reading id.' });
        const data = await readData();
        const readings = (data.readings || []).filter(r => r.id !== id);
        await writeData({ readings });
        res.json({ success: true, readings });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error deleting reading.' });
    }
});

app.post('/api/admin/approve-password', async (req, res) => {
    try {
        const { id } = req.body;
        const data = await readData();
        let requests = data.passwordRequests || [];
        let members = data.members || [];
        const reqIndex = requests.findIndex(r => r.id === id);
        if (reqIndex !== -1) {
            const approved = requests.splice(reqIndex, 1)[0];
            members = members.map(m => m.name.toLowerCase() === approved.name.toLowerCase() ? { ...m, pass: approved.newPass } : m);
            await writeData({ passwordRequests: requests, members });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error approving password' });
    }
});

app.get('/api/admin/download-data', async (req, res) => {
    try {
        const { type } = req.query;
        const data = await readData();
        let totalCollected = 0;
        let contributionsMap = {};
        JUMUIYAS_LIST.forEach(j => { contributionsMap[j.name] = 0; });

        (data.jumuiyaSubmissions || []).forEach(r => {
            if (r.published) {
                const amt = Number(r.amount || 0);
                totalCollected += amt;
                const matched = JUMUIYAS_LIST.find(j => normalize(j.name) === normalize(r.jumuiyaName));
                if (matched) contributionsMap[matched.name] += amt;
            }
        });

        const maxVal = Math.max(...Object.values(contributionsMap), 1);

        let html = `<!DOCTYPE html><html><head><title>St. Michael Kasaini Master Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
            h1 { color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px; }
            .meta { margin-bottom: 20px; font-size: 14px; color: #666; }
            .summary-box { background: #ebf8ff; border-left: 5px solid #3182ce; padding: 15px; margin-bottom: 25px; font-size: 16px; font-weight: bold; }
            .chart-container { margin: 25px 0; background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
            .chart-bar-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
            .chart-label { width: 180px; font-weight: bold; }
            .chart-bar-bg { flex-grow: 1; background: #e2e8f0; height: 22px; border-radius: 4px; overflow: hidden; margin: 0 15px; }
            .chart-bar-fill { background: #3182ce; height: 100%; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e0; padding: 10px; text-align: left; }
            th { background: #edf2f7; color: #2d3748; }
        </style></head><body>
        <h1>St. Michael Kasaini Master Admin Report</h1>
        <div class="meta">Generated On: ${new Date().toLocaleString()} | Category: ${type === 'financial' ? 'Financial Summary Only' : type === 'members' ? 'Registered Members Directory Only' : 'Complete Portal Data'}</div>`;

        if (type === 'financial' || type === 'all' || !type) {
            html += `<div class="summary-box">
                Total Collected: KES ${totalCollected.toLocaleString()} / Target: KES ${(data.targetAmount || 500000).toLocaleString()}
            </div>
            <div class="chart-container">
                <h3>Jumuiya Performance Analytics Breakdown</h3>`;

            for (const [name, amt] of Object.entries(contributionsMap)) {
                const pct = Math.round((amt / maxVal) * 100);
                html += `<div class="chart-bar-row">
                    <div class="chart-label">${name}</div>
                    <div class="chart-bar-bg"><div class="chart-bar-fill" style="width: ${pct}%;"></div></div>
                    <div>KES ${amt.toLocaleString()}</div>
                </div>`;
            }
            html += `</div>`;
        }

        if (type === 'members' || type === 'all' || !type) {
            html += `<h3>Registered Youth Directory</h3><table><thead><tr><th>#</th><th>ID</th><th>Name</th><th>Phone</th><th>Jumuiya</th><th>Group</th></tr></thead><tbody>`;
            const members = data.members || [];
            if (members.length === 0) {
                html += `<tr><td colspan="6" style="text-align:center;">No members found.</td></tr>`;
            } else {
                members.forEach((m, idx) => {
                    html += `<tr><td>${idx + 1}</td><td>${m.customId || 'N/A'}</td><td>${m.name}</td><td>${m.phone}</td><td>${m.jumuiya}</td><td>${m.group}</td></tr>`;
                });
            }
            html += `</tbody></table>`;
        }

        html += `<script>window.onload = () => { window.print(); }</script></body></html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (e) {
        res.status(500).send('Error generating report.');
    }
});

app.post('/api/admin/approve', async (req, res) => {
    const { id } = req.body;
    const data = await readData();
    const index = (data.pending || []).findIndex(p => p.id === id);
    if (index !== -1) {
        const approved = data.pending.splice(index, 1)[0];
        const members = [...(data.members || []), { ...approved, customId: `K${(data.members || []).length + 1}` }];
        await writeData({ pending: data.pending, members });
    }
    res.json({ success: true });
});

app.post('/api/admin/reject', async (req, res) => {
    const { id } = req.body;
    const data = await readData();
    await writeData({ pending: (data.pending || []).filter(p => p.id !== id) });
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`St. Michael Kasaini Server running on http://localhost:${PORT}`);
});
