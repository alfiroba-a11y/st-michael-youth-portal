// Full Production server.js - Restoring all features, models, endpoints, and authentication
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const adminSessions = new Set();

function requireAdmin(req, res, next) {
    const token = String(req.get('X-Admin-Token') || '');
    if (!token || !adminSessions.has(token)) {
        return res.status(401).json({ success: false, message: 'Admin sign-in is required.' });
    }
    next();
}

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

const VALID_PURPOSES = ['Christmas collection', 'Easter collection', 'Diocesan collection', 'Youth harambee', 'Youth pledge', 'PMC contribution', 'Other'];

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

// The church-wide names list is deliberately separate from login accounts.
// People can appear here and later create an account without a duplicate-name
// error; their account will then be linked to the Jumuiya they select.
const YOUTH_MEMBER_NAMES = [
    'Diana katile','Dennis sammy','Joanne Nduku','Matilda ann','Patric Mutiso','Joseph mulei','Sam art kid',
    'Charity ndunge','Dancun mutuku','Samuel Ndola','Robert Wambua','Francis mutoni','Lydia ndunge','Dennis kaseke',
    'Urbanus sammy','Ruth Kioko','Esther nthenya','Steve kiilu','Brian musau','Alice mutave','Maureen kioko',
    'Kaloki sammy','Urbanus mutisya','Maryann Koki','Faith munyiva','Mary kiilu','Diana nwende','Caro mutio',
    'Emily mbatha','Joseph ndiku','Antony kioko','Mitchell Muema','Leonard mwiso','Janet Ngelele','Faith ndunge',
    'Vivian ndunge','Jayden wambua','Judith ndila','marceline ndinda','Catherine kaluki','Dennis makato',
    'Mercy muthoki','Kavesu Nzuki','Ann kamene','Maureen Muema','Kennedy kioko','Janet Wanza','Gloria Mwende',
    'Bridgit Wavinya','Magdalene musau','Cellina mukulu','Jane ndinda','Janet munyiva','Purity nthambi',
    'Susan Katunge','Maureen kalekye','Dennis muema','Catherine mbatha','Diana musyawa','Agnes ngina',
    'Alphonse muteti','Mary musyoki','simon muya','sharleen kioko','Claudia kennedy','Diana kennedy',
    'Dennus kiswii','Jacintah muema','Simon kasivu','Cynthia syokau','Peter mwangangi','Gloria kim',
    'Jackline muthoki','Joseph mutinda','Betty mutindi','Allan muli','Vincent muthama','Steven muutu',
    'Bonface william','Fidelis kimani','Annafemmi','Caroline muema','James kilele','John mutinda',
    'Dennis wambua','Cecilia Mulinge','Innocent muthusi','Dennis kasivu','Rechael ndolo','Cynthia munyao',
    'Agie kasiva','Erick peter','Ostin kilonzo','Samantha wangai','Agape Nzomo'
];

const HARAMBEE_PLEDGES = [
    ['Matilda ann',500,500],['Robert Wambua',1000,0],['Dennis kaseke',1000,0],['Brian musau',500,0],['Alice mutave',200,0],['Sammy Kaloki',200,200],['Faith munyiva',200,0],['Diana nwende',200,0],['Caro mutio',200,0],['Judith ndila',200,0],['marceline ndinda',1000,0],['Mercy muthoki',200,0],['Maureen Muema',500,0],['Kennedy kioko',1000,0],['Agnes ngina',300,0],['Alphonse muteti',1000,0],['Jacintah muema',100,0],['Gloria kim',500,500],['Steven muutu',200,100],['Erick peter',1000,0],['Victor Mulwa',1000,0],['Joseph David',300,0],['Brian Mwendwa',200,0],['Victor Mutinda',100,0],['Benard Mwongela',500,0],['Mercy Mutie',300,0],['Rose Kiilu',300,0],['Phyllis',500,0],['Eunice Nthambi',300,0],['Benjamin Muthiani',200,0],['Moses Kenyatta',1000,0],['Albanus Muinde',200,0],['Esther Nzilani',100,0],['Edna Katunge',100,0],['Mary Kavesu',200,0],['Faith Nzula',100,0],['Fidelis Nzau',200,200],['Angela Mueni',200,0],['Dancun Muthiani',300,0],['Boniface Kyalo',100,100],['Ian Muinde',50,0],['Caleb Mutie',100,0],['Catherine Kamene',150,0],['Felix Makau',100,0],['Maxwell Mwendwa',100,0],['Samuel Ndola',300,0],['Wambua Mutosya',200,0],['Agnes Mbinya',200,200]
].map((row, index) => ({ id: `harambee_${index + 1}`, name: row[0], pledgedAmount: row[1], redeemedAmount: row[2] }));

const HARAMBEE_CAMPAIGN = { id: 'youth-projects-harambee-2026-11-15', title: 'YOUTH PROJECTS HARAMBEE', date: '15th NOV 2026', paidTotal: 1800, outstandingPledges: 15600, projectTotal: 17400 };
// Kept separate from the pledge campaign version.  This marks the one-time
// move of the previous (107-name) pledge register into the names-only church
// directory, without ever mixing it back into the 48-person Harambee round.
const YOUTH_DIRECTORY_MIGRATION_VERSION = 'church-youth-directory-v2';

let fallbackData = {
    members: [],
    pending: [],
    jumuiyaSubmissions: [],
    polls: [],
    archives: [],
    targetAmount: 500000,
    jumuiyaTargets: {},
    contributionStatus: 'open',
    contributionHistory: [],
    pledgeStatus: 'open',
    pledgeHistory: [],
    youthMembers: YOUTH_MEMBER_NAMES.map((name, i) => ({ id: 'youth_member_' + (i + 1), name })),
    jumuiyaPledgeLinks: [],
    pledgeCampaign: HARAMBEE_CAMPAIGN,
    pledgeMigrationVersion: HARAMBEE_CAMPAIGN.id,
    youthDirectoryMigrationVersion: YOUTH_DIRECTORY_MIGRATION_VERSION,
    pledges: HARAMBEE_PLEDGES,
    /* Legacy seed retained below only so older deployments can migrate its
       names into youthMembers. It is no longer the active pledge register. */
    legacyPledges: [
        'Diana katile','Dennis sammy','Joanne Nduku','Matilda ann','Patric Mutiso','Joseph mulei','Sam art kid',
        'Charity ndunge','Dancun mutuku','Samuel Ndola','Robert Wambua','Francis mutoni','Lydia ndunge','Dennis kaseke',
        'Urbanus sammy','Ruth Kioko','Esther nthenya','Steve kiilu','Brian musau','Alice mutave','Maureen kioko',
        'Kaloki sammy','Urbanus mutisya','Maryann Koki','Faith munyiva','Mary kiilu','Diana nwende','Caro mutio',
        'Emily mbatha','Joseph ndiku','Antony kioko','Mitchell Muema','Leonard mwiso','Janet Ngelele','Faith ndunge',
        'Vivian ndunge','Jayden wambua','Judith ndila','marceline ndinda','Catherine kaluki','Dennis makato',
        'Mercy muthoki','Kavesu Nzuki','Ann kamene','Maureen Muema','Kennedy kioko','Janet Wanza','Gloria Mwende',
        'Bridgit Wavinya','Magdalene musau','Cellina mukulu','Jane ndinda','Janet munyiva','Purity nthambi',
        'Susan Katunge','Maureen kalekye','Dennis muema','Catherine mbatha','Diana musyawa','Agnes ngina',
        'Alphonse muteti','Mary musyoki','simon muya','sharleen kioko','Claudia kennedy','Diana kennedy',
        'Dennus kiswii','Jacintah muema','Simon kasivu','Cynthia syokau','Peter mwangangi','Gloria kim',
        'Jackline muthoki','Joseph mutinda','Betty mutindi','Allan muli','Vincent muthama','Steven muutu',
        'Bonface william','Fidelis kimani','Annafemmi','Caroline muema','James kilele','John mutinda',
        'Dennis wambua','Cecilia Mulinge','Innocent muthusi','Dennis kasivu','Rechael ndolo','Cynthia munyao',
        'Agie kasiva','Erick peter','Ostin kilonzo','Samantha wangai','Agape Nzomo'
    ].map((name, i) => ({ id: 'seed_' + (i + 1), name, pledgedAmount: 0, redeemedAmount: 0 })),
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
    mentors: [],
    privateMessages: [],
    loginLogs: []
};

