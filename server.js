const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const MONGO_URI = process.env.MONGO_URI;
let db = null;

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

const VALID_PURPOSES = [
    'Christmas collection',
    'Easter collection',
    'Diocesan collection',
    'Youth harambee',
    'PMC contribution',
    'Other'
];

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
    } catch (err) {
        console.error('Error updating automated reflection:', err.message);
    }
}

async function initializePatronSaint() {
    if (!db) return;
    try {
        const saintData = {
            type: 'patronSaint',
            name: "St. Aloysius Gonzaga",
            feastDay: "June 21",
            message: "Model of purity, youth, and selfless charity. Patron saint of Christian youth."
        };

        await db.collection('settings').updateOne(
            { type: 'patronSaint' },
            { $set: saintData },
            { upsert: true }
        );
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
            await initializePatronSaint();
            await rotateDailyReflection();
        } catch (err) {
            console.error('MongoDB connection error:', err.message);
        }
    }
}
initDB();

cron.schedule('0 0 * * *', () => {
    rotateDailyReflection();
});

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
    archives: [],
    events: [],
    messages: [],
    readings: []
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
                    polls: data.polls || [],
                    archives: data.archives || [],
                    targetAmount: data.targetAmount || 50000,
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

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'member.html')));
app.get('/secret-admin-portal-kasaini-2026', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/jumuiya-portal', (req, res) => res.sendFile(path.join(__dirname, 'jumuiya-portal.html')));

async function getSpiritualContent() {
    let reflection = null;
    let patronSaint = null;
    if (db) {
        try {
            reflection = await db.collection('settings').findOne({ type: 'reflection' });
            patronSaint = await db.collection('settings').findOne({ type: 'patronSaint' });
        } catch (err) {}
    }
    return { 
        reflection: reflection || automatedReflections[0], 
        patronSaint: patronSaint || { name: "St. Aloysius Gonzaga", feastDay: "June 21" } 
    };
}

app.get('/api/spiritual/content', async (req, res) => {
    const content = await getSpiritualContent();
    res.json({ success: true, ...content });
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
    if (!name || !jumuiyaName) return res.json({ success: false, message: 'Name and Jumuiya name required.' });

    const data = await readData();
    if (!data.jumuiyaSubmissions) data.jumuiyaSubmissions = [];

    data.jumuiyaSubmissions.push({
        id: Date.now().toString(),
        jumuiyaName,
        name: name.trim(),
        amount: parseFloat(amount) || 0,
        purpose: VALID_PURPOSES.includes(purpose) ? purpose : 'Other',
        published: false
    });

    await writeData(data);
    res.json({ success: true, message: 'Contribution recorded successfully!' });
});

// ==========================================
// FIXED JUMUIYA PORTAL DOWNLOAD ROUTE
// ==========================================
app.get('/api/jumuiya/download-data', async (req, res) => {
    try {
        const { jumuiyaName } = req.query;
        const data = await readData();
        
        let jumuiyaCollected = 0;
        let allJumuiyasMap = {};
        JUMUIYAS_LIST.forEach(j => { allJumuiyasMap[j.name] = 0; });

        (data.jumuiyaSubmissions || []).forEach(s => {
            const amt = Number(s.amount || 0);
            if (s.published && s.jumuiyaName && allJumuiyasMap[s.jumuiyaName] !== undefined) {
                allJumuiyasMap[s.jumuiyaName] += amt;
            }
            if (jumuiyaName && s.jumuiyaName === jumuiyaName) {
                jumuiyaCollected += amt;
            }
        });

        const submissions = (data.jumuiyaSubmissions || []).filter(s => !jumuiyaName || s.jumuiyaName === jumuiyaName);

        let html = `<!DOCTYPE html>
        <html>
        <head>
            <title>${jumuiyaName || 'Jumuiya'} - Report & Summary</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 25px; color: #333; }
                h1 { font-size: 20px; color: #0d6efd; }
                h2 { font-size: 14px; border-bottom: 2px solid #0d6efd; padding-bottom: 4px; margin-top: 20px; color: #198754; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
                th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                th { background-color: #f1f3f5; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <h1>${jumuiyaName ? jumuiyaName + ' Jumuiya Report' : 'Jumuiya Portal Report'}</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <button class="no-print" onclick="window.print()" style="padding: 8px 16px; background: #0d6efd; color: white; border: none; cursor: pointer; margin-bottom: 15px; border-radius: 4px;">🖨️ Print / Save as PDF</button>
            
            ${jumuiyaName ? `<p><strong>Total Submissions Collected:</strong> KES ${jumuiyaCollected.toLocaleString()}</p>` : ''}

            <h2>Submissions List</h2>
            <table>
                <thead><tr><th>Jumuiya Name</th><th>ID</th><th>Contributor Name</th><th>Amount (KES)</th><th>Purpose</th><th>Status</th></tr></thead>
                <tbody>`;
        
        if (submissions.length === 0) {
            html += `<tr><td colspan="6" style="text-align: center;">No records found.</td></tr>`;
        } else {
            submissions.forEach((s, idx) => {
                html += `<tr><td>${s.jumuiyaName || 'N/A'}</td><td>${s.id || idx + 1}</td><td>${s.name}</td><td>KES ${Number(s.amount || 0).toLocaleString()}</td><td>${s.purpose || 'Other'}</td><td>${s.published ? 'Published' : 'Pending'}</td></tr>`;
            });
        }
        
        html += `</tbody></table>
            <h2>All Jumuiyas Summary Overview</h2>
            <table>
                <thead><tr><th>Jumuiya Name</th><th>Total Verified (KES)</th></tr></thead>
                <tbody>`;
        
        for (const [jName, totalAmt] of Object.entries(allJumuiyasMap)) {
            html += `<tr><td><strong>${jName}</strong></td><td>KES ${Number(totalAmt).toLocaleString()}</td></tr>`;
        }

        html += `</tbody></table>
            <script>window.onload = function() { setTimeout(() => { window.print(); }, 500); };</script>
        </body></html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (e) {
        res.status(500).send('Error generating jumuiya report.');
    }
});

app.get('/api/youth/directory', async (req, res) => {
    const data = await readData();
    const { reflection, patronSaint } = await getSpiritualContent();
    res.json({ 
        success: true, 
        members: data.members.map(m => ({ ...m, phone: maskPhone(m.phone) })), 
        events: data.events, 
        reflection, 
        patronSaint 
    });
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    res.json({ success: (username === 'Admin' && password === 'Admin0247') });
});

app.get('/api/admin/data', async (req, res) => {
    const data = await readData();
    const { reflection, patronSaint } = await getSpiritualContent();
    res.json({ success: true, ...data, reflection, patronSaint, validPurposes: VALID_PURPOSES });
});

// ==========================================
// FIXED MASTER ADMIN DOWNLOAD ROUTE (Supports ?type=financial & ?type=people)
// ==========================================
app.get('/api/admin/download-data', async (req, res) => {
    try {
        const { type } = req.query; 
        const data = await readData();
        
        let html = `<!DOCTYPE html>
        <html>
        <head>
            <title>St. Michael Kasaini Youth Portal - Master Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 25px; color: #333; }
                h1 { font-size: 20px; color: #0d6efd; }
                h2 { font-size: 14px; border-bottom: 2px solid #0d6efd; padding-bottom: 4px; margin-top: 20px; color: #198754; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
                th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                th { background-color: #f1f3f5; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <h1>St. Michael Kasaini Youth Portal</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <button class="no-print" onclick="window.print()" style="padding: 8px 16px; background: #0d6efd; color: white; border: none; cursor: pointer; margin-bottom: 15px; border-radius: 4px;">🖨️ Print / Save as PDF</button>`;

        if (type === 'financial') {
            let contributionsMap = {};
            JUMUIYAS_LIST.forEach(j => { contributionsMap[j.name] = 0; });

            (data.jumuiyaSubmissions || []).forEach(r => {
                if (r.published && contributionsMap[r.jumuiyaName] !== undefined) {
                    contributionsMap[r.jumuiyaName] += Number(r.amount || 0);
                }
            });

            html += `<h2>Jumuiya Contribution Summary (Performance)</h2>
            <table>
                <thead><tr><th>Jumuiya Name</th><th>Total Verified Contributions (KES)</th></tr></thead>
                <tbody>`;
            for (const [jName, amt] of Object.entries(contributionsMap)) {
                html += `<tr><td><strong>${jName}</strong></td><td>KES ${Number(amt).toLocaleString()}</td></tr>`;
            }
            html += `</tbody></table>`;

            html += `<h2>Jumuiya Submissions List</h2>
            <table>
                <thead><tr><th>Jumuiya Name</th><th>ID</th><th>Name & Amount / Purpose</th><th>Amount (KES)</th><th>Purpose</th><th>Status</th></tr></thead>
                <tbody>`;
            
            const submissions = data.jumuiyaSubmissions || [];
            if (submissions.length === 0) {
                html += `<tr><td colspan="6" style="text-align: center;">No submissions found.</td></tr>`;
            } else {
                submissions.forEach((s, idx) => {
                    html += `<tr><td>${s.jumuiyaName || 'N/A'}</td><td>${s.id || idx + 1}</td><td>${s.name}</td><td>KES ${Number(s.amount || 0).toLocaleString()}</td><td>${s.purpose || 'Other'}</td><td>${s.published ? 'Published' : 'Pending'}</td></tr>`;
                });
            }
            html += `</tbody></table>`;

        } else if (type === 'people') {
            html += `<h2>Registered Members List (Directory)</h2>
            <table>
                <thead><tr><th>#</th><th>ID</th><th>Name</th><th>Jumuiya</th><th>Group</th></tr></thead>
                <tbody>`;
            
            const members = data.members || [];
            if (members.length === 0) {
                html += `<tr><td colspan="5" style="text-align: center;">No registered members found.</td></tr>`;
            } else {
                members.forEach((m, idx) => {
                    html += `<tr><td>${idx + 1}</td><td>${m.customId || 'N/A'}</td><td>${m.name}</td><td>${m.jumuiya || 'N/A'}</td><td>${m.group || 'N/A'}</td></tr>`;
                });
            }
            html += `</tbody></table>`;
        } else {
            html += `<p>Invalid download selection option provided.</p>`;
        }

        html += `<script>window.onload = function() { setTimeout(() => { window.print(); }, 500); };</script>
        </body></html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (e) {
        res.status(500).send('Error generating printable report.');
    }
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
