const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Persistent Data Files
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const READINGS_FILE = path.join(DATA_DIR, 'readings.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const SUGGESTIONS_FILE = path.join(DATA_DIR, 'suggestions.json');

function readJsonFile(filePath, defaultVal = []) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) { console.error(`Error reading ${filePath}:`, e); }
    return defaultVal;
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) { console.error(`Error writing ${filePath}:`, e); }
}

// Default Rich Spiritual Content (Readings, Prayers, Rosary, Way of the Cross, Hymns)
const DEFAULT_READINGS = [
    {
        id: '1',
        title: 'Daily Scripture & Reflection: Walking in Faith',
        category: 'Bible Reading',
        content: '“Trust in the Lord with all your heart and lean not on your understanding; in all your ways submit to him, and he will make your paths straight.” (Proverbs 3:5-6). Let us dedicate our youth to serving Christ with joy and unwavering trust.'
    },
    {
        id: '2',
        title: 'The Holy Rosary: Glorious Mysteries',
        category: 'Rosary',
        content: '1. The Resurrection of Jesus. 2. The Ascension into Heaven. 3. The Descent of the Holy Spirit. 4. The Assumption of Mary. 5. The Coronation of Mary Queen of Heaven. (Pray 1 Our Father, 10 Hail Marys, 1 Glory Be per decade).'
    },
    {
        id: '3',
        title: 'Way of the Cross: Station 4 - Jesus Meets His Afflicted Mother',
        category: 'Way of the Cross',
        content: 'We adore You, O Christ, and we praise You. Because by Your holy cross You have redeemed the world. Reflection: Mary shares deeply in the sufferings of her Son. May we comfort those who mourn in our community.'
    },
    {
        id: '4',
        title: 'Youth Consecration Prayer',
        category: 'Prayer',
        content: 'Lord Jesus, accept our youthful energy, our dreams, and our talents. Guide our footsteps away from temptation and fill our hearts with charity, purity, and love for Your Holy Church. Amen.'
    },
    {
        id: '5',
        title: 'Hymn: Amazing Grace / Make Me a Channel of Your Peace',
        category: 'Song',
        content: 'Make me a channel of your peace. Where there is hatred, let me bring your love; Where there is injury, your pardon, Lord; Where there is doubt, true faith in you.'
    }
];

if (!fs.existsSync(READINGS_FILE) || readJsonFile(READINGS_FILE).length === 0) {
    writeJsonFile(READINGS_FILE, DEFAULT_READINGS);
}

// Active Sessions Tracking
const activeSessions = new Map(); // username -> timestamp

setInterval(() => {
    const now = Date.now();
    for (const [username, timestamp] of activeSessions.entries()) {
        if (now - timestamp > 45000) {
            activeSessions.delete(username);
        }
    }
}, 30000);

function getFirstName(fullName) {
    if (!fullName) return '';
    return fullName.trim().split(' ')[0];
}

// --- API ENDPOINTS ---

app.post('/api/heartbeat', (req, res) => {
    const { name } = req.body;
    if (name) {
        activeSessions.set(getFirstName(name), Date.now());
    }
    res.json({ success: true });
});

app.post('/api/youth/logout', (req, res) => {
    const { name } = req.body;
    if (name) {
        activeSessions.delete(getFirstName(name));
    }
    res.json({ success: true });
});

app.post('/api/auth/register', (req, res) => {
    let { name, phone, password, group } = req.body;
    if (!name || !phone || !password) {
        return res.json({ success: false, message: 'All fields are required.' });
    }

    const firstName = getFirstName(name);
    let users = readJsonFile(USERS_FILE);
    let members = readJsonFile(MEMBERS_FILE);

    const exists = users.some(u => u.phone === phone || getFirstName(u.name).toLowerCase() === firstName.toLowerCase());
    const memberExists = members.some(m => m.phone === phone || getFirstName(m.name).toLowerCase() === firstName.toLowerCase());

    if (exists || memberExists) {
        return res.json({ success: false, message: 'An account with this name or phone already exists. Contact admin if you need your previous account deleted.' });
    }

    const newUser = { id: Date.now().toString(), name: firstName, phone, password, group: group || 'General' };
    users.push(newUser);
    writeJsonFile(USERS_FILE, users);

    members.push({ id: newUser.id, name: firstName, phone, group: newUser.group, registeredBy: 'Self' });
    writeJsonFile(MEMBERS_FILE, members);

    res.json({ success: true, message: 'Account created successfully!' });
});

app.post('/api/auth/login', (req, res) => {
    const { phone, password } = req.body;
    let users = readJsonFile(USERS_FILE);
    
    if (phone === 'admin' && password === 'admin2026') {
        return res.json({ success: true, role: 'admin', name: 'Admin' });
    }

    const user = users.find(u => u.phone === phone && u.password === password);
    if (!user) {
        return res.json({ success: false, message: 'Invalid phone number or password.' });
    }

    const firstName = getFirstName(user.name);
    activeSessions.set(firstName, Date.now());
    res.json({ success: true, role: 'user', name: firstName });
});

