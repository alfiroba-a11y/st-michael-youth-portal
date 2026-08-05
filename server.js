const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Global Constants & Configurations
const VALID_PURPOSES = ['Tithe', 'Development', 'Offering', 'Welfare', 'Other'];
const JUMUIYAS_LIST = [
    { id: '1', name: 'St. Anne', username: 'stanne', pass: 'anne123' },
    { id: '2', name: 'St. Mary', username: 'stmary', pass: 'mary123' },
    { id: '3', name: 'St. Joseph', username: 'stjoseph', pass: 'joseph123' },
    { id: '4', name: 'St. Peter', username: 'stpeter', pass: 'peter123' }
];

let activeUsers = {}; // In-memory store for real-time presence tracking

// Normalization Helper for Robust String Matching
const normalize = (str) => (str || '').toLowerCase().replace(/[\.\s]/g, '');

// File Storage Helpers
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        const defaultData = {
            pending: [],
            members: [],
            jumuiyaSubmissions: [],
            polls: [],
            archives: [],
            targetAmount: 50000,
            readings: "Today's reading: Trust in the Lord with all your heart. (Proverbs 3:5)",
            events: [],
            messages: []
        };
        await writeData(defaultData);
        return defaultData;
    }
}

async function writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Spiritual Content Helper
async function getSpiritualContent() {
    try {
        return {
            reflection: "“Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.” — Colossians 3:23. Let our contributions and service in our Jumuiyas be driven by love, faith, and community solidarity.",
            patronSaint: "St. Michael the Archangel — Defender in battle, protector against wickedness and snares of the devil."
        };
    } catch (e) {
        return {
            reflection: "Keep your faith active through love and service to one another.",
            patronSaint: "St. Michael the Archangel"
        };
    }
}

