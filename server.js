const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Root route handler to serve index.html directly from the root folder
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

// Complete Structured Catholic Content (Sunday Readings, Recyclable Verse Pool, Separated Rosary Mysteries, Structured Way of the Cross, and Full Prayers)
const DEFAULT_READINGS = [
    {
        id: '1',
        title: 'Sunday Liturgy & Daily Readings',
        category: 'Sunday Readings',
        content: [
            'FIRST READING: Exodus 16:2-4, 12-15 — The Lord feeds His people with bread from heaven.',
            'RESPONSORIAL PSALM: Psalm 78:3-4, 23-24, 25, 54 — "The Lord gave them bread from heaven."',
            'SECOND READING: Ephesians 4:17, 20-24 — Put on the new self, created in God’s righteousness.',
            'GOSPEL: John 6:24-35 — "I am the bread of life; whoever comes to me shall never hunger."'
        ]
    },
    {
        id: '2',
        title: 'Daily Scripture Verse Pool (Recyclable)',
        category: 'Bible Reading',
        verses: [
            '“Trust in the Lord with all your heart and lean not on your understanding; in all your ways submit to him, and he will make your paths straight.” (Proverbs 3:5-6)',
            '“I can do all things through Christ who strengthens me.” (Philippians 4:13)',
            '“The Lord is my shepherd; I shall not want.” (Psalm 23:1)',
            '“Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.” (Joshua 1:9)',
            '“And we know that in all things God works for the good of those who love him, who have been called according to his purpose.” (Romans 8:28)'
        ]
    },
    {Normally I can help with things like this, but I don't seem to have access to that content. You can try again or ask me for something else.