function normalizedName(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function creditPledgePayment(pledges, name, amount) {
    const received = Number(amount || 0);
    if (!received) return { pledges, matched: false };
    let matched = false;
    const updated = (pledges || []).map(p => {
        if (normalizedName(p.name) !== normalizedName(name)) return p;
        matched = true;
        return { ...p, redeemedAmount: Number(p.redeemedAmount || 0) + received };
    });
    return { pledges: updated, matched };
}

function getPledgeSummary(pledges) {
    const pledged = (pledges || []).reduce((sum, p) => sum + Number(p.pledgedAmount || 0), 0);
    const paid = (pledges || []).reduce((sum, p) => sum + Number(p.redeemedAmount || 0), 0);
    return { pledged, paid, balance: Math.max(0, pledged - paid) };
}

async function readData() {
    if (!db) return fallbackData;
    try {
        let doc = await db.collection('portal_data').findOne({ _id: 'main_store' });
        if (!doc) {
            await db.collection('portal_data').insertOne({ _id: 'main_store', ...fallbackData });
            return fallbackData;
        }
        // The v2 separation deliberately uses the current old pledge rows as
        // the official church names list exactly once. The screenshoted
        // 107-row table is therefore moved intact to Youth Members, and the
        // only live financial register becomes the 48-person Harambee list.
        const isNewHarambeeRegister = doc.pledgeMigrationVersion === HARAMBEE_CAMPAIGN.id;
        const needsListSeparation = doc.youthDirectoryMigrationVersion !== YOUTH_DIRECTORY_MIGRATION_VERSION;
        const oldRegister = needsListSeparation && (doc.pledges || []).length
            ? doc.pledges
            : ((doc.youthMembers && doc.youthMembers.length) ? doc.youthMembers : fallbackData.legacyPledges);
        const migratedYouthMembers = oldRegister
            .map((p, i) => ({ id: (p && p.id) || `youth_member_${i + 1}`, name: typeof p === 'string' ? p : p.name }))
            .filter(p => p.name);
        const result = {
            members: doc.members || fallbackData.members,
            pending: doc.pending || fallbackData.pending,
            jumuiyaSubmissions: doc.jumuiyaSubmissions || fallbackData.jumuiyaSubmissions,
            polls: doc.polls || fallbackData.polls,
            archives: doc.archives || fallbackData.archives,
            targetAmount: doc.targetAmount !== undefined ? doc.targetAmount : fallbackData.targetAmount,
            jumuiyaTargets: doc.jumuiyaTargets || fallbackData.jumuiyaTargets,
            contributionStatus: doc.contributionStatus || fallbackData.contributionStatus,
            contributionHistory: doc.contributionHistory || fallbackData.contributionHistory,
            pledgeStatus: doc.pledgeStatus || fallbackData.pledgeStatus,
            pledgeHistory: doc.pledgeHistory || fallbackData.pledgeHistory,
            youthMembers: migratedYouthMembers.length ? migratedYouthMembers : fallbackData.youthMembers,
            jumuiyaPledgeLinks: doc.jumuiyaPledgeLinks || fallbackData.jumuiyaPledgeLinks,
            pledgeCampaign: needsListSeparation ? HARAMBEE_CAMPAIGN : (doc.pledgeCampaign || HARAMBEE_CAMPAIGN),
            pledgeMigrationVersion: HARAMBEE_CAMPAIGN.id,
            youthDirectoryMigrationVersion: YOUTH_DIRECTORY_MIGRATION_VERSION,
            pledges: needsListSeparation ? HARAMBEE_PLEDGES : (doc.pledges || HARAMBEE_PLEDGES),
            events: doc.events || fallbackData.events,
            messages: doc.messages || fallbackData.messages,
            readings: doc.readings || fallbackData.readings,
            passwordRequests: doc.passwordRequests || fallbackData.passwordRequests,
            hymns: doc.hymns || fallbackData.hymns,
            candles: doc.candles || fallbackData.candles,
            memorialNames: doc.memorialNames || fallbackData.memorialNames,
            prayerPoints: doc.prayerPoints || fallbackData.prayerPoints,
            mentors: doc.mentors || fallbackData.mentors,
            privateMessages: doc.privateMessages || fallbackData.privateMessages,
            loginLogs: doc.loginLogs || fallbackData.loginLogs
        };
        // Persist the separation the first time the upgraded server reads the
        // old database. This prevents a later edit from reusing old pledge
        // rows as the active campaign.
        if (needsListSeparation || !isNewHarambeeRegister) {
            await db.collection('portal_data').updateOne(
                { _id: 'main_store' },
                { $set: {
                    youthMembers: result.youthMembers,
                    youthDirectoryMigrationVersion: YOUTH_DIRECTORY_MIGRATION_VERSION,
                    pledgeMigrationVersion: HARAMBEE_CAMPAIGN.id,
                    pledgeCampaign: result.pledgeCampaign,
                    pledges: result.pledges
                } }
            );
        }
        return result;
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

// Coarse device category only (mobile / tablet / desktop) from the
// browser's own User-Agent string — the same information any web server
// already sees on every request. No fingerprinting, no precise device
// model, no location.
function categorizeDevice(userAgent) {
    const ua = (userAgent || '').toLowerCase();
    if (/ipad|tablet|playbook|silk/.test(ua) && !/mobile/.test(ua)) return 'tablet';
    if (/mobi|android|iphone|ipod|blackberry|windows phone/.test(ua)) return 'mobile';
    return 'desktop';
}

// An event automatically becomes "past" once its date's day has fully
// elapsed. Events with an unparseable date (e.g. old free-text entries
// like "Next Sunday at 10:00 AM") are treated as upcoming rather than
// guessed at, since we can't safely tell.
function isEventPast(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const endOfEventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    return endOfEventDay.getTime() < Date.now();
}

function splitEvents(events) {
    const upcoming = [];
    const past = [];
    (events || []).forEach(ev => {
        if (isEventPast(ev.date)) past.push(ev); else upcoming.push(ev);
    });
    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
    past.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { upcoming, past };
}

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
    let out = html;
    out = /<\/head>/i.test(out)
        ? out.replace(/<\/head>/i, `    ${linkTag}\n</head>`)
        : linkTag + out;
    out = out.replace(/(<body[^>]*>)/i, `$1\n<div class="app-shell">`);
    out = out.replace(/(<\/body>)/i, `</div><!-- /.app-shell -->\n$1`);
    return out;
}

function sendShelledPage(res, filename) {
    // Support the original single-folder deployment as well as an optional
    // public/ folder. This lets an existing host keep all HTML/CSS/JS files
    // beside server.js without breaking the named routes.
    const publicDir = fs.existsSync(path.join(__dirname, 'public')) ? path.join(__dirname, 'public') : __dirname;
    const filePath = path.join(publicDir, filename);
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
app.use(express.static(fs.existsSync(path.join(__dirname, 'public')) ? path.join(__dirname, 'public') : __dirname));


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
// If GEMINI_API_KEY is configured, it upgrades to a real conversational
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
        const q = question.toLowerCase().trim();

        // ---- Greetings get an instant, warm reply — no "thinking" needed ----
        if (/^(hi|hello|hey|yo|howdy|good\s?(morning|afternoon|evening|day)|habari|niaje|mambo|sasa)\b[!.,\s]*$/.test(q)) {
            const greetings = [
                'Hello! Peace be with you. What can I help you with on the portal today?',
                "Hi there! I'm the St. Michael Companion — ask me anything about the portal.",
                'Habari! How can I help you with the portal today?'
            ];
            return res.json({ success: true, answer: greetings[Math.floor(Math.random() * greetings.length)], escalate: false, mode: 'greeting' });
        }

        const member = currentUser
            ? (data.members || []).find(m => (m.name || '').toLowerCase() === String(currentUser).toLowerCase())
            : null;
        const nextEvent = (data.events || [])[0] || null;
        const currentReading = (data.readings || [])[0] || null;
        const mentorForMember = member
            ? (data.mentors || []).find(m => (m.group || '').toLowerCase() === (member.group || '').toLowerCase())
            : null;

        // ---- Build today's live contribution totals (same logic used
        // elsewhere in the portal) so the assistant can answer accurately
        // and offer a real downloadable report. ----
        const contributionsMap = {};
        JUMUIYAS_LIST.forEach(j => { contributionsMap[j.name] = 0; });
        (data.jumuiyaSubmissions || []).forEach(r => {
            if (r.published) {
                const matched = JUMUIYAS_LIST.find(j => normalize(j.name) === normalize(r.jumuiyaName));
                if (matched) contributionsMap[matched.name] += Number(r.amount || 0);
            }
        });
        const totalCollected = Object.values(contributionsMap).reduce((a, b) => a + b, 0);
        const lastClosedReport = (data.contributionHistory || [])[(data.contributionHistory || []).length - 1] || null;

        // A member's personal giving summary is calculated on the server from
        // both the ordinary contribution records and the separate pledge
        // register. This is deterministic: it works even if an AI provider is
        // unavailable, and it never exposes another member's figures.
        const sameMember = entry => normalize(entry && entry.name) === normalize(currentUser);
        const sumRecords = records => (records || []).filter(r => r.published && sameMember(r)).reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const currentContributionTotal = sumRecords(data.jumuiyaSubmissions);
        const pastContributionTotal = (data.contributionHistory || []).reduce((sum, period) => sum + sumRecords(period.submissions), 0);
        const pledgeRedeemed = pledges => (pledges || []).filter(sameMember).reduce((sum, p) => sum + Number(p.redeemedAmount || 0), 0);
        const pledgePromised = pledges => (pledges || []).filter(sameMember).reduce((sum, p) => sum + Number(p.pledgedAmount || 0), 0);
        const pastPledgeRedeemed = (data.pledgeHistory || []).reduce((sum, period) => sum + pledgeRedeemed(period.pledges), 0);
        const pastPledgePromised = (data.pledgeHistory || []).reduce((sum, period) => sum + pledgePromised(period.pledges), 0);
        const livePledgeRedeemed = data.pledgeStatus === 'closed' ? 0 : pledgeRedeemed(data.pledges);
        const livePledgePromised = data.pledgeStatus === 'closed' ? 0 : pledgePromised(data.pledges);
        const personalContributions = currentContributionTotal + pastContributionTotal;
        const personalRedeemed = livePledgeRedeemed + pastPledgeRedeemed;
        const personalPromised = livePledgePromised + pastPledgePromised;

        if (currentUser && /\b(my|mine|i['’]?ve|i have|i gave|i paid|myself)\b/i.test(q) && /contribut|giving|donation|offering|collection|pledge|redeem|paid|total|amount|balance/i.test(q)) {
            const remaining = Math.max(0, personalPromised - personalRedeemed);
            return res.json({
                success: true,
                answer: `Your recorded giving total is KES ${personalContributions.toLocaleString()} from approved contributions, plus KES ${personalRedeemed.toLocaleString()} redeemed from pledges. Your combined amount given is KES ${(personalContributions + personalRedeemed).toLocaleString()}. Your recorded pledge amount is KES ${personalPromised.toLocaleString()}${personalPromised ? `, leaving KES ${remaining.toLocaleString()} to redeem.` : '.'}`,
                escalate: false,
                mode: 'personal-giving',
                giving: { contributions: personalContributions, redeemed: personalRedeemed, promised: personalPromised, total: personalContributions + personalRedeemed }
            });
        }

        // ---- Contribution report request: offer a real CHOICE between the
        // current period and any past (closed) periods, instead of guessing
        // which one the question meant. The front-end fetches full detail
        // for whichever one is picked via /api/youth/contribution-report. ----
        if (/contribut\w*|giving|donation|offering|collection/i.test(q) && /report|download|last|history|summary|figures|list|breakdown|export|file|excel|pdf|past|previous|closed|record|who (gave|paid|contributed)/i.test(q)) {
            const options = [
                { key: 'current', label: `Current period — KES ${Number(totalCollected).toLocaleString()} collected so far` }
            ];
            (data.contributionHistory || []).slice().reverse().forEach(r => {
                options.push({ key: r.id, label: `Closed ${r.closedAtDisplay || ''} — KES ${Number(r.totalCollected || 0).toLocaleString()} collected` });
            });
            return res.json({
                success: true,
                answer: 'Which contribution report would you like to download?',
                escalate: false,
                mode: 'report-choice',
                reportOptions: options
            });
        }

        // ---- Parish/portal-specific questions answered from real portal
        // data ----
        function parishAnswer() {
            if (/mentor/.test(q)) {
                if (mentorForMember) return `Your mentor for ${mentorForMember.month || 'this period'} is ${mentorForMember.mentorName}${mentorForMember.mentorContact ? ` (${mentorForMember.mentorContact})` : ''}.`;
                return "I don't have a mentor on file for your group yet — I'll connect you to an admin.";
            }
            if (/camp|event|upcoming|schedule/.test(q)) {
                if (nextEvent) return `The next event is "${nextEvent.title}" — ${nextEvent.date}. ${nextEvent.description || ''}`.trim();
                return "There's nothing on the events calendar yet.";
            }
            if (/gospel|\bmass\b|psalm|scripture|daily reading/.test(q)) {
                if (currentReading) return `This week's readings are posted under "${currentReading.title}" — check the Mass Readings section on the homepage for the full text. For the full daily readings calendar, USCCB.org has the complete official version.`;
                return "Readings haven't been posted yet. For the full daily readings calendar, USCCB.org has the complete official version.";
            }
            if (/contact|admin\b|leader|moderator|phone|reach|call/.test(q)) {
                return 'You can reach the youth board directly: ' + YOUTH_BOARD_CONTACTS.map(c => `${c.role} ${c.name} (${c.phone})`).join(', ') + '.';
            }
            if (/hymn|song|music/.test(q)) {
                const titles = (data.hymns || []).slice(0, 6).map(h => h.title);
                if (titles.length) return `A few songs in our hymnal: ${titles.join(', ')}. Check the homepage Hymnal section for the full list.`;
                return 'No songs have been added to the hymnal yet — check the homepage Hymnal section.';
            }
            if (/candle/.test(q)) {
                return 'You can light a virtual prayer candle from the Prayer Sanctuary section on the homepage, or a Global Prayer Globe intention from the dashboard.';
            }
            if (/^pray|[^a-z]pray/.test(q)) {
                return 'You can find traditional Catholic prayers, light a virtual prayer candle, or add an intention to the Global Prayer Globe. See the Prayer Sanctuary section on the homepage, or visit the Prayer Resources card for the full USCCB prayer collection.';
            }
            if (/sacrament/.test(q)) {
                return 'An overview of the seven sacraments — Baptism, Confirmation, Eucharist, Penance, Anointing of the Sick, Holy Orders, and Matrimony — is in the Catholic Resources & Guides section on the homepage, with a link to the full USCCB guide.';
            }
            if (/\bthe mass\b|liturgy of the mass|order of mass/.test(q)) {
                return 'What each part of the Mass means, from the Introductory Rites through the Liturgy of the Word and Eucharist to the Concluding Rites, is covered in the Catholic Resources & Guides section on the homepage, with a link to the full USCCB guide.';
            }
            if (/liturgy of the hours|breviary|divine office/.test(q)) {
                return "The Church's daily cycle of prayer — psalms, readings, and canticles — is covered in the Catholic Resources & Guides section on the homepage, with a link to the full USCCB guide.";
            }
            if (/liturgical year|liturgical calendar|advent|lent|easter|christmas|ordinary time|season/.test(q)) {
                const lit = getLiturgicalInfo(new Date());
                return `We're currently in ${lit.seasonName} (${lit.colorName}). ${lit.note} See the Liturgical Year & Calendar card on the homepage for the full guide.`;
            }
            if (/rosary/.test(q)) {
                return "The full Holy Rosary guide — all four sets of Mysteries — is on the homepage under 'The Holy Rosary'.";
            }
            if (/stations of the cross|way of the cross/.test(q)) {
                return 'All 14 Stations of the Cross, with meditations, are on the homepage under "The Way of the Cross".';
            }
            if (/memorial/.test(q)) {
                const names = (data.memorialNames || []).length;
                return names ? `There are ${names} names on the Memorial Wall — you can view them on the dashboard.` : 'No names have been added to the Memorial Wall yet.';
            }
            if (/saint/.test(q)) {
                const saint = getSaintOfDay(new Date());
                return `Today's featured saint is ${saint.name} (feast day: ${saint.feastDay}). ${saint.blurb}`;
            }
            if (/globe/.test(q)) {
                return 'The Global Prayer Globe lets you drop a prayer intention pin from wherever you are — find it on your dashboard.';
            }
            if (/register|sign ?up|join|how do i (join|register)/.test(q)) {
                return 'New members can register from the Sign Up button on the homepage — an admin approves new registrations before you can log in.';
            }
            if (/password|forgot|reset/.test(q)) {
                return 'If you forgot your password, use the password reset option on the login page — an admin will need to approve the reset before your new password works.';
            }
            if (/setting|preference|theme|dark mode|light mode|language|kiswahili|profile/.test(q)) {
                return 'Open your Profile from the top of the dashboard to edit your details, and to change theme (light/dark), language (English/Kiswahili), and other preferences.';
            }
            if (/community board|message board|post a message/.test(q)) {
                return 'The Community Board on your dashboard is where members post messages and questions publicly — anyone can post there.';
            }
            if (/private message|message admin|contact admin directly/.test(q)) {
                return "You have a private message thread with the admin on your dashboard — anything you send there, or that I escalate for you, only the admin can see.";
            }
            if (/jumuiya portal/.test(q)) {
                return "The Jumuiya Portal is where each Jumuiya's group admin submits that group's contributions — it's a separate login from the member dashboard.";
            }
            if (/what can you (do|help)|help me|who are you|what are you/.test(q)) {
                return "I'm the St. Michael Companion — the portal's support assistant. Ask me about events, readings, the Mass, sacraments, prayers, the Rosary, hymns, mentors, contacts, the Memorial Wall, prayer candles, or contribution reports, and I'll pull it straight from the portal for you.";
            }
            return null;
        }
        const directAnswer = parishAnswer();
        if (directAnswer) {
            const escalate = /don'?t have|haven'?t been (added|posted)|nothing on the/i.test(directAnswer);
            return res.json({ success: true, answer: directAnswer, escalate, mode: 'rules' });
        }

        // ---- If a Gemini key is configured, use it — but strictly scoped
        // to the portal itself, not general knowledge. This is the parish's
        // support assistant, not a general-purpose chatbot. ----
        if (process.env.GEMINI_API_KEY) {
            try {
                const contextLines = [
                    `Next event: ${nextEvent ? `${nextEvent.title} — ${nextEvent.date}. ${nextEvent.description || ''}` : 'None scheduled yet.'}`,
                    `Current Mass readings title: ${currentReading ? currentReading.title : 'Not posted yet.'}`,
                    `Youth board contacts: ${YOUTH_BOARD_CONTACTS.map(c => `${c.role} ${c.name} (${c.phone})`).join('; ')}`,
                    member ? `This member's group: ${member.group || 'unknown'}.` : `The asker is not logged in or not matched to a member record.`,
                    mentorForMember ? `Their assigned mentor: ${mentorForMember.mentorName} (${mentorForMember.mentorContact || 'no contact on file'}), for ${mentorForMember.month || 'the current period'}.` : `No mentor is on file for this member's group yet.`,
                    `Hymnal titles: ${(data.hymns || []).slice(0, 15).map(h => h.title).join(', ') || 'none added yet'}.`,
                    `Memorial Wall: ${(data.memorialNames || []).length} names on file.`,
                    `Contribution status: ${data.contributionStatus || 'open'}. Total collected this period: KES ${Number(totalCollected).toLocaleString()}, target: KES ${Number(data.targetAmount || 0).toLocaleString()}.`,
                    member ? `Personal financial summary for this logged-in member only: approved contribution total KES ${personalContributions.toLocaleString()}; pledge redeemed KES ${personalRedeemed.toLocaleString()}; pledged KES ${personalPromised.toLocaleString()}; combined amount given KES ${(personalContributions + personalRedeemed).toLocaleString()}.` : 'No personal financial summary is available because the asker is not matched to a logged-in member.',
                    `Portal features members can be pointed to: Homepage (readings, prayers, rosary, Stations of the Cross, hymnal, prayer candles), Member Dashboard (events, contributions chart, pledge list, community board, mentor lookup, saint of the day, spiritual fire, private messages with admin), Jumuiya Portal (submitting parish contributions), Admin Portal (staff only).`
                ].join('\n');

                const systemPrompt = `You are the "St. Michael Companion", the SUPPORT ASSISTANT for the St. Michael Kasaini Youth Portal ONLY. You must ONLY answer questions about this portal, its features, and this parish (events, readings, mentors, contacts, hymnal, contributions, memorial wall, prayer candles, saints, liturgical season, how to use the site). Do NOT answer general-knowledge questions, current events, or anything unrelated to this portal or parish — if asked something off-topic, politely say that's outside what you can help with here and that you're the portal's support assistant, then offer to connect them to an admin if it's parish-related. Keep answers concise (2-4 sentences). Use the portal information below; never invent facts not listed here.\n\nPortal information:\n${contextLines}`;

                const apiRes = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': process.env.GEMINI_API_KEY
                        },
                        body: JSON.stringify({
                            systemInstruction: { parts: [{ text: systemPrompt }] },
                            contents: [{ role: 'user', parts: [{ text: question }] }],
                            generationConfig: { maxOutputTokens: 220, temperature: 0.4 }
                        })
                    }
                );
                const json = await apiRes.json();
                const answer = json && json.candidates && json.candidates[0]
                    && json.candidates[0].content && json.candidates[0].content.parts
                    && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text;
                if (answer) {
                    const escalate = /don'?t (know|have)|not sure|connect you|no information|not confident/i.test(answer);
                    return res.json({ success: true, answer: answer.trim(), escalate, mode: 'ai' });
                }
            } catch (e) {
                // Fall through to the plain escalation below.
            }
        }

        return res.json({ success: true, answer: "That's outside what I can help with here — I'm the portal's support assistant. I'll connect you directly to an admin.", escalate: true, mode: 'none' });
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
    const pledgeNames = new Set((data.pledges || []).map(p => normalizedName(p.name)));
    // Only names are exposed to a Jumuiya. Financial amounts remain in the
    // central Harambee register; this list is a Jumuiya membership link.
    const registeredPledgeMembers = members.filter(m => pledgeNames.has(normalizedName(m.name))).map(m => ({ id: m.id, name: m.name }));
    const linkedPledgeMembers = (data.jumuiyaPledgeLinks || []).filter(link => normalize(link.jumuiya) === targetNorm).map(link => ({ id: link.id, name: link.name }));
    const seenPledgeNames = new Set();
    const pledgedMembers = [...registeredPledgeMembers, ...linkedPledgeMembers].filter(member => {
        const key = normalizedName(member.name); if (seenPledgeNames.has(key)) return false; seenPledgeNames.add(key); return true;
    });
    // These two tables are derived from the official approved directory. A
    // person's selected Jumuiya controls where their named records appear;
    // no one is added simply because their name is similar in a raw list.
    const activePledgeEntries = (data.pledgeStatus === 'closed' ? [] : (data.pledges || [])).map(p => ({ ...p, period: (data.pledgeCampaign || HARAMBEE_CAMPAIGN).title, date: (data.pledgeCampaign || HARAMBEE_CAMPAIGN).date }));
    const historicalPledgeEntries = (data.pledgeHistory || []).flatMap(period => (period.pledges || []).map(p => ({ ...p, period: (period.campaign || {}).title || 'Past pledge round', date: (period.campaign || {}).date || period.closedAtDisplay || '' })));
    const allPledgeEntries = [...activePledgeEntries, ...historicalPledgeEntries];
    const registeredMemberPledges = members.map(member => {
        const entries = allPledgeEntries.filter(entry => normalizedName(entry.name) === normalizedName(member.name));
        if (!entries.length) return null;
        const pledged = entries.reduce((sum, entry) => sum + Number(entry.pledgedAmount || 0), 0);
        const paid = entries.reduce((sum, entry) => sum + Number(entry.redeemedAmount || 0), 0);
        return { memberId: member.id, name: member.name, pledged, paid, balance: Math.max(0, pledged - paid), entries: entries.map(({ period, date, pledgedAmount, redeemedAmount }) => ({ period, date, pledgedAmount: Number(pledgedAmount || 0), paidAmount: Number(redeemedAmount || 0) })) };
    }).filter(Boolean);
    const activeContributionEntries = (data.jumuiyaSubmissions || []).filter(s => s.published).map(s => ({ ...s, period: 'Current contribution period' }));
    const historicalContributionEntries = (data.contributionHistory || []).flatMap(period => (period.submissions || []).filter(s => s.published).map(s => ({ ...s, period: `Closed ${period.closedAtDisplay || 'contribution period'}` })));
    const allContributionEntries = [...activeContributionEntries, ...historicalContributionEntries];
    const registeredMemberContributions = members.map(member => {
        const entries = allContributionEntries.filter(entry => normalizedName(entry.name) === normalizedName(member.name));
        if (!entries.length) return null;
        return { memberId: member.id, name: member.name, amount: entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0), entries: entries.map(entry => ({ amount: Number(entry.amount || 0), purpose: entry.purpose || 'Other', period: entry.period })) };
    }).filter(Boolean);
    const registeredPledgeTotals = registeredMemberPledges.reduce((totals, record) => ({
        participants: totals.participants + 1,
        pledged: totals.pledged + record.pledged,
        paid: totals.paid + record.paid,
        balance: totals.balance + record.balance
    }), { participants: 0, pledged: 0, paid: 0, balance: 0 });
    const registeredContributionTotals = registeredMemberContributions.reduce((totals, record) => ({
        participants: totals.participants + 1,
        amount: totals.amount + record.amount
    }), { participants: 0, amount: 0 });
    
    let jumuiyaTotal = 0;
    submissions.forEach(s => {
        if (s.published) jumuiyaTotal += Number(s.amount || 0);
    });
    const contributionHistory = (data.contributionHistory || []).map(period => ({
        id: period.id,
        closedAtDisplay: period.closedAtDisplay,
        total: (period.submissions || []).filter(s => normalize(s.jumuiyaName) === targetNorm && s.published).reduce((sum, s) => sum + Number(s.amount || 0), 0),
        submissions: (period.submissions || []).filter(s => normalize(s.jumuiyaName) === targetNorm && s.published)
    }));

    res.json({ 
        success: true, 
        submissions, 
        members,
        pledgedMembers,
        registeredMemberPledges,
        registeredMemberContributions,
        registeredPledgeTotals,
        registeredContributionTotals,
        contributionHistory,
        jumuiyaTotal,
        jumuiyaTarget: (data.jumuiyaTargets && jumuiyaName) ? (data.jumuiyaTargets[jumuiyaName] || 0) : 0,
        contributionStatus: data.contributionStatus || 'open',
        validPurposes: VALID_PURPOSES 
    });
});

