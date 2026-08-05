// Complete and corrected server code ending cleanly
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const MONGO_URI = process.env.MONGO_URI;
let db = null;

// Automated Reflection Bank (Rotates daily based on the day of the year)
const automatedReflections = [
    {
        title: "Walking in Divine Strength",
        reference: "Philippians 4:13",
        content: "I can do all things through Christ who strengthens me. No matter the challenges you face today, rely not on your own power, but on His infinite grace."
    },
    {
        title: "Trusting the Journey",
        reference: "Proverbs 3:5-6",
        content: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."
    },
    {
        title: "A Heart of Pure Service",
        reference: "Colossians 3:23",
        content: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters, knowing that you will receive an inheritance."
    },
    {
        title: "The Peace That Surpasses Understanding",
        reference: "John 14:27",
        content: "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid."
    },
    {
        title: "Renewed Hope",
        reference: "Isaiah 40:31",
        content: "Those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint."
    }
];

// Predefined Strict Contribution Purposes
const VALID_PURPOSES = [
    'Christmas collection',
    'Easter collection',
    'Diocesan collection',
    'Youth harambee',
    'PMC contribution',
    'Other'
];

// Function to automatically update the daily reflection in DB
async function rotateDailyReflection() {
    if (!db) return;
    try {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const reflectionIndex = dayOfYear % automatedReflections.length;
        const todayReflection = automatedReflections[reflectionIndex];

        await db.collection('settings').updateOne(
            { type: 'reflection' },
            { $set: { ...todayReflection, updatedAt: new Date() } },
            { upsert: true }
        );
        console.log(`[Automation] Daily reflection updated to: "${todayReflection.title}"`);
    } catch (err) {
        console.error('Error updating automated reflection:', err.message);
    }
}

// Function to initialize St. Aloysius Gonzaga as the permanent Patron Saint
async function initializePatronSaint() {
    if (!db) return;
    try {
        const saintData = {
            type: 'patronSaint',
            name: "St. Aloysius Gonzaga",
            feastDay: "June 21",
            message: "Model of purity, youth, and selfless charity. Patron saint of Christian youth, who gave his life nursing the sick during the Roman plague."
        };

        await db.collection('settings').updateOne(
            { type: 'patronSaint' },
            { $set: saintData },
            { upsert: true }
        );
        console.log('[Initialization] Patron Saint locked to St. Aloysius Gonzaga (June 21st).');
    } catch (err) {
        console.error('Error initializing patron saint:', err.message);
    }
}

async function initDB() {
    if (MONGO_URI) {
        try {
            const client = new MongoClient(MONGO_URI);
            await client.connect();
            db = client.db('kasaini_youth_db');
            console.log('Connected successfully to MongoDB Atlas.');
            
            await initializePatronSaint();
            await rotateDailyReflection();
        } catch (err) {
            console.error('MongoDB connection error:', err.message);
        }
    }
}
initDB();

// Schedule cron job to run every day at 00:00 (Midnight)
cron.schedule('0 0 * * *', () => {
    rotateDailyReflection();
});

// 11 Defined Jumuiyas with Unique Default Credentials
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
    targetAmount: 50000,
    events: [
        { id: '1', title: 'Sunday Holy Mass & Youth Fellowship', date: 'Next Sunday at 10:00 AM', description: 'Main service at St. Michael Kasaini Church.', type: 'upcoming' }
    ],
    messages: [],
    readings: [
        {
            id: '1',
            title: "Sunday Holy Mass Readings & Updates",
            firstReading: "1 Kings 3:5, 7–12 — King Solomon Requests Wisdom...",
            psalm: "Psalm 119 — Lord, I love your commands...",
            secondReading: "Romans 8:28–30 — God Works for Good...",
            gospel: "Matthew 13:44–52 — Parables Highlighting the Kingdom..."
        }
    ]
};