// ==========================================
// ANALYTICS & GRAPH DATA ENDPOINT
// ==========================================
app.get('/api/admin/graph-data', async (req, res) => {
    try {
        const data = await readData();
        const labels = JUMUIYAS_LIST.map(j => j.name);
        
        let datasetsData = labels.map(jumuiyaName => {
            const targetNorm = normalize(jumuiyaName);
            let total = 0;
            (data.jumuiyaSubmissions || []).forEach(s => {
                if (s.published && normalize(s.jumuiyaName) === targetNorm) {
                    total += Number(s.amount || 0);
                }
            });
            return total;
        });

        let purposeBreakdown = {};
        VALID_PURPOSES.forEach(p => { purposeBreakdown[p] = 0; });
        (data.jumuiyaSubmissions || []).forEach(s => {
            if (s.published) {
                const pur = VALID_PURPOSES.includes(s.purpose) ? s.purpose : 'Other';
                purposeBreakdown[pur] = (purposeBreakdown[pur] || 0) + Number(s.amount || 0);
            }
        });

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

// ==========================================
// PRESENCE API
// ==========================================
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

// ==========================================
// JUMUIYA PORTAL APIS
// ==========================================
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
    const targetNorm = normalize(jumuiyaName);
    const submissions = (data.jumuiyaSubmissions || []).filter(s => normalize(s.jumuiyaName) === targetNorm);
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

// Jumuiya Download / PDF Report API
app.get('/api/jumuiya/download-data', async (req, res) => {
    try {
        const { jumuiyaName } = req.query;
        const data = await readData();
        const targetJumuiya = jumuiyaName ? normalize(jumuiyaName) : '';

        const submissions = (data.jumuiyaSubmissions || []).filter(s => {
            if (!targetJumuiya) return true;
            return normalize(s.jumuiyaName) === targetJumuiya;
        });

        let jumuiyaCollected = 0;
        let purposeMap = {};
        VALID_PURPOSES.forEach(p => { purposeMap[p] = 0; });

        submissions.forEach(s => {
            if (s.published) {
                const amt = Number(s.amount || 0);
                jumuiyaCollected += amt;
                const pur = VALID_PURPOSES.includes(s.purpose) ? s.purpose : 'Other';
                purposeMap[pur] = (purposeMap[pur] || 0) + amt;
            }
        });

        let html = `<!DOCTYPE html>
        <html>
        <head>
            <title>${jumuiyaName || 'Jumuiya'} - Activity & Contributions Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 25px; color: #333; }
                h1 { font-size: 22px; color: #0d6efd; margin-bottom: 2px; }
                h2 { font-size: 16px; border-bottom: 2px solid #0d6efd; padding-bottom: 5px; margin-top: 30px; color: #198754; }
                p { font-size: 12px; color: #666; }
                .card-box { background: #f8f9fa; border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 6px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f1f3f5; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <h1>${jumuiyaName ? jumuiyaName + ' Jumuiya' : 'Jumuiya Portal'} Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <button class="no-print" onclick="window.print()" style="padding: 10px 20px; background: #0d6efd; color: white; border: none; cursor: pointer; margin-bottom: 20px; font-weight: bold; border-radius: 4px;">🖨️ Print / Save as PDF</button>
            
            <div class="card-box">
                <h3 style="margin: 0 0 10px 0;">📊 Total Verified Contributions: KES ${jumuiyaCollected.toLocaleString()}</h3>
            </div>

            <h2>Submissions History</h2>
            <table>
                <thead><tr><th>Contributor Name</th><th>Amount (KES)</th><th>Purpose</th><th>Status</th></tr></thead>
                <tbody>`;
        
        if (submissions.length === 0) {
            html += `<tr><td colspan="4" style="text-align: center; color: #777;">No records found for this Jumuiya.</td></tr>`;
        } else {
            submissions.forEach(s => {
                html += `<tr><td>${s.name}</td><td>KES ${Number(s.amount || 0).toLocaleString()}</td><td>${s.purpose || 'Other'}</td><td>${s.published ? 'Published' : 'Pending Review'}</td></tr>`;
            });
        }
        
        html += `</tbody></table>
            <script>window.onload = function() { setTimeout(() => { window.print(); }, 500); };</script>
        </body></html>`;

        const filename = `${(jumuiyaName || 'Jumuiya').replace(/[^a-zA-Z0-9]/g, '_')}_Report.html`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(html);
    } catch (e) {
        console.error('Jumuiya Export Error:', e);
        res.status(500).send('Error generating jumuiya report.');
    }
});

// Jumuiya Members Directory Endpoint
app.get('/api/jumuiya/members', async (req, res) => {
    try {
        const { jumuiyaName } = req.query;
        if (!jumuiyaName) {
            return res.json({ success: false, message: 'Jumuiya name is required.' });
        }
        const data = await readData();
        const targetJumuiya = normalize(jumuiyaName);
        const jumuiyaMembers = (data.members || []).filter(m => normalize(m.jumuiya) === targetJumuiya);

        res.json({ success: true, members: jumuiyaMembers });
    } catch (err) {
        console.error('Error fetching Jumuiya members:', err);
        res.status(500).json({ success: false, message: 'Server error fetching members.' });
    }
});

// Jumuiya Export Alternative Alias
app.get('/api/jumuiya/export', async (req, res) => {
    req.url = '/api/jumuiya/download-data';
    app.handle(req, res);
});

// ==========================================
// YOUTH PORTAL APIS
// ==========================================
app.post('/api/youth/login', async (req, res) => {
    const { name, pass } = req.body;
    const data = await readData();
    const cleanName = name.trim().toLowerCase();

    const member = (data.members || []).find(m => m.name.toLowerCase() === cleanName);
    if (member) {
        if (member.pass === pass) return res.json({ success: true, name: member.name, jumuiya: member.jumuiya });
        return res.json({ success: false, message: 'Incorrect password.' });
    }
    if ((data.pending || []).find(p => p.name.toLowerCase() === cleanName)) {
        return res.json({ success: false, message: 'Your account is still pending approval.' });
    }
    res.json({ success: false, message: 'Member not found.' });
});

app.post('/api/youth/message', async (req, res) => {
    const { sender, text } = req.body;
    if (!sender || !text) return res.json({ success: false });
    const data = await readData();
    if (!data.messages) data.messages = [];
    data.messages.push({ id: Date.now().toString(), sender, text, time: new Date().toLocaleString() });
    await writeData(data);
    res.json({ success: true });
});

// ==========================================
// MASTER ADMIN APIS
// ==========================================
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
            contributionsMap[r.jumuiyaName] += Number(r.amount || 0);
        }
    });

    res.json({ 
        success: true, 
        pending: data.pending || [], 
        members: data.members || [], 
        passwordResets: passwordResets, 
        jumuiyaSubmissions: data.jumuiyaSubmissions || [],
        polls: data.polls || [],
        archives: data.archives || [],
        targetAmount: data.targetAmount || 50000,
        contributionsMap,
        readings: data.readings, 
        events: data.events || [], 
        messages: data.messages || [],
        reflection,
        textReflection: reflection,
        patronSaint,
        validPurposes: VALID_PURPOSES
    });
});