app.post('/api/jumuiya/submit-record', async (req, res) => {
    const { jumuiyaName, name, amount, purpose } = req.body;
    if (!name || !jumuiyaName) return res.json({ success: false, message: 'Missing fields.' });
    const data = await readData();
    if (data.contributionStatus === 'closed') {
        return res.json({ success: false, message: 'This contribution period is closed. Please check back once a new one has started.' });
    }
    const cleanPurpose = VALID_PURPOSES.includes(purpose) ? purpose : 'Other';
    const cleanAmount = parseFloat(amount) || 0;
    const submissions = [...(data.jumuiyaSubmissions || []), {
        id: Date.now().toString(),
        jumuiyaName,
        name: name.trim(),
        amount: cleanAmount,
        purpose: cleanPurpose,
        published: false
    }];
    // A payment submitted specifically as a Youth pledge is credited to the
    // matching pledge name immediately; registration records are untouched.
    const credit = cleanPurpose === 'Youth pledge' && data.pledgeStatus !== 'closed'
        ? creditPledgePayment(data.pledges || [], name, cleanAmount)
        : { pledges: data.pledges || [], matched: false };
    await writeData({ jumuiyaSubmissions: submissions, pledges: credit.pledges });
    res.json({ success: true, message: credit.matched ? 'Payment submitted and pledge balance updated.' : 'Submitted successfully!' });
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

// Lightweight list of contribution periods (current + past) so members
// and the Companion assistant can offer a real choice instead of guessing
// which one someone means.
app.get('/api/youth/contribution-periods', async (req, res) => {
    const data = await readData();
    let totalCollected = 0;
    (data.jumuiyaSubmissions || []).forEach(r => { if (r.published) totalCollected += Number(r.amount || 0); });
    const current = {
        key: 'current',
        label: data.contributionStatus === 'closed' ? 'Current period (closed, not yet archived)' : 'Current contribution period',
        totalCollected,
        targetAmount: data.targetAmount || 0,
        status: data.contributionStatus || 'open'
    };
    const past = (data.contributionHistory || []).slice().reverse().map(r => ({
        key: r.id,
        label: `Closed ${r.closedAtDisplay || ''}`,
        totalCollected: r.totalCollected || 0,
        targetAmount: r.targetAmount || 0,
        status: 'closed'
    }));
    res.json({ success: true, current, past });
});

// Full detail for one period — 'current' for the live period, or a
// contributionHistory id for a past one. Same shape either way, so the
// front-end can generate the PDF/Excel identically for both.
app.get('/api/youth/contribution-report', async (req, res) => {
    const data = await readData();
    const period = req.query.period || 'current';

    if (period === 'current') {
        const contributionsMap = {};
        JUMUIYAS_LIST.forEach(j => { contributionsMap[j.name] = 0; });
        (data.jumuiyaSubmissions || []).forEach(r => {
            if (r.published) {
                const matched = JUMUIYAS_LIST.find(j => normalize(j.name) === normalize(r.jumuiyaName));
                if (matched) contributionsMap[matched.name] += Number(r.amount || 0);
            }
        });
        const totalCollected = Object.values(contributionsMap).reduce((a, b) => a + b, 0);
        return res.json({
            success: true,
            report: {
                label: data.contributionStatus === 'closed' ? 'Current contribution period (closed)' : 'Current contribution period (open)',
                contributionsMap,
                jumuiyaTargets: data.jumuiyaTargets || {},
                targetAmount: data.targetAmount || 0,
                totalCollected,
                submissions: (data.jumuiyaSubmissions || []).filter(s => s.published)
            }
        });
    }

    const record = (data.contributionHistory || []).find(r => r.id === period);
    if (!record) return res.status(404).json({ success: false, message: 'That contribution period was not found.' });
    res.json({
        success: true,
        report: {
            label: `Closed contribution period (${record.closedAtDisplay || 'archived'})`,
            contributionsMap: record.contributionsMap || {},
            jumuiyaTargets: record.jumuiyaTargets || {},
            targetAmount: record.targetAmount || 0,
            totalCollected: record.totalCollected || 0,
            submissions: record.submissions || []
        }
    });
});

// Public pledge view. The member directory is deliberately not returned here.
app.get('/api/youth/pledges', async (req, res) => {
    const data = await readData();
    const closed = data.pledgeStatus === 'closed';
    const summary = getPledgeSummary(data.pledges || []);
    res.json({
        success: true,
        status: closed ? 'closed' : 'open',
        pledges: (data.pledges || []).map(p => closed
            ? { id: p.id, name: p.name }
            : { id: p.id, name: p.name, pledgedAmount: Number(p.pledgedAmount || 0), redeemedAmount: Number(p.redeemedAmount || 0) }),
        campaign: { ...(data.pledgeCampaign || HARAMBEE_CAMPAIGN), paidTotal: summary.paid, outstandingPledges: summary.balance, projectTotal: summary.pledged },
        history: (data.pledgeHistory || []).map(h => ({ id: h.id, closedAtDisplay: h.closedAtDisplay, count: (h.pledges || []).length }))
    });
});

app.get('/api/youth/members-list', async (req, res) => {
    const data = await readData();
    res.json({ success: true, members: (data.youthMembers || []).map((m, index) => ({ id: m.id, name: m.name, number: index + 1 })) });
});

app.get('/api/youth/pledges/history/:id', async (req, res) => {
    const data = await readData();
    const record = (data.pledgeHistory || []).find(h => h.id === req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Pledge history was not found.' });
    res.json({ success: true, record: { id: record.id, closedAtDisplay: record.closedAtDisplay, pledges: record.pledges || [] } });
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
        contributionStatus: data.contributionStatus || 'open',
        reflection,
        patronSaint,
        validPurposes: VALID_PURPOSES
    });
});

// Profile data is intentionally a small dedicated request. It keeps the
// account drawer usable even if a slow reflection, chart, or other dashboard
// request fails. Passwords and other members' details are never returned.
app.get('/api/youth/profile', async (req, res) => {
    const requested = String(req.query.member || '').trim().toLowerCase();
    if (!requested) return res.status(400).json({ success: false, message: 'Missing member account.' });
    const data = await readData();
    const member = (data.members || []).find(m => String(m.name || '').trim().toLowerCase() === requested || String(m.customId || '').trim().toLowerCase() === requested);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
    res.json({ success: true, member: {
        name: member.name || '', group: member.group || '', jumuiya: member.jumuiya || '',
        customId: member.customId || '', profilePhoto: member.profilePhoto || '', verified: true
    } });
});

// Personal financial statement: a member sees only rows recorded under their
// own approved account name, across both live and archived periods.
app.get('/api/youth/my-giving', async (req, res) => {
    const requested = String(req.query.member || '').trim();
    if (!requested) return res.status(400).json({ success: false, message: 'Missing member account.' });
    const data = await readData();
    const member = (data.members || []).find(m => normalizedName(m.name) === normalizedName(requested) || normalizedName(m.customId) === normalizedName(requested));
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });
    const mine = entry => normalizedName(entry && entry.name) === normalizedName(member.name);
    const money = value => Math.max(0, Number(value || 0));
    const contributionRow = (entry, period, current) => ({
        type: 'Contribution', period, current, amount: money(entry.amount), purpose: entry.purpose || 'Contribution', date: entry.date || entry.createdAt || ''
    });
    const currentContributions = (data.jumuiyaSubmissions || []).filter(entry => entry.published && mine(entry)).map(entry => contributionRow(entry, 'Current contributions', true));
    const pastContributions = (data.contributionHistory || []).flatMap(history => (history.submissions || []).filter(entry => entry.published && mine(entry)).map(entry => contributionRow(entry, history.closedAtDisplay ? `Past contributions — ${history.closedAtDisplay}` : 'Past contributions', false)));
    const pledgeRow = (entry, period, current) => ({
        type: 'Pledge', period, current, pledged: money(entry.pledgedAmount), paid: money(entry.redeemedAmount), balance: Math.max(0, money(entry.pledgedAmount) - money(entry.redeemedAmount))
    });
    const currentPledges = data.pledgeStatus === 'closed' ? [] : (data.pledges || []).filter(mine).map(entry => pledgeRow(entry, (data.pledgeCampaign || HARAMBEE_CAMPAIGN).title || 'Current pledges', true));
    const pastPledges = (data.pledgeHistory || []).flatMap(history => (history.pledges || []).filter(mine).map(entry => pledgeRow(entry, (history.campaign || {}).title || (history.closedAtDisplay ? `Past pledges — ${history.closedAtDisplay}` : 'Past pledges'), false)));
    const sum = (rows, key) => rows.reduce((total, row) => total + money(row[key]), 0);
    const allContributions = [...currentContributions, ...pastContributions];
    const allPledges = [...currentPledges, ...pastPledges];
    res.json({ success: true, member: { name: member.name, customId: member.customId || '' },
        currentContributions, pastContributions, currentPledges, pastPledges,
        totals: {
            currentContributions: sum(currentContributions, 'amount'), pastContributions: sum(pastContributions, 'amount'),
            contributions: sum(allContributions, 'amount'), pledged: sum(allPledges, 'pledged'), paid: sum(allPledges, 'paid'),
            balance: sum(allPledges, 'balance'), totalGiven: sum(allContributions, 'amount') + sum(allPledges, 'paid')
        }
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
    const listed = [...(data.youthMembers || []), ...(data.pledges || [])].some(entry => normalizedName(entry.name) === normalizedName(name));
    const pending = [...(data.pending || []), { id: Date.now().toString(), name: name.trim(), phone: phone || '', jumuiya: jumuiya || 'St. Michael', group: group || 'Youth General', pass, listedInYouthRecords: listed, date: new Date().toLocaleDateString() }];
    const selectedJumuiya = jumuiya || 'St. Michael';
    const shouldLinkPledge = (data.pledges || []).some(entry => normalizedName(entry.name) === normalizedName(name));
    const existingLink = (data.jumuiyaPledgeLinks || []).some(link => normalizedName(link.name) === normalizedName(name) && normalize(link.jumuiya) === normalize(selectedJumuiya));
    const jumuiyaPledgeLinks = shouldLinkPledge && !existingLink
        ? [...(data.jumuiyaPledgeLinks || []), { id: `jumuiya_pledge_${Date.now()}`, name: name.trim(), jumuiya: selectedJumuiya, linkedAt: new Date().toISOString() }]
        : (data.jumuiyaPledgeLinks || []);
    await writeData({ pending, jumuiyaPledgeLinks });
    res.json({ success: true, message: 'Registered successfully!' });
});

app.post('/api/youth/login', async (req, res) => {
    const { name, pass } = req.body;
    const data = await readData();
    const cleanName = name.trim().toLowerCase();
    const member = (data.members || []).find(m => m.name.toLowerCase() === cleanName);
    if (member) {
        if (member.pass === pass) {
            const loginLogs = [...(data.loginLogs || []), {
                member: member.name,
                timestamp: Date.now(),
                device: categorizeDevice(req.headers['user-agent'])
            }].slice(-2000); // keep the most recent 2000 entries so this never grows unbounded
            await writeData({ loginLogs });
            return res.json({ success: true, name: member.name, jumuiya: member.jumuiya });
        }
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

// Private messages: a two-way channel between one member and the admin.
// Kept entirely separate from the public Community Board (`messages`
// above) — a member's thread is only readable by that member (filtered
// by name here) and by the admin (who sees every thread via
// /api/admin/data). The assistant's "connect me to an admin" escalation
// posts here too, so escalated questions stay private rather than
// showing up on the public board.
app.post('/api/messages/private/send', async (req, res) => {
    try {
        const { member, sender, text } = req.body;
        if (!member || !text || !text.trim()) {
            return res.status(400).json({ success: false, message: 'Missing member or message text.' });
        }
        const data = await readData();
        const privateMessages = [...(data.privateMessages || []), {
            id: Date.now().toString(),
            member: member.trim(),
            sender: sender || member,
            text: text.trim(),
            time: new Date().toLocaleString()
        }];
        await writeData({ privateMessages });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error sending private message.' });
    }
});

// A member fetches only their own thread — the server filters by name
// rather than shipping every member's private messages to every client.
app.get('/api/messages/private', async (req, res) => {
    try {
        const { member } = req.query;
        if (!member) return res.status(400).json({ success: false, message: 'Missing member.' });
        const data = await readData();
        const thread = (data.privateMessages || []).filter(
            m => m.member.trim().toLowerCase() === String(member).trim().toLowerCase()
        );
        res.json({ success: true, messages: thread });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error loading messages.' });
    }
});

app.post('/api/youth/update-profile', async (req, res) => {
    try {
        const { currentUser, password, profilePhoto } = req.body;
        if (!currentUser) return res.status(400).json({ success: false, message: 'Missing member account.' });
        const photo = typeof profilePhoto === 'string' ? profilePhoto : '';
        if (photo && (!/^data:image\/(png|jpe?g|webp);base64,/i.test(photo) || photo.length > 700000)) {
            return res.status(400).json({ success: false, message: 'Use a PNG, JPG, or WebP photo smaller than 500 KB.' });
        }
        const data = await readData();
        const cleanCurrent = currentUser.trim().toLowerCase();
        let found = false;
        let updatedMember = null;
        const members = (data.members || []).map(m => {
            if (m.name.toLowerCase() === cleanCurrent) {
                found = true;
                updatedMember = {
                    ...m,
                    // Identity fields are maintained by the Portal Admin.
                    // Members may change only their password and photo.
                    pass: password && password.trim() ? password.trim() : m.pass,
                    profilePhoto: photo || m.profilePhoto || ''
                };
                return updatedMember;
            }
            return m;
        });
        if (!found) return res.status(404).json({ success: false, message: 'Member not found.' });
        await writeData({ members });
        res.json({ success: true, member: { name: updatedMember.name, group: updatedMember.group, jumuiya: updatedMember.jumuiya, customId: updatedMember.customId, profilePhoto: updatedMember.profilePhoto || '' } });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error updating profile.' });
    }
});

// Master Admin APIs
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const success = username === 'Admin' && password === 'Admin0247';
    const token = success ? crypto.randomBytes(32).toString('hex') : null;
    if (token) adminSessions.add(token);
    res.json({ success, token });
});

app.use('/api/admin', requireAdmin);

// Admin Analytics & User Engagement — login frequency, coarse device
// type breakdown, and per-member activity, aggregated server-side so the
// admin dashboard just renders numbers rather than raw logs.
app.get('/api/admin/analytics', async (req, res) => {
    const data = await readData();
    const logs = data.loginLogs || [];

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
        const dayStart = now - i * DAY;
        const label = new Date(dayStart).toISOString().slice(0, 10);
        const count = logs.filter(l => new Date(l.timestamp).toISOString().slice(0, 10) === label).length;
        last14Days.push({ date: label, count });
    }

    const deviceTotals = { mobile: 0, tablet: 0, desktop: 0 };
    logs.forEach(l => { if (deviceTotals[l.device] !== undefined) deviceTotals[l.device]++; });

    const perMember = {};
    logs.forEach(l => {
        if (!perMember[l.member]) perMember[l.member] = { name: l.member, loginCount: 0, lastLogin: 0, devices: {} };
        perMember[l.member].loginCount++;
        perMember[l.member].lastLogin = Math.max(perMember[l.member].lastLogin, l.timestamp);
        perMember[l.member].devices[l.device] = (perMember[l.member].devices[l.device] || 0) + 1;
    });
    const memberEngagement = Object.values(perMember)
        .map(m => ({
            name: m.name,
            loginCount: m.loginCount,
            lastLogin: m.lastLogin,
            primaryDevice: Object.entries(m.devices).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
        }))
        .sort((a, b) => b.loginCount - a.loginCount);

    const activeLast7Days = new Set(
        logs.filter(l => now - l.timestamp <= 7 * DAY).map(l => l.member)
    ).size;

    res.json({
        success: true,
        totalLogins: logs.length,
        activeLast7Days,
        deviceTotals,
        loginsPerDay: last14Days,
        memberEngagement
    });
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
        contributionHistory: data.contributionHistory || [],
        pledgeStatus: data.pledgeStatus || 'open',
        pledgeHistory: data.pledgeHistory || [],
        pledges: data.pledges || [],
        youthMembers: data.youthMembers || [],
        jumuiyaPledgeLinks: data.jumuiyaPledgeLinks || [],
        pledgeCampaign: { ...(data.pledgeCampaign || HARAMBEE_CAMPAIGN), ...(() => { const s = getPledgeSummary(data.pledges || []); return { paidTotal: s.paid, outstandingPledges: s.balance, projectTotal: s.pledged }; })() },
        targetAmount: data.targetAmount !== undefined ? data.targetAmount : 500000,
        jumuiyaTargets: data.jumuiyaTargets || {},
        contributionStatus: data.contributionStatus || 'open',
        contributionsMap,
        readings: data.readings || [], 
        events: data.events || [], 
        messages: data.messages || [],
        hymns: data.hymns || [],
        candles: data.candles || [],
        memorialNames: data.memorialNames || [],
        mentors: data.mentors || [],
        privateMessages: data.privateMessages || [],
        passwordRequests: data.passwordRequests || [],
        reflection,
        patronSaint,
        validPurposes: VALID_PURPOSES
    });
});

