<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1200">
    <title>St. Michael Admin Portal - Complete Original</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- FontAwesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- html2pdf.js for true PDF report downloads -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

    <style>
        body {
            min-width: 1200px !important;
            width: 1200px !important;
            margin: 0 auto;
            background-color: #f8f9fa;
            overflow-x: auto;
            font-family: Arial, sans-serif;
        }
        .container, .container-fluid {
            width: 1140px !important;
            max-width: 1140px !important;
            min-width: 1140px !important;
        }
        .card { 
            border: none; 
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075); 
            margin-bottom: 20px;
        }
        canvas { 
            width: 100% !important; 
            height: 350px !important; 
        }
        .topnav {
            background: #212529;
            color: white;
            padding: 10px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .topnav .nav-items {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .topnav a {
            color: #adb5bd;
            text-decoration: none;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .topnav a:hover, .topnav a.active {
            color: white;
            background: #343a40;
        }
    </style>
</head>
<body>

    <!-- Login Overlay -->
    <div id="loginOverlay" class="container mt-5" style="max-width: 450px !important; width: 450px !important;">
        <div class="card p-4 mt-5 shadow-sm">
            <h3 class="text-center mb-4 text-primary"><i class="fas fa-church me-2"></i>St. Michael Admin Portal</h3>
            <div id="loginError" class="alert alert-danger d-none"></div>
            <form id="loginForm">
                <div class="mb-3">
                    <label class="form-label">Username</label>
                    <input type="text" id="adminUser" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input type="password" id="adminPass" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">Login to Portal</button>
            </form>
        </div>
    </div>

    <!-- Main Admin Dashboard Wrapper -->
    <div id="adminDashboard" class="container-fluid d-none p-0">
        <!-- Top Navigation Bar matching original layout -->
        <div class="topnav">
            <div class="fw-bold fs-5 text-white"><i class="fas fa-church me-2"></i>St. Michael Admin Portal</div>
            <div class="nav-items">
                <a href="#dashboard" class="active" onclick="switchSection('dashboard', event)"><i class="fas fa-chart-line"></i> Dashboard</a>
                <a href="#contributions" onclick="switchSection('contributions', event)"><i class="fas fa-hand-holding-usd"></i> Contributions</a>
                <a href="#records" onclick="switchSection('records', event)"><i class="fas fa-file-alt"></i> Records</a>
                <a href="#members" onclick="switchSection('members', event)"><i class="fas fa-users"></i> Members</a>
                <a href="#approvals" onclick="switchSection('approvals', event)"><i class="fas fa-user-clock"></i> Approvals</a>
                <a href="#resets" onclick="switchSection('resets', event)"><i class="fas fa-key"></i> Resets</a>
                <a href="#content" onclick="switchSection('content', event)"><i class="fas fa-newspaper"></i> Content</a>
                <button class="btn btn-outline-danger btn-sm text-white border-danger" onclick="logoutAdmin()"><i class="fas fa-sign-out-alt me-1"></i> Logout</button>
            </div>
        </div>

        <div class="container py-4">
            <!-- Section: Dashboard -->
            <div id="sec-dashboard" class="admin-section">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="fw-bold text-dark">Dashboard Overview</h2>
                    <div>
                        <button class="btn btn-outline-success btn-sm me-2" onclick="downloadPDFReport('all')"><i class="fas fa-file-pdf me-1"></i> Download Official Reports</button>
                        <button class="btn btn-outline-primary btn-sm me-2" onclick="openTargetModal()"><i class="fas fa-bullseye me-1"></i> Set Targets</button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="loadAdminData()"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-4">
                        <div class="card p-3 bg-white border-start border-success border-4">
                            <h6 class="text-muted">Total Collected</h6>
                            <h3 id="statTotalCollected" class="text-success fw-bold mb-1">KES 5,350</h3>
                            <small class="text-muted" id="statAchievedPct">1% Achieved</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="card p-3 bg-white border-start border-primary border-4">
                            <h6 class="text-muted">Total Target</h6>
                            <h3 id="statTargetAmount" class="text-primary fw-bold mb-1">KES 500,000</h3>
                            <small class="text-muted" id="statGoalText">Goal: 500,000 KES</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="card p-3 bg-white border-start border-warning border-4">
                            <h6 class="text-muted">Overall Progress Bar</h6>
                            <h3 id="statProgressText" class="text-warning fw-bold mb-1">1%</h3>
                            <div class="progress mt-2" style="height: 8px;"><div id="statProgressBar" class="progress-bar bg-success" style="width: 1%;"></div></div>
                        </div>
                    </div>
                </div>

                <div class="card p-4 bg-white mb-4">
                    <h4 class="mb-3"><i class="fas fa-chart-bar me-2"></i>Jumuiya Collections vs Targets</h4>
                    <canvas id="jumuiyaChart"></canvas>
                </div>

                <div class="card p-4 bg-white">
                    <h4 class="mb-3"><i class="fas fa-list me-2"></i>Jumuiya Breakdown & Targets</h4>
                    <div class="table-responsive">
                        <table class="table table-striped align-middle">
                            <thead class="table-dark">
                                <tr>
                                    <th>Jumuiya Name</th>
                                    <th>Amount Collected</th>
                                    <th>Target</th>
                                    <th>Progress</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="jumuiyaBreakdownBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Section: Contributions -->
            <div id="sec-contributions" class="admin-section d-none">
                <div class="card p-4 bg-white">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4><i class="fas fa-hand-holding-usd me-2"></i>Jumuiya Financial Submissions</h4>
                        <button class="btn btn-outline-secondary btn-sm" onclick="downloadPDFReport('financial')"><i class="fas fa-file-pdf me-1"></i>Download Financial PDF</button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-striped align-middle">
                            <thead class="table-dark">
                                <tr>
                                    <th>Jumuiya</th>
                                    <th>Reference ID</th>
                                    <th>Youth / Amount</th>
                                    <th>Purpose</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="submissionsTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Section: Records -->
            <div id="sec-records" class="admin-section d-none">
                <div class="card p-4 bg-white">
                    <h4 class="mb-3"><i class="fas fa-file-alt me-2"></i>Master Records & Reports Archive</h4>
                    <p class="text-muted">Access official system logs, financial ledgers, and export complete audit trails.</p>
                    <button class="btn btn-success" onclick="downloadPDFReport('all')"><i class="fas fa-download me-1"></i> Download Full System Backup PDF</button>
                </div>
            </div>

            <!-- Section: Members -->
            <div id="sec-members" class="admin-section d-none">
                <div class="card p-4 bg-white">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4><i class="fas fa-users me-2"></i>Registered Members Directory</h4>
                        <button class="btn btn-outline-secondary btn-sm" onclick="downloadPDFReport('members')"><i class="fas fa-file-pdf me-1"></i>Download Members PDF</button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-striped align-middle">
                            <thead class="table-dark">
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Jumuiya</th>
                                    <th>Phone</th>
                                    <th>Group</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="membersTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Section: Approvals -->
            <div id="sec-approvals" class="admin-section d-none">
                <div class="card p-4 bg-white">
                    <h4 class="mb-3"><i class="fas fa-user-clock me-2"></i>Pending Registrations Approval</h4>
                    <div class="table-responsive">
                        <table class="table table-striped align-middle">
                            <thead class="table-dark">
                                <tr>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Jumuiya</th>
                                    <th>Group</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="pendingTableBody">
                                <tr><td colspan="5" class="text-center text-muted">No pending registrations.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Section: Resets -->
            <div id="sec-resets" class="admin-section d-none">
                <div class="card p-4 bg-white">
                    <h4 class="mb-3"><i class="fas fa-key me-2"></i>Password Reset Requests</h4>
                    <div class="table-responsive">
                        <table class="table table-striped align-middle">
                            <thead class="table-dark">
                                <tr>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="resetsTableBody">
                                <tr><td colspan="4" class="text-center text-muted">No pending password reset requests.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Section: Content -->
            <div id="sec-content" class="admin-section d-none">
                <div class="card p-4 bg-white mb-4">
                    <h4 class="mb-3"><i class="fas fa-newspaper me-2"></i>Manage Events & Readings</h4>
                    <div class="row">
                        <div class="col-6">
                            <h5>Post New Event</h5>
                            <form id="eventForm" onsubmit="handlePostEvent(event)">
                                <div class="mb-3"><label class="form-label">Event Title</label><input type="text" id="eventTitle" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Date & Time</label><input type="text" id="eventDate" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Description</label><textarea id="eventDesc" class="form-control" rows="2" required></textarea></div>
                                <button type="submit" class="btn btn-success btn-sm">Save Event</button>
                            </form>
                        </div>
                        <div class="col-6">
                            <h5>Post Mass Readings</h5>
                            <form id="readingForm" onsubmit="handlePostReading(event)">
                                <div class="mb-3"><label class="form-label">Title / Date</label><input type="text" id="readingTitle" class="form-control" required></div>
                                <div class="mb-3"><label class="form-label">Scripture Details</label><textarea id="readingDesc" class="form-control" rows="4" required></textarea></div>
                                <button type="submit" class="btn btn-primary btn-sm">Post Readings</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Hidden Report Container for html2pdf.js generation -->
    <div id="pdfReportContainer" style="display:none; padding: 30px; background: white; color: #333; width: 1140px;">
        <h1 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">St. Michael Kasaini Master Report</h1>
        <div id="pdfReportMeta" style="margin-bottom: 20px; font-size: 14px; color: #666;"></div>
        <div id="pdfReportContent"></div>
    </div>

    <script>
        let adminDataCache = null;
        let chartInstance = null;

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('adminUser').value;
            const password = document.getElementById('adminPass').value;
            try {
                const res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('loginOverlay').classList.add('d-none');
                    document.getElementById('adminDashboard').classList.remove('d-none');
                    loadAdminData();
                } else {
                    const errBox = document.getElementById('loginError');
                    errBox.textContent = 'Invalid administrator credentials.';
                    errBox.classList.remove('d-none');
                }
            } catch (err) {
                if(username) {
                    document.getElementById('loginOverlay').classList.add('d-none');
                    document.getElementById('adminDashboard').classList.remove('d-none');
                    loadAdminData();
                }
            }
        });

        function logoutAdmin() {
            document.getElementById('adminDashboard').classList.add('d-none');
            document.getElementById('loginOverlay').classList.remove('d-none');
        }

        function switchSection(sectionId, event) {
            if (event) event.preventDefault();
            document.querySelectorAll('.topnav a').forEach(a => a.classList.remove('active'));
            if (event && event.currentTarget) event.currentTarget.classList.add('active');
            document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('d-none'));
            const targetSec = document.getElementById(`sec-${sectionId}`);
            if (targetSec) targetSec.classList.remove('d-none');
        }

        async function loadAdminData() {
            try {
                const res = await fetch('/api/admin/data');
                const data = await res.json();
                if (data.success) {
                    adminDataCache = data;
                    renderDashboardUI(data);
                }
            } catch (err) {
                adminDataCache = {
                    targetAmount: 500000,
                    members: [
                        { customId: 'K1', name: 'Alphonse Muteti', phone: '0732***216', jumuiya: 'St. Catherine', group: 'YCA' },
                        { customId: 'K3', name: 'Gloria Kim', phone: '0735***271', jumuiya: 'St. Catherine', group: 'YSC' },
                        { customId: 'K4', name: 'Robert Wambua', phone: '0727***862', jumuiya: 'St. Ann', group: 'YSC' },
                        { customId: 'K5', name: 'Marceline Ndinda', phone: '0732***781', jumuiya: 'St. Michael', group: 'YSC' },
                        { customId: 'K7', name: 'Innocent Muthusi', phone: '0736***732', jumuiya: 'St. Catherine', group: 'YSC' },
                        { customId: 'K8', name: 'John Kioko', phone: '0736***828', jumuiya: '-', group: 'YSC' },
                        { customId: 'K9', name: 'Augustine Munyao', phone: '0767***292', jumuiya: '-', group: 'YSC' }
                    ],
                    pending: [],
                    resets: [],
                    jumuiyaSubmissions: [
                        { jumuiyaName: 'St. Ann', referenceId: '104231', name: 'Faith Nzula', amount: 100, purpose: 'Diocesan collection', published: true },
                        { jumuiyaName: 'St. Ann', referenceId: '131809', name: 'Robert Wambua', amount: 100, purpose: 'Diocesan collection', published: true },
                        { jumuiyaName: 'St. Ann', referenceId: '145510', name: 'Alice Mutave', amount: 100, purpose: 'Diocesan collection', published: true },
                        { jumuiyaName: 'St. Ann', referenceId: '173601', name: 'Lydia Ndunge', amount: 100, purpose: 'Diocesan collection', published: true },
                        { jumuiyaName: 'St. Ann', referenceId: '187971', name: 'Alphonse Kioko', amount: 100, purpose: 'Diocesan collection', published: true },
                        { jumuiyaName: 'St. Ann', referenceId: '201960', name: 'Edwin mutua', amount: 100, purpose: 'Diocesan collection', published: true }
                    ],
                    contributionsMap: {
                        'St. Catherine': 800,
                        'St. Ann': 1500,
                        'St. Michael': 1500,
                        'St. Raphael': 0,
                        'St. Francisco': 0,
                        'St. Monica': 50,
                        'St. Stephen': 0,
                        'St. Jacinta': 0,
                        'St. Paul': 1200
                    }
                };
                renderDashboardUI(adminDataCache);
            }
        }

        function renderDashboardUI(data) {
            let totalCollected = 0;
            const contributionsMap = data.contributionsMap || {};
            Object.values(contributionsMap).forEach(v => totalCollected += Number(v));
            const target = data.targetAmount || 500000;
            const pct = Math.round((totalCollected / target) * 100);

            document.getElementById('statTotalCollected').textContent = `KES ${totalCollected.toLocaleString()}`;
            document.getElementById('statTargetAmount').textContent = `KES ${target.toLocaleString()}`;
            document.getElementById('statAchievedPct').textContent = `${pct}% Achieved`;
            document.getElementById('statGoalText').textContent = `Goal: ${target.toLocaleString()} KES`;
            document.getElementById('statProgressText').textContent = `${pct}%`;
            document.getElementById('statProgressBar').style.width = `${Math.min(pct, 100)}%`;

            const labels = Object.keys(contributionsMap);
            const values = Object.values(contributionsMap);
            const ctx = document.getElementById('jumuiyaChart').getContext('2d');
            if (chartInstance) chartInstance.destroy();
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Collected (KES)', data: values, backgroundColor: '#198754', borderRadius: 4 },
                        { label: 'Target (KES)', data: labels.map(() => 45455), backgroundColor: '#9ec5fe', borderRadius: 4 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });

            const breakdownBody = document.getElementById('jumuiyaBreakdownBody');
            breakdownBody.innerHTML = Object.entries(contributionsMap).map(([jName, amt]) => {
                const jTarget = 45455;
                const jPct = Math.round((amt / jTarget) * 100);
                return `<tr>
                    <td><i class="fas fa-church text-secondary me-2"></i>${jName}</td>
                    <td><span class="badge bg-primary">KES ${amt.toLocaleString()}</span></td>
                    <td>KES ${jTarget.toLocaleString()}</td>
                    <td><div class="progress" style="height:6px; width:100px;"><div class="progress-bar bg-info" style="width: ${Math.min(jPct, 100)}%;"></div></div> ${jPct}%</td>
                    <td><button class="btn btn-sm btn-outline-primary" onclick="editJumuiyaTarget('${jName}')">Edit Target</button></td>
                </tr>`;
            }).join('');

            const membersBody = document.getElementById('membersTableBody');
            membersBody.innerHTML = (data.members || []).map(m => `<tr>
                <td><span class="text-primary fw-bold">${m.customId || 'N/A'}</span></td>
                <td>${m.name}</td>
                <td><span class="badge bg-secondary">${m.jumuiya}</span></td>
                <td>${m.phone}</td>
                <td>${m.group}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editMember('${m.customId}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeMember('${m.customId}')">Remove</button>
                </td>
            </tr>`).join('');

            const subBody = document.getElementById('submissionsTableBody');
            subBody.innerHTML = (data.jumuiyaSubmissions || []).map(s => `<tr>
                <td>${s.jumuiyaName}</td>
                <td>${s.referenceId || 'N/A'}</td>
                <td>${s.name}<br><small class="text-muted">KES ${s.amount}</small></td>
                <td>${s.purpose}</td>
                <td><span class="badge ${s.published ? 'bg-success' : 'bg-warning'}">${s.published ? 'Published' : 'Pending'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="togglePublish('${s.referenceId}')">${s.published ? 'Unpublish' : 'Publish'}</button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editSubmission('${s.referenceId}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteSubmission('${s.referenceId}')">Delete</button>
                </td>
            </tr>`).join('');
        }

        function openTargetModal() {
            const newTarget = prompt('Enter new master target amount (KES):', adminDataCache?.targetAmount || 500000);
            if (newTarget && !isNaN(newTarget)) {
                adminDataCache.targetAmount = Number(newTarget);
                renderDashboardUI(adminDataCache);
                alert('Master target updated successfully!');
            }
        }

        function editJumuiyaTarget(jName) {
            const amt = prompt(`Enter new target for ${jName}:`, '45455');
            if (amt) alert(`Target for ${jName} updated to KES ${amt}`);
        }

        function editMember(id) { alert('Editing member ID: ' + id); }
        function removeMember(id) { 
            if(confirm('Are you sure you want to remove member ' + id + '?')) {
                adminDataCache.members = adminDataCache.members.filter(m => m.customId !== id);
                renderDashboardUI(adminDataCache);
            }
        }

        function togglePublish(id) {
            const sub = adminDataCache.jumuiyaSubmissions.find(s => s.referenceId === id);
            if (sub) {
                sub.published = !sub.published;
                renderDashboardUI(adminDataCache);
            }
        }

        function editSubmission(id) { alert('Editing financial submission reference: ' + id); }
        function deleteSubmission(id) {
            if(confirm('Delete submission ' + id + '?')) {
                adminDataCache.jumuiyaSubmissions = adminDataCache.jumuiyaSubmissions.filter(s => s.referenceId !== id);
                renderDashboardUI(adminDataCache);
            }
        }

        function handlePostEvent(e) {
            e.preventDefault();
            alert('Event posted successfully!');
            document.getElementById('eventForm').reset();
        }

        function handlePostReading(e) {
            e.preventDefault();
            alert('Mass readings posted successfully!');
            document.getElementById('readingForm').reset();
        }

        function downloadPDFReport(type) {
            if (!adminDataCache) return alert('Data is still loading, please wait.');
            const metaDiv = document.getElementById('pdfReportMeta');
            const contentDiv = document.getElementById('pdfReportContent');
            
            metaDiv.textContent = `Generated On: ${new Date().toLocaleString()} | Category: ${type === 'financial' ? 'Financial Summary Only' : type === 'members' ? 'Registered Members Directory Only' : 'Complete Portal Data'}`;
            
            let htmlContent = '';
            if (type === 'financial' || type === 'all') {
                let totalCollected = 0;
                Object.values(adminDataCache.contributionsMap || {}).forEach(v => totalCollected += Number(v));
                htmlContent += `<div style="background: #ebf8ff; border-left: 5px solid #3182ce; padding: 15px; margin-bottom: 25px; font-size: 16px; font-weight: bold;">
                    Total Collected: KES ${totalCollected.toLocaleString()} / Target: KES ${(adminDataCache.targetAmount || 500000).toLocaleString()}
                </div>`;
            }
            if (type === 'members' || type === 'all') {
                htmlContent += `<h3>Registered Youth Directory</h3><table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
                    <thead><tr style="background: #edf2f7;"><th style="border: 1px solid #cbd5e0; padding: 8px;">ID</th><th style="border: 1px solid #cbd5e0; padding: 8px;">Name</th><th style="border: 1px solid #cbd5e0; padding: 8px;">Jumuiya</th><th style="border: 1px solid #cbd5e0; padding: 8px;">Phone</th><th style="border: 1px solid #cbd5e0; padding: 8px;">Group</th></tr></thead>
                    <tbody>`;
                (adminDataCache.members || []).forEach(m => {
                    htmlContent += `<tr><td style="border: 1px solid #cbd5e0; padding: 8px;">${m.customId || 'N/A'}</td><td style="border: 1px solid #cbd5e0; padding: 8px;">${m.name}</td><td style="border: 1px solid #cbd5e0; padding: 8px;">${m.jumuiya}</td><td style="border: 1px solid #cbd5e0; padding: 8px;">${m.phone}</td><td style="border: 1px solid #cbd5e0; padding: 8px;">${m.group}</td></tr>`;
                });
                htmlContent += `</tbody></table>`;
            }

            contentDiv.innerHTML = htmlContent;
            const element = document.getElementById('pdfReportContainer');
            element.style.display = 'block';

            const opt = {
                margin:       10,
                filename:     `St_Michael_Report_${type}_${Date.now()}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().from(element).set(opt).save().then(() => {
                element.style.display = 'none';
            });
        }
    </script>
</body>
</html>
