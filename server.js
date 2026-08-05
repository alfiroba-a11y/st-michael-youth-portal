// ==========================================
// TARGET MANAGEMENT & ENHANCED EXPORT API UPDATES
// ==========================================

// API to get Global Stats & Target Amount
app.get('/api/admin/global-stats', async (req, res) => {
    try {
        const data = await readData();
        let totalCollected = 0;
        
        (data.jumuiyaSubmissions || []).forEach(r => {
            if (r.published) {
                totalCollected += Number(r.amount || 0);
            }
        });

        res.json({
            success: true,
            totalCollected,
            targetAmount: data.targetAmount || 50000
        });
    } catch (err) {
        console.error('Error fetching global stats:', err);
        res.status(500).json({ success: false, message: 'Server error loading stats.' });
    }
});

// API to Set Monthly Target Amount
app.post('/api/admin/set-target', async (req, res) => {
    try {
        const { targetAmount } = req.body;
        const parsedTarget = parseFloat(targetAmount);
        
        if (isNaN(parsedTarget) || parsedTarget <= 0) {
            return res.json({ success: false, message: 'Invalid target amount.' });
        }

        const data = await readData();
        data.targetAmount = parsedTarget;
        await writeData(data);

        res.json({ success: true, message: 'Monthly youth target updated successfully!' });
    } catch (err) {
        console.error('Error setting target:', err);
        res.status(500).json({ success: false, message: 'Error updating target.' });
    }
});

// API to Close and Archive Current Cycle
app.post('/api/admin/close-cycle', async (req, res) => {
    try {
        const { cycleName } = req.body;
        const data = await readData();
        
        if (!data.archives) data.archives = [];
        
        // Push current published submissions into archives
        const currentPublished = (data.jumuiyaSubmissions || []).filter(r => r.published);
        data.archives.push({
            cycleName: cycleName || `Cycle ${new Date().toLocaleDateString()}`,
            closedAt: new Date().toLocaleString(),
            records: currentPublished
        });

        // Clear out published records or reset for the new cycle
        data.jumuiyaSubmissions = (data.jumuiyaSubmissions || []).filter(r => !r.published);
        await writeData(data);

        res.json({ success: true, message: 'Cycle closed, archived, and reset successfully!' });
    } catch (err) {
        console.error('Error closing cycle:', err);
        res.status(500).json({ success: false, message: 'Error closing active cycle.' });
    }
});

// Upgraded PDF / HTML Export Route including Target Status & Contributions Breakdown
app.get('/api/admin/download-data', async (req, res) => {
    try {
        const data = await readData();
        
        let totalCollected = 0;
        let contributionsMap = {};
        
        // Official list defined locally to completely prevent ReferenceErrors on deployment
        const officialJumuiyas = [
            "St. Catherine", "St. Ann", "St. Michael", "St. Raphael", 
            "St. Francisco", "St. Monica", "St. Stephen", "St. Jacinta", 
            "St. Paul", "St. Francis of Assisi", "St. Charles Lwanga"
        ];
        
        officialJumuiyas.forEach(name => { contributionsMap[name] = 0; });

        (data.jumuiyaSubmissions || []).forEach(r => {
            if (r.published) {
                const amt = Number(r.amount || 0);
                totalCollected += amt;
                if (contributionsMap[r.jumuiyaName] !== undefined) {
                    contributionsMap[r.jumuiyaName] += amt;
                } else {
                    // Gracefully handle any dynamic or custom entry outside standard list
                    contributionsMap[r.jumuiyaName] = amt;
                }
            }
        });

        const targetAmount = data.targetAmount || 50000;
        const percentage = Math.min(Math.round((totalCollected / targetAmount) * 100), 100);

        let html = `<!DOCTYPE html>
        <html>
        <head>
            <title>St. Michael Kasaini Youth Portal Report</title>
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
            <button class="no-print" onclick="window.print()" style="padding: 10px 20px; background: #0d6efd; color: white; border: none; cursor: pointer; margin-bottom: 20px; font-weight: bold; border-radius: 4px;">🖨️ Print / Save as PDF</button>
            
            <div class="card-box">
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

        html += `</tbody></table>

            <h2>Registered Members Directory</h2>
            <table>
                <thead><tr><th>#</th><th>ID</th><th>Name</th><th>Phone</th><th>Jumuiya</th><th>Group</th></tr></thead>
                <tbody>`;
        
        const members = data.members || [];
        if (members.length === 0) {
            html += `<tr><td colspan="6" style="text-align: center; color: #777;">No registered members found.</td></tr>`;
        } else {
            members.forEach((m, idx) => {
                html += `<tr><td>${idx + 1}</td><td>${m.customId || 'N/A'}</td><td>${m.name}</td><td>${m.phone || 'N/A'}</td><td>${m.jumuiya || 'N/A'}</td><td>${m.group || 'N/A'}</td></tr>`;
            });
        }
        
        html += `</tbody></table>
            <script>window.onload = function() { setTimeout(() => { window.print(); }, 500); };</script>
        </body></html>`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (e) {
        console.error('Export Error:', e);
        res.status(500).send('Error generating printable report.');
    }
});