app.post('/api/admin/set-target', async (req, res) => {
    try {
        const { targetAmount, jumuiyaTargets } = req.body;
        let updatePayload = { contributionStatus: 'open' };
        
        if (targetAmount !== undefined) {
            const newTarget = parseFloat(targetAmount);
            if (!isNaN(newTarget)) updatePayload.targetAmount = newTarget;
        }
        
        if (jumuiyaTargets && typeof jumuiyaTargets === 'object') {
            updatePayload.jumuiyaTargets = jumuiyaTargets;
        }

        await writeData(updatePayload);
        res.json({ success: true, targetAmount: fallbackData.targetAmount, jumuiyaTargets: fallbackData.jumuiyaTargets, contributionStatus: fallbackData.contributionStatus });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error updating target amounts.' });
    }
});

// Closes out the current contribution period: snapshots everything into
// history (so it can be reviewed/downloaded later), then clears the live
// submissions and targets so a brand new period can start clean. Setting
// a new target afterward (POST /api/admin/set-target) automatically
// reopens the status — that's the "start a new contribution" signal.
app.post('/api/admin/close-contribution', async (req, res) => {
    try {
        const data = await readData();
        if (data.contributionStatus === 'closed') {
            return res.status(400).json({ success: false, message: 'The contribution period is already closed.' });
        }

        let totalCollected = 0;
        const contributionsMap = {};
        JUMUIYAS_LIST.forEach(j => { contributionsMap[j.name] = 0; });
        (data.jumuiyaSubmissions || []).forEach(r => {
            if (r.published) {
                const amt = Number(r.amount || 0);
                totalCollected += amt;
                const matched = JUMUIYAS_LIST.find(j => normalize(j.name) === normalize(r.jumuiyaName));
                if (matched) contributionsMap[matched.name] += amt;
            }
        });

        const record = {
            id: Date.now().toString(),
            closedAt: new Date().toISOString(),
            closedAtDisplay: new Date().toLocaleString(),
            targetAmount: data.targetAmount || 0,
            jumuiyaTargets: data.jumuiyaTargets || {},
            contributionsMap,
            totalCollected,
            submissions: data.jumuiyaSubmissions || []
        };

        const contributionHistory = [...(data.contributionHistory || []), record];

        await writeData({
            contributionHistory,
            contributionStatus: 'closed',
            jumuiyaSubmissions: [],
            targetAmount: 0,
            jumuiyaTargets: {}
        });

        res.json({ success: true, record, contributionHistory });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error closing the contribution period.' });
    }
});

