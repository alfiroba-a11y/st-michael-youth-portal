const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const DATA_FILE = path.join(__dirname, 'data.json');

// Optional Google Cloud Storage backup handler
async function backupToGoogleCloud(filePath) {
    try {
        if (process.env.GCS_BUCKET_NAME) {
            const { Storage } = require('@google-cloud/storage');
            const storage = new Storage();
            await storage.bucket(process.env.GCS_BUCKET_NAME).upload(filePath, {
                destination: 'data_backup.json',
            });
        }
    } catch (error) {}
}

function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const initialData = {
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
            fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
            return initialData;
        }
        const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (!parsed.members) parsed.members = [];
        if (!parsed.pending) parsed.pending = [];
        if (!parsed.events) parsed.events = [];
        if (!parsed.messages) parsed.messages = [];
        if (!parsed.readings) {
            parsed.readings = { title: "Sunday Holy Mass Readings & Updates", first: "", psalm: "", second: "", gospel: "", announcement: "" };
        }
        return parsed;
    } catch (err) {
        return { members: [], pending: [], events: [], messages: [], readings: {} };
    }
}

function writeData(data) {
    const backupFile = DATA_FILE + '.bak';
    if (fs.existsSync(DATA_FILE)) {
        fs.copyFileSync(DATA_FILE, backupFile);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    backupToGoogleCloud(DATA_FILE);
}

// Utility to mask middle numbers of phone numbers (e.g., 0712345678 -> 071****678)
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
    const codeContent = fs.readFileSync(__filename, 'utf8');
    let html = `<html><head><title>server.js Source Code</title><style>body{font-family:monospace;padding:20px;background:#f4f4f4;}pre{background:#fff;padding:15px;border:1px solid #ccc;}</style></head><body><h2>server.js</h2><pre>${codeContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre><script>window.print();</script></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// API Endpoints
app.get('/api/youth/directory', (req, res) => {
    const data = readData();
    const safeMembers = data.members.map(m => ({
        customId: m.customId,
        name: m.name,
        jumuiya: m.jumuiya,
        group: m.group,
        phone: maskPhone(m.phone)
    }));
    res.json({ success: true, members: safeMembers, events: data.events, readings: data.readings, messages: data.messages });
});

app.post('/api/youth/register', (req, res) => {
    const { name, phone, jumuiya, group, pass } = req.body;
    if (!name || !pass) return res.json({ success: false, message: 'Name and password are required.' });
    
    const data = readData();
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
    writeData(data);
    
    res.json({ 
        success: true, 
        message: 'Registration successful! Your details have been sent to the admin portal. You will be approved within 24 hours.' 
    });
});

app.post('/api/youth/login', (req, res) => {
    const { name, pass } = req.body;
    if (!name || !pass) return res.json({ success: false, message: 'Name and password are required.' });
    
    const data = readData();
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

app.post('/api/youth/message', (req, res) => {
    const { sender, text } = req.body;
    if (!sender || !text) return res.json({ success: false });
    const data = readData();
    data.messages.push({ id: Date.now().toString(), sender, text, time: new Date().toLocaleString() });
    writeData(data);
    res.json({ success: true });
});

// Admin API
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    res.json({ success: (username === 'admin' && password === 'KasainiYouthAdmin2026!') });
});

app.get('/api/admin/data', (req, res) => {
    const data = readData();
    // Mask pending phone numbers for privacy as well
    const safePending = data.pending.map(p => ({ ...p, phone: maskPhone(p.phone) }));
    const safeMembers = data.members.map(m => ({ ...m, phone: maskPhone(m.phone) }));
    res.json({ success: true, pending: safePending, members: safeMembers, readings: data.readings, events: data.events, messages: data.messages });
});

app.post('/api/admin/approve', (req, res) => {
    const { id } = req.body;
    const data = readData();
    const index = data.pending.findIndex(p => p.id === id);
    if (index !== -1) {
        const approved = data.pending.splice(index, 1)[0];
        approved.customId = `K${data.members.length + 1}`;
        data.members.push(approved);
        writeData(data);
    }
    res.json({ success: true });
});

app.post('/api/admin/reject', (req, res) => {
    const { id } = req.body;
    const data = readData();
    data.pending = data.pending.filter(p => p.id !== id);
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/remove-member', (req, res) => {
    const { id } = req.body;
    const data = readData();
    data.members = data.members.filter(m => m.id !== id);
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/update-readings', (req, res) => {
    const data = readData();
    data.readings = req.body;
    writeData(data);
    res.json({ success: true });
});

// Endpoint to push Upcoming Events from Admin Portal
app.post('/api/admin/add-event', (req, res) => {
    const { title, date, description } = req.body;
    if (!title) return res.json({ success: false, message: 'Event title is required.' });
    const data = readData();
    data.events.push({ id: Date.now().toString(), title, date: date || '', description: description || '', type: 'upcoming' });
    writeData(data);
    res.json({ success: true, message: 'Event pushed successfully!' });
});

// Endpoint for Admin Reply to Queries / Community Board
app.post('/api/admin/reply-query', (req, res) => {
    const { text } = req.body;
    if (!text) return res.json({ success: false });
    const data = readData();
    data.messages.push({ id: Date.now().toString(), sender: '🛡️ Robert Wambua (Admin)', text, time: new Date().toLocaleString() });
    writeData(data);
    res.json({ success: true });
});

app.get('/api/admin/export-pdf', (req, res) => {
    const data = readData();
    let htmlContent = `<html><head><title>St. Michael Kasaini Youth Members Report</title><style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:20px;}th,td{border:1px solid #ddd;padding:8px;font-size:12px;}th{background:#f8f9fa;}</style></head><body><h1>St. Michael Kasaini Youth Directory</h1><table><tr><th>ID</th><th>Name</th><th>Phone</th><th>Jumuiya</th><th>Group</th></tr>`;
    data.members.forEach(m => {
        htmlContent += `<tr><td>${m.customId || ''}</td><td>${m.name}</td><td>${maskPhone(m.phone)}</td><td>${m.jumuiya}</td><td>${m.group}</td></tr>`;
    });
    htmlContent += `</table><script>window.print();</script></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));