async function readData() {
    if (!db) return fallbackData;
    try {
        let doc = await db.collection('portal_data').findOne({ _id: 'main_store' });
        if (!doc) {
            await db.collection('portal_data').insertOne({ _id: 'main_store', ...fallbackData });
            return fallbackData;
        }
        if (doc.readings && !Array.isArray(doc.readings)) {
            doc.readings = [{
                id: '1',
                title: doc.readings.title || "Sunday Mass Readings",
                firstReading: doc.readings.first || doc.readings.firstReading || "",
                psalm: doc.readings.psalm || "",
                secondReading: doc.readings.second || doc.readings.secondReading || "",
                gospel: doc.readings.gospel || ""
            }];
        }
        return doc;
    } catch (e) {
        return fallbackData;
    }
}

async function writeData(data) {
    fallbackData = data;
    if (db) {
        try {
            await db.collection('portal_data').updateOne(
                { _id: 'main_store' },
                { $set: { 
                    members: data.members, 
                    pending: data.pending, 
                    jumuiyaSubmissions: data.jumuiyaSubmissions, 
                    polls: data.polls || [],
                    events: data.events, 
                    messages: data.messages, 
                    readings: data.readings 
                } },
                { upsert: true }
            );
        } catch (e) {
            console.error('Database write error:', e.message);
        }
    }
}

function maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}

let activeUsers = {};