app.get('/api/admin/contribution-history', async (req, res) => {
    const data = await readData();
    res.json({ success: true, history: data.contributionHistory || [] });
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
        const { id, title, firstReading, psalm, secondReading, alleluia, gospel } = req.body;
        const data = await readData();
        let readings = data.readings || [];
        if (id) {
            readings = readings.map(r => r.id === id ? { ...r, title, firstReading, psalm, secondReading, alleluia, gospel } : r);
        } else {
            readings.push({ id: Date.now().toString(), title, firstReading, psalm, secondReading, alleluia, gospel });
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

app.post('/api/admin/save-pledge', async (req, res) => {
    try {
        const { id, name, pledgedAmount, redeemedAmount } = req.body;
        const cleanName = String(name || '').trim();
        if (!cleanName) return res.status(400).json({ success: false, message: 'A name is required.' });
        const data = await readData();
        if (data.pledgeStatus === 'closed') return res.status(400).json({ success: false, message: 'Start a new pledge round before editing it.' });
        const entry = {
            id: id || `pledge_${Date.now()}`,
            name: cleanName,
            pledgedAmount: Math.max(0, Number(pledgedAmount || 0)),
            redeemedAmount: Math.max(0, Number(redeemedAmount || 0))
        };
        const duplicate = (data.pledges || []).find(p => normalizedName(p.name) === normalizedName(cleanName) && p.id !== entry.id);
        if (duplicate) return res.status(400).json({ success: false, message: 'That name is already in this Harambee register.' });
        const exists = (data.pledges || []).some(p => p.id === entry.id);
        const pledges = exists ? data.pledges.map(p => p.id === entry.id ? entry : p) : [...(data.pledges || []), entry];
        await writeData({ pledges });
        res.json({ success: true, pledges });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Could not save the pledge.' });
    }
});

app.post('/api/admin/save-youth-member', async (req, res) => {
    try {
        const { id, name } = req.body;
        const cleanName = String(name || '').trim();
        if (!cleanName) return res.status(400).json({ success: false, message: 'A member name is required.' });
        const data = await readData();
        const duplicate = (data.youthMembers || []).find(m => normalizedName(m.name) === normalizedName(cleanName) && m.id !== id);
        if (duplicate) return res.status(400).json({ success: false, message: 'That name is already in the Youth Members List.' });
        const entry = { id: id || `youth_member_${Date.now()}`, name: cleanName };
        const exists = (data.youthMembers || []).some(m => m.id === entry.id);
        const youthMembers = exists ? data.youthMembers.map(m => m.id === entry.id ? entry : m) : [...(data.youthMembers || []), entry];
        await writeData({ youthMembers });
        res.json({ success: true, youthMembers });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Could not save the Youth Member.' });
    }
});

app.post('/api/admin/delete-youth-member', async (req, res) => {
    const data = await readData();
    const youthMembers = (data.youthMembers || []).filter(m => m.id !== req.body.id);
    if (youthMembers.length === (data.youthMembers || []).length) return res.status(404).json({ success: false, message: 'Youth Member not found.' });
    await writeData({ youthMembers });
    res.json({ success: true });
});

app.post('/api/admin/delete-pledge', async (req, res) => {
    const data = await readData();
    if (data.pledgeStatus === 'closed') return res.status(400).json({ success: false, message: 'Start a new pledge round before editing it.' });
    await writeData({ pledges: (data.pledges || []).filter(p => p.id !== req.body.id) });
    res.json({ success: true });
});

app.post('/api/admin/close-pledges', async (req, res) => {
    const data = await readData();
    if (data.pledgeStatus === 'closed') return res.status(400).json({ success: false, message: 'The pledge round is already closed.' });
    const summary = getPledgeSummary(data.pledges || []);
    const record = { id: `pledge_${Date.now()}`, closedAt: new Date().toISOString(), closedAtDisplay: new Date().toLocaleString(), campaign: { ...(data.pledgeCampaign || HARAMBEE_CAMPAIGN), paidTotal: summary.paid, outstandingPledges: summary.balance, projectTotal: summary.pledged }, pledges: data.pledges || [] };
    await writeData({ pledgeStatus: 'closed', pledgeHistory: [...(data.pledgeHistory || []), record] });
    res.json({ success: true, record });
});

app.post('/api/admin/start-pledges', async (req, res) => {
    const data = await readData();
    // Retain every name but deliberately begin a new round with blank amounts.
    const pledges = (data.pledges || []).map(p => ({ id: p.id, name: p.name, pledgedAmount: 0, redeemedAmount: 0 }));
    await writeData({ pledgeStatus: 'open', pledges });
    res.json({ success: true, pledges });
});
