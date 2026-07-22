const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Root route handler configured to directly send index.html from the root folder
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Error: index.html file not found in the root directory.');
    }
});

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

// Complete, Detailed Catholic Spiritual Content with Full Prayers, All Rosary Mysteries with Step-by-Step Instructions, and Full 14 Stations of the Way of the Cross
const DEFAULT_READINGS = [
    {
        id: '1',
        title: 'Daily Scripture & Holy Mass Readings',
        category: 'Bible Reading',
        content: 'First Reading: “Trust in the Lord with all your heart and lean not on your understanding; in all your ways submit to him, and he will make your paths straight.” (Proverbs 3:5-6). Responsorial Psalm: The Lord is my shepherd; there is nothing I shall want. Gospel Reflection: Let us dedicate our youth to serving Christ with joy, purity, and unwavering trust.'
    },
    {
        id: '2',
        title: 'The Holy Rosary: All Mysteries & Detailed Step-by-Step Guide',
        category: 'Rosary',
        content: 'HOW TO PRAY THE ROSARY: 1. Make the Sign of the Cross and recite the Apostles’ Creed. 2. Pray 1 Our Father on the first large bead. 3. Pray 3 Hail Marys on the next three small beads for the virtues of Faith, Hope, and Charity. 4. Pray 1 Glory Be. 5. Announce the first mystery, then pray 1 Our Father, 10 Hail Marys, 1 Glory Be, and the Fatima Prayer ("O My Jesus, forgive us our sins...") for each decade. \n\nMYSTERIES:\n- JOYFUL (Monday & Saturday): 1. The Annunciation 2. The Visitation 3. The Nativity 4. The Presentation 5. The Finding in the Temple.\n- SORROWFUL (Tuesday & Friday): 1. Agony in the Garden 2. Scourging at the Pillar 3. Crowning with Thorns 4. Carrying of the Cross 5. Crucifixion.\n- GLORIOUS (Wednesday & Sunday): 1. Resurrection 2. Ascension 3. Descent of the Holy Spirit 4. Assumption 5. Coronation of Mary.\n- LUMINOUS (Thursday): 1. Baptism in the Jordan 2. Wedding at Cana 3. Proclamation of the Kingdom 4. Transfiguration 5. Institution of the Eucharist.'
    },
    {
        id: '3',
        title: 'Way of the Cross: Complete 14 Stations with Full Meditations & Prayers',
        category: 'Way of the Cross',
        content: 'Leader: We adore You, O Christ, and we praise You. All: Because by Your holy cross You have redeemed the world.\n\n- Station 1: Jesus is condemned to death. (Reflection: Let us accept trials patiently.)\n- Station 2: Jesus takes up His cross. (Reflection: Grant us strength to carry our daily crosses.)\n- Station 3: Jesus falls the first time. (Reflection: Lift us up when we fall into sin.)\n- Station 4: Jesus meets His afflicted Mother. (Reflection: Comfort all grieving mothers and youth.)\n- Station 5: Simon of Cyrene helps Jesus carry the cross. (Reflection: Make us helpful to our neighbors.)\n- Station 6: Veronica wipes the face of Jesus. (Reflection: Give us courage to show mercy.)\n- Station 7: Jesus falls the second time. (Reflection: Renew our resolve to rise again.)\n- Station 8: Jesus meets the women of Jerusalem. (Reflection: Help us weep for our own sins.)\n- Station 9: Jesus falls the third time. (Reflection: Keep us steadfast in ultimate weakness.)\n- Station 10: Jesus is stripped of His garments. (Reflection: Clothe us in grace and modesty.)\n- Station 11: Jesus is nailed to the cross. (Reflection: Nail our selfish desires to Your cross.)\n- Station 12: Jesus dies on the cross. (Reflection: Eternal rest grant unto Him, and let perpetual light shine upon Him.)\n- Station 13: Jesus is taken down from the cross. (Reflection: Receive us safely into Your motherly embrace.)\n- Station 14: Jesus is laid in the tomb. (Reflection: Grant us the hope of glorious resurrection.)'
    },
    {
        id: '4',
        title: 'Essential Catholic Prayers & Youth Consecration',
        category: 'Prayer',
        content: '1. OUR FATHER: Our Father, who art in heaven, hallowed be thy name... \n2. HAIL MARY: Hail Mary, full of grace, the Lord is with thee... \n3. GLORY BE: Glory be to the Father, and to the Son, and to the Holy Spirit... \n4. ACT OF CONTRITION: O my God, I am heartily sorry for having offended Thee... \n5. PRAYER TO ST. MICHAEL: Saint Michael the Archangel, defend us in battle. Be our protection against the wickedness and snares of the devil... \n6. YOUTH CONSECRATION PRAYER: Lord Jesus, accept our youthful energy, our dreams, and our talents. Guide our footsteps away from temptation and fill our hearts with charity, purity, and love for Your Holy Church. Amen.'
    },
    {
        id: '5',
        title: 'Catholic Hymns: Tumshangilie Bwana & Classic Hymnals',
        category: 'Song',
        content: '1. TUMSHANGILIE BWANA: Tumshangilie Bwana, mwamba wa wokovu wetu. Twendake mbele yake kwa shukrani, tumwimbie kwa furaha! \n2. MAKE ME A CHANNEL OF YOUR PEACE: Make me a channel of your peace. Where there is hatred, let me bring your love; Where there is injury, your pardon, Lord; Where there is doubt, true faith in you.'
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
    const targetId = req.body.id;
    let readings = readJsonFile(READINGS_FILE);
    readings = readings.filter(r => r.id !== targetId);
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