// HTML Routes - Ensuring robust support for member dashboard filenames
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', (req, res) => {
    const memberPath = path.join(__dirname, 'member.html');
    const dashboardPath = path.join(__dirname, 'dashboard.html');

    if (fs.existsSync(memberPath)) {
        return res.sendFile(memberPath);
    } else if (fs.existsSync(dashboardPath)) {
        return res.sendFile(dashboardPath);
    }
    res.status(404).send('Dashboard file (member.html or dashboard.html) missing in project directory.');
});
app.get('/secret-admin-portal-kasaini-2026', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/jumuiya-portal', (req, res) => res.sendFile(path.join(__dirname, 'jumuiya-portal.html')));

async function getSpiritualContent() {
    let reflection = null;
    let patronSaint = null;

    if (db) {
        try {
            reflection = await db.collection('settings').findOne({ type: 'reflection' });
            patronSaint = await db.collection('settings').findOne({ type: 'patronSaint' });
        } catch (err) {
            console.error('Error fetching settings collection:', err);
        }
    }

    if (!reflection) reflection = automatedReflections[0];
    if (!patronSaint) {
        patronSaint = {
            name: "St. Aloysius Gonzaga",
            feastDay: "June 21",
            message: "Model of purity, youth, and selfless charity. Patron saint of Christian youth."
        };
    }
    return { reflection, patronSaint };
}

// Spiritual Content APIs
app.get('/api/spiritual/content', async (req, res) => {
    try {
        const { reflection, patronSaint } = await getSpiritualContent();
        res.json({ success: true, reflection, patronSaint });
    } catch (err) {
        console.error('Error fetching spiritual content:', err);
        res.status(500).json({ success: false, message: 'Server error retrieving spiritual content.' });
    }
});

// Unified Analytics API for 11 Jumuiyas
app.get('/api/analytics/jumuiya-graph', async (req, res) => {
    try {
        const data = await readData();
        const labels = JUMUIYAS_LIST.map(j => j.name);
        const totalsMap = {};
        const purposeBreakdown = {};
        
        labels.forEach(name => { 
            totalsMap[name] = 0; 
            purposeBreakdown[name] = {};
            VALID_PURPOSES.forEach(p => { purposeBreakdown[name][p] = 0; });
        });

        (data.jumuiyaSubmissions || []).forEach(record => {
            if (record.published && record.jumuiyaName) {
                if (totalsMap[record.jumuiyaName] !== undefined) {
                    const amt = Number(record.amount || 0);
                    totalsMap[record.jumuiyaName] += amt;
                    
                    const pur = VALID_PURPOSES.includes(record.purpose) ? record.purpose : 'Other';
                    if (!purposeBreakdown[record.jumuiyaName][pur]) {
                        purposeBreakdown[record.jumuiyaName][pur] = 0;
                    }
                    purposeBreakdown[record.jumuiyaName][pur] += amt;
                }
            }
        });

        const datasetsData = labels.map(name => totalsMap[name]);

        res.json({
            success: true,
            labels,
            datasetsData,
            purposeBreakdown
        });
    } catch (err) {
        console.error('Error loading jumuiya graph data:', err);
        res.status(500).json({ success: false, message: 'Server error loading graph analytics.' });
    }
});

// Presence API
app.post('/api/ping', (req, res) => {
    const { username } = req.body;
    if (username) activeUsers[username] = Date.now();
    res.json({ success: true });
});

app.get('/api/online-users', (req, res) => {
    const now = Date.now();
    const online = Object.keys(activeUsers).filter(user => (now - activeUsers[user]) < 300000);
    res.json(online);
});

// Jumuiya Portal APIs
app.get('/api/jumuiyas/list', (req, res) => {
    const publicList = JUMUIYAS_LIST.map(j => ({ id: j.id, name: j.name, username: j.username }));
    res.json({ success: true, jumuiyas: publicList });
});

app.post('/api/jumuiya/login', (req, res) => {
    const { jumuiyaId, username, password } = req.body;
    const jumuiya = JUMUIYAS_LIST.find(j => j.id === jumuiyaId);
    if (jumuiya && jumuiya.username === username && jumuiya.pass === password) {
        return res.json({ success: true, name: jumuiya.name });
    }
    res.json({ success: false, message: 'Invalid Jumuiya credentials.' });
});

app.get('/api/jumuiya/data', async (req, res) => {
    const { jumuiyaName } = req.query;
    const data = await readData();
    const submissions = (data.jumuiyaSubmissions || []).filter(s => s.jumuiyaName === jumuiyaName);
    res.json({ success: true, submissions, validPurposes: VALID_PURPOSES });
});

app.post('/api/jumuiya/submit-record', async (req, res) => {
    const { jumuiyaName, name, amount, purpose } = req.body;
    if (!name || !jumuiyaName) return res.json({ success: false, message: 'Name and Jumuiya name are required.' });

    const finalPurpose = VALID_PURPOSES.includes(purpose) ? purpose : 'Other';

    const data = await readData();
    if (!data.jumuiyaSubmissions) data.jumuiyaSubmissions = [];

    const newRecord = {
        id: Date.now().toString(),
        jumuiyaName,
        name: name.trim(),
        amount: parseFloat(amount) || 0,
        purpose: finalPurpose,
        published: false
    };

    data.jumuiyaSubmissions.push(newRecord);
    await writeData(data);
    res.json({ success: true, message: 'Contribution recorded successfully and sent for Master Admin review!' });
});

// Youth Directory & Master Contributions
app.get('/api/youth/directory', async (req, res) => {
    const data = await readData();
    const { reflection, patronSaint } = await getSpiritualContent();
    
    const publishedRecords = (data.jumuiyaSubmissions || [])
        .filter(s => s.published)
        .map(s => ({
            id: s.id,
            name: s.name,
            amount: s.amount,
            purpose: s.purpose,
            jumuiyaName: s.jumuiyaName
        }));

    let contributionsMap = {};
    JUMUIYAS_LIST.forEach(j => { contributionsMap[j.name] = 0; });
    
    (data.jumuiyaSubmissions || []).forEach(r => {
        if (r.published) {
            if (!contributionsMap[r.jumuiyaName]) contributionsMap[r.jumuiyaName] = 0;
            contributionsMap[r.jumuiyaName] += r.amount;
        }
    });

    res.json({ 
        success: true, 
        members: data.members.map(m => ({ ...m, phone: maskPhone(m.phone) })), 
        masterContributions: publishedRecords, 
        contributionsMap,
        events: data.events, 
        readings: data.readings, 
        messages: data.messages,
        reflection,
        textReflection: reflection,
        patronSaint,
        validPurposes: VALID_PURPOSES
    });
});

app.post('/api/youth/register', async (req, res) => {
    const { name, phone, jumuiya, group, pass } = req.body;
    if (!name || !pass) return res.json({ success: false, message: 'Name and password are required.' });
    
    const data = await readData();
    const cleanName = name.trim().toLowerCase();
    
    if (data.members.some(m => m.name.toLowerCase() === cleanName) || data.pending.some(p => p.name.toLowerCase() === cleanName)) {
        return res.json({ success: false, message: 'An account with this name already exists or is awaiting approval.' });
    }

    data.pending.push({ 
        id: Date.now().toString(), 
        name: name.trim(), 
        phone: phone || '', 
        jumuiya: jumuiya || 'St. Michael', 
        group: group || 'Youth General', 
        pass, 
        date: new Date().toLocaleDateString() 
    });
    await writeData(data);
    res.json({ success: true, message: 'Registration successful! Awaiting admin approval.' });
});

app.post('/api/youth/login', async (req, res) => {
    const { name, pass } = req.body;
    const data = await readData();
    const cleanName = name.trim().toLowerCase();

    const member = data.members.find(m => m.name.toLowerCase() === cleanName);
    if (member) {
        if (member.pass === pass) return res.json({ success: true, name: member.name, jumuiya: member.jumuiya });
        return res.json({ success: false, message: 'Incorrect password.' });
    }
    if (data.pending.find(p => p.name.toLowerCase() === cleanName)) {
        return res.json({ success: false, message: 'Your account is still pending approval.' });
    }
    res.json({ success: false, message: 'Member not found.' });
});

app.post('/api/youth/message', async (req, res) => {
    const { sender, text } = req.body;
    if (!sender || !text) return res.json({ success: false });
    const data = await readData();
    data.messages.push({ id: Date.now().toString(), sender, text, time: new Date().toLocaleString() });
    await writeData(data);
    res.json({ success: true });
});

// Master Admin APIs
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    res.json({ success: (username === 'Admin' && password === 'Admin0247') });
});

