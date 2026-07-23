const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// MongoDB Connection Setup
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

// Fallback local memory store if database is initializing
let fallbackData = {
    members: [],
    pending: [],
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
        announcement: "Welcome to St. Michael Kasaini Youth Portal."
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
                { $set: { members: data.members, pending: data.pending, events: data.events, messages: data.messages, readings: data.readings } },
                { upsert: true }
            );
        } catch (e) {
            console.error('Database write error:', e.message);
        }
    }
}

function maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    const start = phone.slice(0, 3);
    const end = phone.slice(-3);
    return `${start}****${end}`;
}

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/secret-admin-portal-kasaini-2026', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.get('/api/download/server-code', (req, res) => {
    const fs = require('fs');
    const codeContent = fs.readFileSync(__filename, 'utf8');
    let html = `<html><head><title>server.js Source Code</title><style>body{font-family:monospace;padding:20px;background:#f4f4f4;}pre{background:#fff;padding:15px;border:1px solid #ccc;}</style></head><body><h2>server.js</h2><pre>${codeContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre><script>window.print();</script></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// API Endpoints
app.get('/api/youth/directory', async (req, res) => {
    const data = await readData();
    const safeMembers = data.members.map(m => ({
        customId: m.customId,
        name: m.name,
        jumuiya: m.jumuiya,
        group: m.group,
        phone: maskPhone(m.phone)
    }));
    res.json({ success: true, members: safeMembers, events: data.events, readings: data.readings, messages: data.messages });
});

app.post('/api/youth/register', async (req, res) => {
    const { name, phone, jumuiya, group, pass } = req.body;
    if (!name || !pass) return res.json({ success: false, message: 'Name and password are required.' });
    
    const data = await readData();
    const cleanName = name.trim().toLowerCase();
    
    const existsInMembers = data.members.some(m => m.name && m.name.trim().toLowerCase() === cleanName);
    const existsInPending = data.pending.some(p => p.name && p.name.trim().toLowerCase() === cleanName);

    if (existsInMembers || existsInPending) {
        return res.json({ success: false, message: 'An account with this name already exists or is awaiting approval.' });
    }

    const newReg = { 
        id: Date.now().toString(), 
        name: name.trim(), 
        phone: phone || '', 
        jumuiya: jumuiya || '', 
        group: group || 'Youth General', 
        pass, 
        date: new Date().toLocaleDateString() 
    };

    data.pending.push(newReg);
    await writeData(data);
    
    res.json({ 
        success: true, 
        message: 'Registration successful! Your details have been sent to the admin portal. You will be approved within 24 hours.' 
    });
});

app.post('/api/youth/login', async (req, res) => {
    const { name, pass } = req.body;
    if (!name || !pass) return res.json({ success: false, message: 'Name and password are required.' });
    
    const data = await readData();
    const cleanName = name.trim().toLowerCase();

    const member = (data.members || []).find(m => m.name && m.name.trim().toLowerCase() === cleanName);
    if (member) {
        if (member.pass === pass) {
            return res.json({ success: true, name: member.name, message: 'Login successful' });
        }
        return res.json({ success: false, message: 'Incorrect password.' });
    }

    const pending = (data.pending || []).find(p => p.name && p.name.trim().toLowerCase() === cleanName);
    if (pending) {
        return res.json({ success: false, message: 'Your account is still pending admin approval. Please check back within 24 hours.' });
    }

    res.json({ success: false, message: 'Member not found. Please sign up first.' });
});

app.post('/api/youth/message', async (req, res) => {
    const { sender, text } = req.body;
    if (!sender || !text) return res.json({ success: false });
    const data = await readData();
    data.messages.push({ id: Date.now().toString(), sender, text, time: new Date().toLocaleString() });
    await writeData(data);
    res.json({ success: true });
});

// Admin API
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    res.json({ success: (username === 'admin' && password === 'KasainiYouthAdmin2026!') });
});

app.get('/api/admin/data', async (req, res) => {
    const data = await readData();
    const safePending = data.pending.map(p => ({ ...p, phone: maskPhone(p.phone) }));
    const safeMembers = data.members.map(m => ({ ...m, phone: maskPhone(m.phone) }));
    res.json({ success: true, pending: safePending, members: safeMembers, readings: data.readings, events: data.events, messages: data.messages });
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

app.post('/api/admin/update-readings', async (req, res) => {
    const data = await readData();
    data.readings = req.body;
    await writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/add-event', async (req, res) => {
    const { title, date, description } = req.body;
    if (!title) return res.json({ success: false, message: 'Event title is required.' });
    const data = await readData();
    data.events.push({ id: Date.now().toString(), title, date: date || '', description: description || '', type: 'upcoming' });
    await writeData(data);
    res.json({ success: true, message: 'Event pushed successfully!' });
});

app.post('/api/admin/reply-query', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.json({ success: false });
    const data = await readData();
    data.messages.push({ id: Date.now().toString(), sender: '🛡️ Robert Wambua (Admin)', text, time: new Date().toLocaleString() });
    await writeData(data);
    res.json({ success: true });
});

app.get('/api/admin/export-pdf', async (req, res) => {
    const data = await readData();
    let htmlContent = `<html><head><title>St. Michael Kasaini Youth Members Report</title><style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:20px;}th,td{border:1px solid #ddd;padding:8px;font-size:12px;}th{background:#f8f9fa;}</style></head><body><h1>St. Michael Kasaini Youth Directory</h1><table><tr><th>ID</th><th>Name</th><th>Phone</th><th>Jumuiya</th><th>Group</th></tr>`;
    data.members.forEach(m => {
        htmlContent += `<tr><td>${m.customId || ''}</td><td>${m.name}</td><td>${maskPhone(m.phone)}</td><td>${m.jumuiya}</td><td>${m.group}</td></tr>`;
    });
    htmlContent += `</table><script>window.print();</script></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));