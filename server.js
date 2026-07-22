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

function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const initialData = {
                members: [],
                pending: [],
                events: [
                    { id: '1', title: 'Sunday Holy Mass & Youth Fellowship', date: '2026-07-26', type: 'upcoming', description: 'Main service at St. Michael Kasaini Church.' },
                    { id: '2', title: 'Way of the Cross & Stations Devotion', date: '2026-07-19', type: 'past', description: 'Successfully held with active youth participation.' }
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
            parsed.readings = {
                title: "Sunday Holy Mass Readings & Updates",
                first: "", psalm: "", second: "", gospel: "", announcement: ""
            };
        }
        return parsed;
    } catch (err) {
        return { members: [], pending: [], events: [], messages: [], readings: {} };
    }
}

function writeData(data) {
    // Persistent backup write strategy to prevent data loss
    const backupFile = DATA_FILE + '.bak';
    if (fs.existsSync(DATA_FILE)) {
        fs.copyFileSync(DATA_FILE, backupFile);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let activeSessions = {};

// Routes (Hidden Admin Route: No links pointing to /admin anywhere publicly)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/secret-admin-portal-kasaini-2026', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// API Endpoints
app.get('/api/youth/directory', (req, res) => {
    const data = readData();
    const safeMembers = data.members.map(m => ({
        customId: m.customId,
        name: m.name,
        jumuiya: m.jumuiya,
        group: m.group,
        phone: m.phone
    }));
    res.json({ 
        success: true, 
        members: safeMembers, 
        events: data.events, 
        readings: data.readings,
        messages: data.messages 
    });
});

app.post('/api/youth/register', (req, res) => {
    const { name, phone, jumuiya, group, pass } = req.body;
    if (!name || !pass) {
        return res.json({ success: false, message: 'Name and password are required.' });
    }
    const data = readData();
    // Check if member already exists in pending or members to prevent data overwrite loss
    const exists = [...data.members, ...data.pending].some(m => m.name && m.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (exists) {
        return res.json({ success: false, message: 'A registration with this name already exists.' });
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
    res.json({ success: true, message: 'Registration submitted successfully! Please wait for official admin approval.' });
});

app.post('/api/youth/login', (req, res) => {
    const { name, pass } = req.body;
    if (!name || !pass) {
        return res.json({ success: false, message: 'Name and password are required.' });
    }
    const data = readData();
    const cleanName = name.trim().toLowerCase();

    const member = (data.members || []).find(m => m.name && m.name.trim().toLowerCase() === cleanName);
    if (member) {
        if (member.pass === pass) {
            activeSessions[member.name] = { loginTime: new Date().toLocaleTimeString(), status: 'Online' };
            return res.json({ success: true, name: member.name, message: 'Login successful' });
        } else {
            return res.json({ success: false, message: 'Incorrect password. Please try again.' });
        }
    }
    
    const pending = (data.pending || []).find(p => p.name && p.name.trim().toLowerCase() === cleanName);
    if (pending) {
        return res.json({ success: false, message: 'Your account is still pending official admin approval.' });
    }

    res.json({ success: false, message: 'Member not found. Please register first or check your spelling.' });
});

app.post('/api/youth/logout', (req, res) => {
    const { name } = req.body;
    if (name && activeSessions[name]) delete activeSessions[name];
    res.json({ success: true });
});

app.post('/api/youth/message', (req, res) => {
    const { sender, text } = req.body;
    if (!sender || !text) return res.json({ success: false, message: 'Sender and message required.' });
    const data = readData();
    const newMsg = {
        id: Date.now().toString(),
        sender,
        text,
        time: new Date().toLocaleString()
    };
    data.messages.push(newMsg);
    writeData(data);
    res.json({ success: true });
});

// Admin API
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Invalid admin credentials' });
    }
});

app.get('/api/admin/data', (req, res) => {
    const data = readData();
    res.json({
        success: true,
        pending: data.pending,
        members: data.members,
        readings: data.readings,
        events: data.events,
        messages: data.messages,
        activeSessions
    });
});

app.post('/api/admin/approve', (req, res) => {
    const { id } = req.body;
    const data = readData();
    const index = data.pending.findIndex(p => p.id === id);
    if (index !== -1) {
        const approved = data.pending.splice(index, 1)[0];
        const nextIdNum = data.members.length + 1;
        approved.customId = `K${nextIdNum}`;
        approved.status = 'Approved';
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
    const member = data.members.find(m => m.id === id);
    if (member && activeSessions[member.name]) delete activeSessions[member.name];
    data.members = data.members.filter(m => m.id !== id);
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/revoke-session', (req, res) => {
    const { name } = req.body;
    if (activeSessions[name]) delete activeSessions[name];
    res.json({ success: true });
});

app.post('/api/admin/update-readings', (req, res) => {
    const data = readData();
    data.readings = req.body;
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/add-event', (req, res) => {
    const { title, date, type, description } = req.body;
    const data = readData();
    data.events.push({ id: Date.now().toString(), title, date, type, description });
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/delete-event', (req, res) => {
    const { id } = req.body;
    const data = readData();
    data.events = data.events.filter(e => e.id !== id);
    writeData(data);
    res.json({ success: true });
});

// PDF Data Export Endpoint
app.get('/api/admin/export-pdf', (req, res) => {
    const data = readData();
    let htmlContent = `
        <html>
        <head><title>St. Michael Kasaini Youth Directory Report</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #0d6efd; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f8f9fa; }
        </style>
        </head>
        <body>
            <h1>St. Michael Kasaini Youth Official Directory Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <h3>Approved Members (${data.members.length})</h3>
            <table>
                <tr><th>ID</th><th>Name</th><th>Phone</th><th>Jumuiya</th><th>Group</th><th>Date Registered</th></tr>
    `;
    data.members.forEach(m => {
        htmlContent += `<tr><td>${m.customId || ''}</td><td>${m.name}</td><td>${m.phone}</td><td>${m.jumuiya}</td><td>${m.group}</td><td>${m.date || ''}</td></tr>`;
    });
    htmlContent += `</table></body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename=youth-members-report.html');
    res.send(htmlContent);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));