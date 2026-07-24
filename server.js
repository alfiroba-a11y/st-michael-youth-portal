const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const MONGO_URI = process.env.MONGO_URI;
let db = null;

async function initDB() {
    if (MONGO_URI) {
        try {
            const client = new MongoClient(MONGO_URI);
            await client.connect();
            db = client.db('kasaini_youth_db');
            console.log('Connected successfully to MongoDB Atlas.');
        } catch (err) {
            console.error('MongoDB connection error:', err.message);
        }
    }
}
initDB();

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
    jumuiyaSubmissions: [], // Stores entries submitted by Jumuiya admins (replaces ID with Amount, omits phone numbers from public view)
    events: [
        { id: '1', title: 'Sunday Holy Mass & Youth Fellowship', date: '2026-07-26', type: 'upcoming', description: 'Main service at St. Michael Kasaini Church.' }
    ],
    messages: [],
    readings: {
        title: "Sunday Holy Mass Readings & Updates",
        first: "First Reading content...",
        psalm: "Responsorial Psalm content...",
        second: "Second Reading content...",
        gospel: "Gospel content...",
        announcement: "Welcome to St. Michael Kasaini Youth Portal. Pilgrims of Hope ⛪ 🙏"
    }
};

async function readData() {
    if (!db) return fallbackData;
    try {
        let doc = await db.collection('portal_data').findOne({ _id: 'main_store' });
        if (!doc) {
            await db.collection('portal_data').insertOne({ _id: 'main_store', ...fallbackData });
            return fallbackData;
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

// HTML Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/secret-admin-portal-kasaini-2026', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/jumuiya-portal', (req, res) => res.sendFile(path.join(__dirname, 'jumuiya-portal.html')));

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

// Jumuiya Portal List & Login APIs
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

// Jumuiya Admin Data Submissions (Amount-based tracking instead of row IDs)
app.get('/api/jumuiya/data', async (req, res) => {
    const { jumuiyaName } = req.query;
    const data = await readData();
    const submissions = (data.jumuiyaSubmissions || []).filter(s => s.jumuiyaName === jumuiyaName);
    res.json({ success: true, submissions });
});

app.post('/api/jumuiya/submit-record', async (req, res) => {
    const { jumuiyaName, name, amount, purpose } = req.body;
    if (!name || !jumuiyaName) return res.json({ success: false, message: 'Name and Jumuiya name are required.' });

    const data = await readData();
    if (!data.jumuiyaSubmissions) data.jumuiyaSubmissions = [];

    const newRecord = {
        id: Date.now().toString(),
        jumuiyaName,
        name: name.trim(),
        amount: parseFloat(amount) || 0, // Replaced ID tracking with strict numerical amount
        purpose: purpose || 'General Contribution',
        published: false // Explicit Master Admin approval required before showing on members portal
    };

    data.jumuiyaSubmissions.push(newRecord);
    await writeData(data);
    res.json({ success: true, message: 'Contribution recorded successfully and sent for Master Admin review!' });
});

// Youth Directory & Master Contributions List for Members Portal
app.get('/api/youth/directory', async (req, res) => {
    const data = await readData();
    
    // Filter only admin-approved contributions for the public Master Contributions list
    // Phone numbers are explicitly removed from this response payload
    const publishedRecords = (data.jumuiyaSubmissions || [])
        .filter(s => s.published)
        .map(s => ({
            id: s.id,
            name: s.name,
            amount: s.amount,
            purpose: s.purpose,
            jumuiyaName: s.jumuiyaName
        }));

    // Calculate aggregated contribution sums per Jumuiya
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
        masterContributions: publishedRecords, // Isolated master contribution dataset 
        contributionsMap,
        events: data.events, 
        readings: data.readings, 
        messages: data.messages 
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
        jumuiyaSubmissions: data.jumuiyaSubmissions || [],
        contributionsMap,
        readings: data.readings, 
        events: data.events, 
        messages: data.messages 
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

// Master Admin: Publish or Unpublish Jumuiya Record to Master Contributions List
app.post('/api/admin/toggle-publish', async (req, res) => {
    const { id } = req.body;
    const data = await readData();
    const rec = (data.jumuiyaSubmissions || []).find(r => r.id === id);
    if (rec) {
        rec.published = !rec.published;
        await writeData(data);
    }
    res.json({ success: true });
});

// Master Admin: Edit Jumuiya Record (Name, Amount, Purpose)
app.post('/api/admin/edit-jumuiya-record', async (req, res) => {
    const { id, name, amount, purpose } = req.body;
    const data = await readData();
    const rec = (data.jumuiyaSubmissions || []).find(r => r.id === id);
    if (rec) {
        if (name) rec.name = name;
        if (amount !== undefined) rec.amount = parseFloat(amount) || 0;
        if (purpose) rec.purpose = purpose;
        await writeData(data);
    }
    res.json({ success: true });
});

app.post('/api/admin/update-readings', async (req, res) => {
    const data = await readData();
    data.readings = req.body;
    await writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/add-event', async (req, res) => {
    const { title, date, description } = req.body;
    const data = await readData();
    data.events.push({ id: Date.now().toString(), title, date: date || '', description: description || '', type: 'upcoming' });
    await writeData(data);
    res.json({ success: true, message: 'Event pushed successfully!' });
});

app.post('/api/admin/reply-query', async (req, res) => {
    const { text } = req.body;
    const data = await readData();
    data.messages.push({ id: Date.now().toString(), sender: '🛡️ Robert Wambua (Admin)', text, time: new Date().toLocaleString() });
    await writeData(data);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));