app.get('/api/admin/data', async (req, res) => {
    const data = await readData();
    const { reflection, patronSaint } = await getSpiritualContent();
    
    const passwordResets = (data.members || []).filter(m => m.passwordResetRequested);

    let contributionsMap = {};
    JUMUIYAS_LIST.forEach(j => { contributionsMap[j.name] = 0; });
    (data.jumuiyaSubmissions || []).forEach(r => {
        if (r.published) {
            if (!contributionsMap[r.jumuiyaName]) contributionsMap[r.jumuiyaName] = 0;
            contributionsMap[r.jumuiyaName] += r.amount;
        }
    });

    res.json({ 
        success: true, 
        pending: data.pending, 
        members: data.members, 
        passwordResets: passwordResets, 
        jumuiyaSubmissions: data.jumuiyaSubmissions || [],
        polls: data.polls || [],
        contributionsMap,
        readings: data.readings, 
        events: data.events, 
        messages: data.messages,
        reflection,
        textReflection: reflection,
        patronSaint,
        validPurposes: VALID_PURPOSES
    });
});

app.post('/api/admin/approve', async (req, res) => {
    const { id } = req.body;
    const data = await readData();
    const index = data.pending.findIndex(p => p.id === id);
    if (index !== -1) {
        const approved = data.pending.splice(index, 1)[0];
        approved.customId = `K${data.members.length + 1}`;
        data.members.push(approved);
        await writeData(data);
    }
    res.json({ success: true });
});

app.post('/api/admin/reject', async (req, res) => {
    const { id } = req.body;
    const data = await readData();
    data.pending = data.pending.filter(p => p.id !== id);
    await writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/remove-member', async (req, res) => {
    const { id } = req.body;
    const data = await readData();
    data.members = data.members.filter(m => m.id !== id);
    await writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/edit-member', async (req, res) => {
    try {
        const { id, name, phone, jumuiya, group } = req.body;
        const data = await readData();

        const member = (data.members || []).find(m => m.id === id || m._id === id);
        if (!member) {
            return res.json({ success: false, message: 'Member not found.' });
        }

        if (name) member.name = name.trim();
        if (phone !== undefined) member.phone = phone.trim();
        if (jumuiya) member.jumuiya = jumuiya.trim();
        if (group) member.group = group.trim();

        await writeData(data);
        res.json({ success: true, message: 'Member details updated successfully!', member });
    } catch (err) {
        console.error('Error updating member details:', err);
        res.status(500).json({ success: false, message: 'Server error updating member details.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`St. Michael Kasaini Youth Server running on http://localhost:${PORT}`);
});