app.post('/api/admin/set-target', async (req, res) => {
    try {
        const { targetAmount } = req.body;
        const data = await readData();
        data.targetAmount = parseFloat(targetAmount) || 0;
        await writeData(data);
        res.json({ success: true, targetAmount: data.targetAmount });
    } catch (err) {
        console.error('Error setting target:', err);
        res.status(500).json({ success: false, message: 'Server error setting target.' });
    }
});

app.post('/api/admin/close-cycle', async (req, res) => {
    try {
        const { cycleName } = req.body;
        const data = await readData();
        
        if (!data.archives) data.archives = [];
        
        const currentPublished = (data.jumuiyaSubmissions || []).filter(r => r.published);
        data.archives.push({
            cycleName: cycleName || `Cycle ${new Date().toLocaleDateString()}`,
            closedAt: new Date().toLocaleString(),
            records: currentPublished
        });

        data.jumuiyaSubmissions = (data.jumuiyaSubmissions || []).filter(r => !r.published);
        await writeData(data);

        res.json({ success: true, message: 'Cycle closed, archived, and reset successfully!' });
    } catch (err) {
        console.error('Error closing cycle:', err);
        res.status(500).json({ success: false, message: 'Error closing active cycle.' });
    }
});

// Master Admin PDF / HTML Export API
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
                if (contributionsMap[r.jumuiyaName] !== undefined) {
                    contributionsMap[r.jumuiyaName] += amt;
                } else {
                    contributionsMap[r.jumuiyaName] = amt;
                }
            }
        });

        const targetAmount = data.targetAmount || 50000;
        const percentage = Math.min(Math.round((totalCollected / targetAmount) * 100), 100);

        let html = `<!DOCTYPE html>
        <html>
        <head>
            <title>St. Michael Kasaini Youth Portal Master Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 25px; color: #333; }
                h1 { font-size: 22px; color: #0d6efd; margin-bottom: 2px; }
                h2 { font-size: 16px; border-bottom: 2px solid #0d6efd; padding-bottom: 5px; margin-top: 30px; color: #198754; }
                p { font-size: 12px; color: #666; }
                .card-box { background: #f8f9fa; border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 6px; }
                .metrics { display: flex; justify-content: space-between; margin-top: 10px; font-weight: bold; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f1f3f5; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <h1>St. Michael Kasaini Youth Portal</h1>
            <p>Master Admin Comprehensive & Analytics Report — Generated on ${new Date().toLocaleString()}</p>
            <button class="no-print" onclick="window.print()" style="padding: 10px 20px; background: #0d6efd; color: white; border: none; cursor: pointer; margin-bottom: 20px; font-weight: bold; border-radius: 4px;">🖨️ Print / Save as PDF</button>`;

        if (type === 'financial') {
            html += `<div class="card-box">
                <h3 style="margin: 0 0 10px 0; color: #333;">📊 Financial & Target Summary</h3>
                <div class="metrics">
                    <div>Total Collected: KES ${totalCollected.toLocaleString()}</div>
                    <div>Monthly Target: KES ${targetAmount.toLocaleString()}</div>
                    <div>Achievement: ${percentage}%</div>
                </div>
            </div>

            <h2>Jumuiya Performance Analytics Breakdown</h2>
            <table>
                <thead><tr><th>Jumuiya Name</th><th>Total Submissions / Contributions (KES)</th></tr></thead>
                <tbody>`;
            
            for (const [jumuiyaName, amount] of Object.entries(contributionsMap)) {
                html += `<tr><td><strong>${jumuiyaName}</strong></td><td>KES ${Number(amount).toLocaleString()}</td></tr>`;
            }
            html += `</tbody></table>`;

            html += `<h2>Jumuiya Submissions Review List</h2>
            <table>
                <thead><tr><th>Jumuiya Name</th><th>ID</th><th>Contributor Name</th><th>Amount (KES)</th><th>Purpose</th><th>Status</th></tr></thead>
                <tbody>`;
            
            const submissions = data.jumuiyaSubmissions || [];
            if (submissions.length === 0) {
                html += `<tr><td colspan="6" style="text-align: center; color: #777;">No submissions found.</td></tr>`;
            } else {
                submissions.forEach((s, idx) => {
                    html += `<tr><td>${s.jumuiyaName || 'N/A'}</td><td>${s.id || idx + 1}</td><td>${s.name}</td><td>KES ${Number(s.amount || 0).toLocaleString()}</td><td>${s.purpose || 'Other'}</td><td>${s.published ? 'Published' : 'Pending'}</td></tr>`;
                });
            }
            html += `</tbody></table>`;

        } else if (type === 'people') {
            html += `<h2>Registered Youth Directory</h2>
            <table>
                <thead><tr><th>#</th><th>ID</th><th>Name</th><th>Phone Number</th><th>Jumuiya</th><th>Group</th></tr></thead>
                <tbody>`;
            
            const members = data.members || [];
            if (members.length === 0) {
                html += `<tr><td colspan="6" style="text-align: center; color: #777;">No registered members found.</td></tr>`;
            } else {
                members.forEach((m, idx) => {
                    const hiddenPhone = m.phone ? m.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') : '****';
                    html += `<tr><td>${idx + 1}</td><td>${m.customId || 'N/A'}</td><td>${m.name}</td><td>${hiddenPhone}</td><td>${m.jumuiya || 'N/A'}</td><td>${m.group || 'N/A'}</td></tr>`;
                });
            }
            html += `</tbody></table>`;
        } else {
            html += `<p style="color: red; font-weight: bold;">Invalid or missing download type specified.</p>`;
        }

        html += `<script>window.onload = function() { setTimeout(() => { window.print(); }, 500); };</script>
        </body></html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (e) {
        console.error('Master Export Error:', e);
        res.status(500).send('Error generating printable report.');
    }
});

app.post('/api/admin/approve', async (req, res) => {
    const { id } = req.body;
    const data = await readData();
    const index = (data.pending || []).findIndex(p => p.id === id);
    if (index !== -1) {
        const approved = data.pending.splice(index, 1)[0];
        if (!data.members) data.members = [];
        approved.customId = `K${data.members.length + 1}`;
        data.members.push(approved);
        await writeData(data);
    }
    res.json({ success: true });
});

app.post('/api/admin/reject', async (req, res) => {
    const { id } = req.body;
    const data = await readData();
    data.pending = (data.pending || []).filter(p => p.id !== id);
    await writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/remove-member', async (req, res) => {
    const { id } = req.body;
    const data = await readData();
    data.members = (data.members || []).filter(m => m.id !== id && m._id !== id);
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
