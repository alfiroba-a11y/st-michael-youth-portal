// Full Production server.js - Restoring all features, models, endpoints, and authentication
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
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
app.use(express.static(path.join(__dirname)));

const MONGO_URI = process.env.MONGO_URI;
let db = null;

const automatedReflections = [
    { title: "Walking in Divine Strength", reference: "Philippians 4:13", content: "I can do all things through Christ who strengthens me. No matter the challenges you face today, rely not on your own power, but on His infinite grace." },
    { title: "Trusting the Journey", reference: "Proverbs 3:5-6", content: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
    { title: "A Heart of Pure Service", reference: "Colossians 3:23", content: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters." },
    { title: "The Peace That Surpasses Understanding", reference: "John 14:27", content: "Peace I leave with you; my peace I give you. Do not let your hearts be troubled and do not be afraid." },
    { title: "Renewed Hope", reference: "Isaiah 40:31", content: "Those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary." }
];

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
    passwordRequests: []
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
            passwordRequests: doc.passwordRequests || fallbackData.passwordRequests
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

// Page Route Endpoints
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/secret-admin-portal-kasaini-2026', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/jumuiya-portal', (req, res) => res.sendFile(path.join(__dirname, 'jumuiya-portal.html')));

// Spiritual & Content API Endpoints
app.get('/api/spiritual/content', async (req, res) => {
    const content = await getSpiritualContent();
    res.json({ success: true, ...content });
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