app.get('/api/youth/directory', (req, res) => {
    const members = readJsonFile(MEMBERS_FILE);
    const readings = readJsonFile(READINGS_FILE, DEFAULT_READINGS);
    const events = readJsonFile(EVENTS_FILE, [
        { id: '1', title: 'Youth Sunday Mass', date: '2026-08-02', description: 'Special animation by youth choir and liturgical dancers.' },
        { id: '2', title: 'Rosary & Way of the Cross Retreat', date: '2026-08-15', description: 'A day of prayer, reflection, and spiritual nourishment.' }
    ]);

    const onlineUsers = Array.from(activeSessions.keys());
    res.json({ success: true, members, readings, events, onlineUsers });
});

app.post('/api/youth/register', (req, res) => {
    let { name, phone, group, registeredBy } = req.body;
    if (!name || !phone) {
        return res.json({ success: false, message: 'Name and phone are required.' });
    }

    const firstName = getFirstName(name);
    const approverName = getFirstName(registeredBy || 'Peer');
    let pending = readJsonFile(PENDING_FILE);
    let members = readJsonFile(MEMBERS_FILE);

    if (members.some(m => m.phone === phone || getFirstName(m.name).toLowerCase() === firstName.toLowerCase()) ||
        pending.some(p => p.phone === phone || getFirstName(p.name).toLowerCase() === firstName.toLowerCase())) {
        return res.json({ success: false, message: 'This user is already registered or pending approval.' });
    }

    pending.push({
        id: Date.now().toString(),
        name: firstName,
        phone,
        group: group || 'General',
        registeredBy: approverName
    });
    writeJsonFile(PENDING_FILE, pending);

    res.json({ success: true, message: 'Friend added to approval queue.' });
});

app.post('/api/youth/suggestions', (req, res) => {
    const { title, description, submittedBy } = req.body;
    if (!title || !description) {
        return res.json({ success: false, message: 'Title and description required.' });
    }

    let suggestions = readJsonFile(SUGGESTIONS_FILE);
    const newMsg = {
        id: Date.now().toString(),
        title,
        description,
        submittedBy: getFirstName(submittedBy || 'Member'),
        date: new Date().toISOString(),
        replies: []
    };
    suggestions.push(newMsg);
    writeJsonFile(SUGGESTIONS_FILE, suggestions);
    res.json({ success: true, message: 'Message sent successfully to Admin!' });
});

// --- ADMIN API ENDPOINTS ---

app.get('/api/admin/data', (req, res) => {
    res.json({
        success: true,
        members: readJsonFile(MEMBERS_FILE),
        pending: readJsonFile(PENDING_FILE),
        suggestions: readJsonFile(SUGGESTIONS_FILE),
        readings: readJsonFile(READINGS_FILE, DEFAULT_READINGS),
        events: readJsonFile(EVENTS_FILE),
        onlineUsers: Array.from(activeSessions.keys())
    });
});

app.post('/api/admin/approve', (req, res) => {
    const { id } = req.body;
    let pending = readJsonFile(PENDING_FILE);
    let members = readJsonFile(MEMBERS_FILE);
    let users = readJsonFile(USERS_FILE);

    const index = pending.findIndex(p => p.id === id);
    if (index !== -1) {
        const item = pending.splice(index, 1)[0];
        members.push(item);
        users.push({ id: item.id, name: item.name, phone: item.phone, password: 'youth2026', group: item.group });
        writeJsonFile(PENDING_FILE, pending);
        writeJsonFile(MEMBERS_FILE, members);
        writeJsonFile(USERS_FILE, users);
        return res.json({ success: true });
    }
    res.json({ success: false, message: 'Pending item not found.' });
});

app.post('/api/admin/reject', (req, res) => {
    const { id } = req.body;
    let pending = readJsonFile(PENDING_FILE);
    pending = pending.filter(p => p.id !== id);
    writeJsonFile(PENDING_FILE, pending);
    res.json({ success: true });
});

app.post('/api/admin/delete-member', (req, res) => {
    const { id } = req.body;
    let members = readJsonFile(MEMBERS_FILE);
    let users = readJsonFile(USERS_FILE);

    const memberToRemove = members.find(m => m.id === id);
    members = members.filter(m => m.id !== id);
    if (memberToRemove) {
        users = users.filter(u => u.phone !== memberToRemove.phone);
    }

    writeJsonFile(MEMBERS_FILE, members);
    writeJsonFile(USERS_FILE, users);
    res.json({ success: true });
});

app.post('/api/admin/readings', (req, res) => {
    const { id, title, category, content } = req.body;
    let readings = readJsonFile(READINGS_FILE);
    if (id) {
        readings = readings.map(r => r.id === id ? { ...r, title, category: category || 'Spiritual', content } : r);
    } else {
        readings.push({ id: Date.now().toString(), title, category: category || 'Spiritual', content });
    }
    writeJsonFile(READINGS_FILE, readings);
    res.json({ success: true, readings });
});

app.post('/api/admin/readings/delete', (req, res) => {
    const { id } = req.body;
    let readings = readJsonFile(READINGS_FILE);
    readings = readings.filter(r => r.id !== id);
    writeJsonFile(READINGS_FILE, readings);
    res.json({ success: true, readings });
});

app.post('/api/admin/suggestions/reply', (req, res) => {
    const { suggestionId, replyText } = req.body;
    let suggestions = readJsonFile(SUGGESTIONS_FILE);
    suggestions = suggestions.map(s => {
        if (s.id === suggestionId) {
            s.replies = s.replies || [];
            s.replies.push({ sender: 'Admin', text: replyText, date: new Date().toISOString() });
        }
        return s;
    });
    writeJsonFile(SUGGESTIONS_FILE, suggestions);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});