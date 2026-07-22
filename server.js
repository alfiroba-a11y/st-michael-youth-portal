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
                events: [],
                messages: [],
                readings: {
                    title: "Default Sunday Readings",
                    first: "Reading 1 details...",
                    psalm: "Psalm details...",
                    second: "Reading 2 details...",
                    gospel: "Gospel details..."
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
        return parsed;
    } catch (err) {
        return { members: [], pending: [], events: [], messages: [] };
    }
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let activeSessions = {};

// Routes for serving pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API Endpoints
app.get('/api/youth/directory', (req, res) => {
    const data = readData();
    res.json({ success: true, members: data.members, events: data.events, readings: data.readings });
});

app.post('/api/youth/register', (req, res) => {
    const { name, phone, jumuiya, group, pass, addedBy } = req.body;
    if (!name || !pass) {
        return res.json({ success: false, message: 'Name and password are required.' });
    }
    
    const data = readData();
    const newReg = {
        id: Date.now().toString(),
        name: name.trim(),
        phone: phone || '',
        jumuiya: jumuiya || '',
        group: group || '',
        pass,
        addedBy: addedBy || 'Self Registration (KES 100 Paid)',
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
    if (name && activeSessions[name]) {
        delete activeSessions[name];
    }
    res.json({ success: true });
});

app.post('/api/youth/message', (req, res) => {
    const { sender, message } = req.body;
    const data = readData();
    data.messages.push({
        id: Date.now(),
        sender,
        message,
        reply: '',
        date: new Date().toLocaleString()
    });
    writeData(data);
    res.json({ success: true });
});

// Admin API Endpoints
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
        events: data.events,
        messages: data.messages,
        readings: data.readings,
        activeSessions
    });
});

app.post('/api/admin/approve', (req, res) => {
    const { id } = req.body;
    const data = readData();
    const index = data.pending.findIndex(p => p.id === id);
    if (index !== -1) {
        const approved = data.pending.splice(index, 1)[0];
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

app.post('/api/admin/add-member', (req, res) => {
    const { name, phone, jumuiya, group, pass, addedBy } = req.body;
    if (!name || !pass) {
        return res.json({ success: false, message: 'Name and password are required.' });
    }
    
    const data = readData();
    if (!data.members) data.members = [];
    
    const exists = data.members.some(m => m.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (exists) {
        return res.json({ success: false, message: 'A member with this name already exists.' });
    }

    const newMember = {
        id: Date.now().toString(),
        name: name.trim(),
        phone: phone || '',
        jumuiya: jumuiya || '',
        group: group || '',
        pass,
        addedBy: addedBy || 'Admin / Official Dashboard',
        status: 'Approved',
        date: new Date().toLocaleDateString()
    };

    data.members.push(newMember);
    writeData(data);
    res.json({ success: true, message: 'Member added successfully!' });
});

app.post('/api/admin/remove-member', (req, res) => {
    const { id } = req.body;
    const data = readData();
    const member = data.members.find(m => m.id === id);
    if (member && activeSessions[member.name]) {
        delete activeSessions[member.name];
    }
    data.members = data.members.filter(m => m.id !== id);
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/revoke-session', (req, res) => {
    const { name } = req.body;
    if (activeSessions[name]) {
        delete activeSessions[name];
    }
    res.json({ success: true });
});

app.post('/api/admin/update-readings', (req, res) => {
    const data = readData();
    data.readings = req.body;
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/event', (req, res) => {
    const data = readData();
    const newEvent = { id: Date.now(), ...req.body };
    data.events.push(newEvent);
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/move-to-past', (req, res) => {
    const { id } = req.body;
    const data = readData();
    data.events = data.events.filter(ev => ev.id !== id);
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/reply', (req, res) => {
    const { id, reply } = req.body;
    const data = readData();
    const msg = data.messages.find(m => m.id == id);
    if (msg) {
        msg.reply = reply;
        writeData(data);
    }
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});