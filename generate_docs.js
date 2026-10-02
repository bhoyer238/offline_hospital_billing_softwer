const fs = require('fs');
const { execSync } = require('child_process');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Hospital Billing System - User Manual</title>
<style>
  :root {
    --blue: #1565C0; --light-blue: #1e88e5; --blue-bg: #e3f2fd;
    --green: #2e7d32; --green-bg: #e8f5e9;
    --amber: #f57f17; --amber-bg: #fffde7;
    --red: #c62828; --red-bg: #ffebee;
    --text: #1a1a2e; --muted: #546e7a; --border: #cfd8dc;
    --sidebar: #0f172a; --sidebar-text: #94a3b8; --sidebar-active: #38bdf8;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: var(--text); background: #fff; line-height: 1.6; }

  /* ── COVER PAGE ── */
  .cover {
    height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #1565C0 0%, #0d47a1 60%, #01579b 100%);
    color: #fff; text-align: center; page-break-after: always;
  }
  .cover-icon { width: 100px; height: 100px; background: rgba(255,255,255,0.15); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 52px; }
  .cover h1 { font-size: 42px; font-weight: 800; letter-spacing: -1px; margin-bottom: 8px; }
  .cover h2 { font-size: 20px; font-weight: 300; opacity: 0.85; margin-bottom: 40px; }
  .cover-divider { width: 80px; height: 3px; background: rgba(255,255,255,0.4); border-radius: 2px; margin: 0 auto 40px; }
  .cover-meta { font-size: 14px; opacity: 0.7; }

  /* ── TOC ── */
  .toc { padding: 60px 80px; page-break-after: always; }
  .toc h2 { font-size: 32px; color: var(--blue); margin-bottom: 8px; }
  .toc-subtitle { color: var(--muted); margin-bottom: 40px; font-size: 15px; }
  .toc-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px dotted var(--border); }
  .toc-num { font-size: 18px; font-weight: 700; color: var(--blue); width: 36px; flex-shrink: 0; }
  .toc-label { flex: 1; font-size: 15px; }
  .toc-page { font-size: 13px; color: var(--muted); }
  .toc-sub { padding-left: 36px; }
  .toc-sub .toc-label { font-size: 13px; color: var(--muted); }

  /* ── SECTION PAGE ── */
  .section-header { background: var(--blue); color: #fff; padding: 60px 80px 40px; page-break-before: always; }
  .section-header .sec-num { font-size: 64px; font-weight: 900; opacity: 0.2; line-height: 1; }
  .section-header h2 { font-size: 30px; font-weight: 700; margin-top: -30px; }
  .section-header p { opacity: 0.8; margin-top: 8px; font-size: 15px; }

  .page { padding: 40px 80px; }
  h3 { font-size: 20px; color: var(--blue); margin: 32px 0 12px; display: flex; align-items: center; gap: 10px; }
  h3::before { content: ''; display: block; width: 4px; height: 20px; background: var(--blue); border-radius: 2px; }
  h4 { font-size: 15px; color: var(--text); font-weight: 600; margin: 20px 0 8px; }
  p { font-size: 14px; color: #333; margin-bottom: 12px; }
  ul, ol { font-size: 14px; color: #333; padding-left: 20px; margin-bottom: 12px; }
  li { margin-bottom: 6px; }

  /* ── NOTE BOXES ── */
  .note { background: var(--blue-bg); border-left: 4px solid var(--blue); padding: 14px 16px; border-radius: 4px; margin: 16px 0; font-size: 13px; }
  .tip { background: var(--green-bg); border-left: 4px solid var(--green); padding: 14px 16px; border-radius: 4px; margin: 16px 0; font-size: 13px; }
  .warning { background: var(--amber-bg); border-left: 4px solid var(--amber); padding: 14px 16px; border-radius: 4px; margin: 16px 0; font-size: 13px; }
  .danger { background: var(--red-bg); border-left: 4px solid var(--red); padding: 14px 16px; border-radius: 4px; margin: 16px 0; font-size: 13px; }
  .note strong, .tip strong, .warning strong, .danger strong { display: block; margin-bottom: 4px; }

  /* ── STEPS ── */
  .steps { margin: 16px 0; }
  .step { display: flex; gap: 14px; margin-bottom: 16px; align-items: flex-start; }
  .step-num { width: 28px; height: 28px; background: var(--blue); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  .step-body { flex: 1; }
  .step-body strong { font-size: 14px; display: block; margin-bottom: 3px; }
  .step-body span { font-size: 13px; color: #555; }

  /* ── SCREEN MOCKUPS ── */
  .screen { border: 1.5px solid #b0bec5; border-radius: 10px; overflow: hidden; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .screen-bar { background: #1e293b; height: 32px; display: flex; align-items: center; padding: 0 12px; gap: 6px; }
  .screen-dot { width: 10px; height: 10px; border-radius: 50%; }
  .screen-title { margin-left: 12px; color: #64748b; font-size: 11px; flex: 1; text-align: center; }
  .screen-body { background: #0f1729; display: flex; min-height: 220px; }
  .mock-sidebar { width: 180px; background: #0f172a; padding: 16px 0; flex-shrink: 0; }
  .mock-sidebar-logo { padding: 0 14px 16px; border-bottom: 1px solid #1e293b; margin-bottom: 10px; }
  .mock-sidebar-logo .logo-icon { width: 30px; height: 30px; background: #1d4ed8; border-radius: 8px; display: inline-block; }
  .mock-sidebar-logo span { font-size: 11px; color: #e2e8f0; font-weight: 700; vertical-align: middle; margin-left: 8px; }
  .mock-nav-item { padding: 8px 14px; font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .mock-nav-item.active { background: #1e3a5f; color: #38bdf8; border-left: 3px solid #38bdf8; }
  .mock-nav-icon { width: 14px; height: 14px; border-radius: 2px; background: currentColor; opacity: 0.5; flex-shrink: 0; }
  .mock-main { flex: 1; padding: 16px; background: #111827; }
  .mock-page-title { color: #f1f5f9; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .mock-page-sub { color: #64748b; font-size: 11px; margin-bottom: 14px; }
  .mock-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
  .mock-card { background: #1e293b; border-radius: 8px; padding: 12px; border: 1px solid #334155; }
  .mock-card-label { font-size: 10px; color: #64748b; margin-bottom: 4px; }
  .mock-card-val { font-size: 20px; font-weight: 700; color: #f1f5f9; }
  .mock-card-val.green { color: #34d399; }
  .mock-card-val.amber { color: #fbbf24; }
  .mock-card-val.blue { color: #60a5fa; }
  .mock-table-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; background: #1e293b; border-radius: 6px 6px 0 0; padding: 8px 10px; }
  .mock-table-header span { font-size: 10px; color: #64748b; font-weight: 600; }
  .mock-table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; padding: 8px 10px; border-bottom: 1px solid #1e293b; }
  .mock-table-row span { font-size: 10px; color: #94a3b8; }
  .mock-table-row span.name { color: #e2e8f0; font-weight: 500; }
  .mock-btn-primary { background: #1d4ed8; color: #fff; padding: 5px 10px; border-radius: 5px; font-size: 10px; font-weight: 600; display: inline-block; }
  .mock-btn-sm { padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; display: inline-block; }
  .mock-btn-green { background: #065f46; color: #34d399; }
  .mock-btn-amber { background: #78350f; color: #fbbf24; }
  .mock-btn-red { background: #7f1d1d; color: #f87171; }
  .mock-btn-blue { background: #1e3a5f; color: #60a5fa; }
  .mock-input-group { margin-bottom: 10px; }
  .mock-label { font-size: 10px; color: #64748b; margin-bottom: 3px; display: block; }
  .mock-input { background: #1e293b; border: 1px solid #334155; border-radius: 4px; padding: 6px 8px; font-size: 10px; color: #e2e8f0; width: 100%; }
  .mock-modal-overlay { background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; padding: 20px; }
  .mock-modal { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px; width: 360px; }
  .mock-modal-title { color: #f1f5f9; font-size: 13px; font-weight: 700; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #334155; }
  .mock-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .mock-form-full { grid-column: 1 / -1; }
  .badge { padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; }
  .badge-green { background: #065f46; color: #34d399; }
  .badge-blue { background: #1e3a5f; color: #60a5fa; }
  .badge-amber { background: #78350f; color: #fbbf24; }
  .badge-red { background: #7f1d1d; color: #f87171; }

  /* ── PRINT ── */
  @media print {
    @page { size: A4 portrait; margin: 10mm; }
    .screen-body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cover { height: 297mm; }
    .section-header { page-break-before: always; }
  }

  /* ── TABLE ── */
  table.info-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  table.info-table th { background: #e3f2fd; color: var(--blue); padding: 8px 12px; text-align: left; font-weight: 600; }
  table.info-table td { padding: 8px 12px; border-bottom: 1px solid var(--border); }
  table.info-table tr:last-child td { border-bottom: none; }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════
     COVER PAGE
══════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-icon">🏥</div>
  <h1>Hospital Billing System</h1>
  <h2>Complete User Manual &amp; Training Guide</h2>
  <div class="cover-divider"></div>
  <p class="cover-meta">Version 1.0 &nbsp;|&nbsp; September 2026 &nbsp;|&nbsp; For Administrative Staff</p>
</div>

<!-- ══════════════════════════════════════════
     TABLE OF CONTENTS
══════════════════════════════════════════ -->
<div class="toc">
  <h2>📋 Table of Contents</h2>
  <p class="toc-subtitle">Click on any section to navigate directly to it.</p>

  <div class="toc-item"><div class="toc-num">1</div><div class="toc-label"><strong>Introduction</strong></div><div class="toc-page">Pg 3</div></div>
  <div class="toc-item"><div class="toc-num">2</div><div class="toc-label"><strong>Getting Started — Login</strong></div><div class="toc-page">Pg 4</div></div>
  <div class="toc-item"><div class="toc-num">3</div><div class="toc-label"><strong>Dashboard (Home Screen)</strong></div><div class="toc-page">Pg 5</div></div>
  <div class="toc-item"><div class="toc-num">4</div><div class="toc-label"><strong>Patient Management</strong></div><div class="toc-page">Pg 6</div></div>
  <div class="toc-item toc-sub"><div class="toc-num" style="color:#94a3b8; font-size:13px">4.1</div><div class="toc-label">Add New Patient</div></div>
  <div class="toc-item toc-sub"><div class="toc-num" style="color:#94a3b8; font-size:13px">4.2</div><div class="toc-label">Edit Existing Patient</div></div>
  <div class="toc-item toc-sub"><div class="toc-num" style="color:#94a3b8; font-size:13px">4.3</div><div class="toc-label">View Patient Details</div></div>
  <div class="toc-item"><div class="toc-num">5</div><div class="toc-label"><strong>Billing &amp; Invoicing</strong></div><div class="toc-page">Pg 8</div></div>
  <div class="toc-item toc-sub"><div class="toc-num" style="color:#94a3b8; font-size:13px">5.1</div><div class="toc-label">Create New Bill (OPD / IPD)</div></div>
  <div class="toc-item toc-sub"><div class="toc-num" style="color:#94a3b8; font-size:13px">5.2</div><div class="toc-label">Edit an Existing Bill</div></div>
  <div class="toc-item toc-sub"><div class="toc-num" style="color:#94a3b8; font-size:13px">5.3</div><div class="toc-label">Print / Save Bill as PDF</div></div>
  <div class="toc-item toc-sub"><div class="toc-num" style="color:#94a3b8; font-size:13px">5.4</div><div class="toc-label">Cancel a Bill</div></div>
  <div class="toc-item"><div class="toc-num">6</div><div class="toc-label"><strong>Payments</strong></div><div class="toc-page">Pg 11</div></div>
  <div class="toc-item"><div class="toc-num">7</div><div class="toc-label"><strong>Doctors Management</strong></div><div class="toc-page">Pg 12</div></div>
  <div class="toc-item"><div class="toc-num">8</div><div class="toc-label"><strong>Services Management</strong></div><div class="toc-page">Pg 13</div></div>
  <div class="toc-item"><div class="toc-num">9</div><div class="toc-label"><strong>Reports</strong></div><div class="toc-page">Pg 14</div></div>
  <div class="toc-item"><div class="toc-num">10</div><div class="toc-label"><strong>Settings</strong></div><div class="toc-page">Pg 15</div></div>
  <div class="toc-item"><div class="toc-num">11</div><div class="toc-label"><strong>Data Backup &amp; Safety</strong></div><div class="toc-page">Pg 16</div></div>
  <div class="toc-item"><div class="toc-num">12</div><div class="toc-label"><strong>Sharing the Software</strong></div><div class="toc-page">Pg 17</div></div>
  <div class="toc-item"><div class="toc-num">13</div><div class="toc-label"><strong>Common Questions (FAQ)</strong></div><div class="toc-page">Pg 18</div></div>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 1: INTRODUCTION
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">01</div>
  <h2>Introduction</h2>
  <p>What is this software and what can it do for your hospital?</p>
</div>
<div class="page">
  <h3>About This Software</h3>
  <p>The <strong>Hospital Billing Management System</strong> is a powerful, easy-to-use desktop application designed specifically for small and medium-sized hospitals and clinics. It helps you manage patients, generate professional bills, track payments, and view reports — all without any internet connection.</p>

  <table class="info-table">
    <tr><th>Feature</th><th>Description</th></tr>
    <tr><td>✅ 100% Offline</td><td>No internet required. All data stays on your computer.</td></tr>
    <tr><td>🏥 Patient Management</td><td>Register patients, store medical history and contact info.</td></tr>
    <tr><td>📄 Smart Billing</td><td>Create IPD/OPD bills with automatic calculations.</td></tr>
    <tr><td>💰 Payment Tracking</td><td>Record payments, track pending balances.</td></tr>
    <tr><td>👨‍⚕️ Doctor Management</td><td>Add doctors, link them to bills and OPD/IPD records.</td></tr>
    <tr><td>📊 Reports</td><td>Daily/Monthly revenue, pending bills, service-wise reports.</td></tr>
    <tr><td>🔒 Secure Login</td><td>Role-based access — Admin and Staff roles.</td></tr>
    <tr><td>🖨️ PDF Bills</td><td>Professional A4 bills — edge-to-edge with hospital logo.</td></tr>
  </table>

  <div class="note"><strong>💡 Important Note</strong>Since this is an offline software, your data is saved only on the computer where the software is installed. It is very important to take regular backups. See Section 11 for backup instructions.</div>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 2: LOGIN
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">02</div>
  <h2>Getting Started — Login</h2>
  <p>How to open and log into the software</p>
</div>
<div class="page">
  <h3>Opening the Software</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Find the Software Folder</strong><span>Go to the folder where the software is installed (e.g., Hospital Billing/release/win-unpacked/)</span></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Double-click Hospital Billing.exe</strong><span>The software will start immediately. No installation wizard needed.</span></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>The Login Screen will appear</strong><span>Enter your Username and Password provided by your administrator.</span></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Click "Login" to enter</strong><span>You will be taken to the Dashboard (Home Screen).</span></div></div>
  </div>

  <!-- Login Mockup -->
  <div class="screen">
    <div class="screen-bar">
      <div class="screen-dot" style="background:#ef4444"></div>
      <div class="screen-dot" style="background:#f59e0b"></div>
      <div class="screen-dot" style="background:#22c55e"></div>
      <div class="screen-title">Hospital Billing System — Login</div>
    </div>
    <div style="background: linear-gradient(135deg, #0f172a, #1e3a5f); min-height: 260px; display:flex; align-items:center; justify-content:center; padding:30px;">
      <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:28px; width:280px; text-align:center;">
        <div style="font-size:36px; margin-bottom:8px;">🏥</div>
        <div style="color:#f1f5f9; font-size:16px; font-weight:700; margin-bottom:4px;">Hospital Billing</div>
        <div style="color:#64748b; font-size:11px; margin-bottom:20px;">Management System</div>
        <div style="text-align:left; margin-bottom:10px;">
          <div style="font-size:10px; color:#64748b; margin-bottom:3px;">Username</div>
          <div style="background:#0f172a; border:1px solid #334155; border-radius:4px; padding:7px 10px; font-size:11px; color:#94a3b8;">admin</div>
        </div>
        <div style="text-align:left; margin-bottom:16px;">
          <div style="font-size:10px; color:#64748b; margin-bottom:3px;">Password</div>
          <div style="background:#0f172a; border:1px solid #334155; border-radius:4px; padding:7px 10px; font-size:11px; color:#94a3b8;">••••••••</div>
        </div>
        <div style="background:#1d4ed8; color:#fff; border-radius:6px; padding:9px; font-size:12px; font-weight:600;">Login →</div>
      </div>
    </div>
  </div>

  <div class="tip"><strong>👤 User Roles</strong><br>
  <strong>Admin:</strong> Full access — can manage users, settings, audit logs, and all features.<br>
  <strong>Staff:</strong> Can manage patients, create bills, and record payments. Cannot change settings or manage users.
  </div>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 3: DASHBOARD
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">03</div>
  <h2>Dashboard (Home Screen)</h2>
  <p>Your command center — quick overview of daily activity</p>
</div>
<div class="page">
  <h3>Dashboard Overview</h3>
  <p>After login, you will see the Dashboard. It gives you a quick summary of what's happening in your hospital today.</p>

  <!-- Dashboard Mockup -->
  <div class="screen">
    <div class="screen-bar">
      <div class="screen-dot" style="background:#ef4444"></div>
      <div class="screen-dot" style="background:#f59e0b"></div>
      <div class="screen-dot" style="background:#22c55e"></div>
      <div class="screen-title">Dashboard — Hospital Billing System</div>
    </div>
    <div class="screen-body">
      <div class="mock-sidebar">
        <div class="mock-sidebar-logo"><div class="mock-sidebar-logo"><span style="font-size:10px; color:#e2e8f0; font-weight:700;">🏥 Hospital Billing</span></div></div>
        <div class="mock-nav-item active"><span>🏠</span> Dashboard</div>
        <div class="mock-nav-item"><span>👥</span> Patients</div>
        <div class="mock-nav-item"><span>📄</span> Billing</div>
        <div class="mock-nav-item"><span>💳</span> Payments</div>
        <div class="mock-nav-item"><span>👨‍⚕️</span> Doctors</div>
        <div class="mock-nav-item"><span>🛠️</span> Services</div>
        <div class="mock-nav-item"><span>📊</span> Reports</div>
        <div class="mock-nav-item"><span>⚙️</span> Settings</div>
      </div>
      <div class="mock-main">
        <div class="mock-page-title">Dashboard</div>
        <div class="mock-page-sub">Welcome back, Admin · Monday, 01 Sep 2026</div>
        <div class="mock-cards">
          <div class="mock-card"><div class="mock-card-label">Today's Revenue</div><div class="mock-card-val green">₹ 8,500</div></div>
          <div class="mock-card"><div class="mock-card-label">Total Patients</div><div class="mock-card-val blue">247</div></div>
          <div class="mock-card"><div class="mock-card-label">Pending Bills</div><div class="mock-card-val amber">12</div></div>
          <div class="mock-card"><div class="mock-card-label">Bills Today</div><div class="mock-card-val">8</div></div>
          <div class="mock-card"><div class="mock-card-label">Active IPD</div><div class="mock-card-val blue">5</div></div>
          <div class="mock-card"><div class="mock-card-label">Month Revenue</div><div class="mock-card-val green">₹ 1.2L</div></div>
        </div>
        <div style="background:#1e293b; border-radius:8px; padding:12px; border:1px solid #334155;">
          <div style="font-size:11px; color:#94a3b8; margin-bottom:8px; font-weight:600;">RECENT BILLS</div>
          <div class="mock-table-header" style="grid-template-columns: 1.5fr 1.5fr 1fr 1fr 0.8fr;">
            <span>Bill No.</span><span>Patient</span><span>Amount</span><span>Status</span><span>Type</span>
          </div>
          <div class="mock-table-row" style="display:grid; grid-template-columns:1.5fr 1.5fr 1fr 1fr 0.8fr; padding:7px 10px; border-bottom:1px solid #1e293b;">
            <span style="color:#60a5fa; font-size:10px;">IPDR/0005</span><span class="name" style="font-size:10px;">Nikita Birari</span><span style="font-size:10px; color:#34d399;">₹650</span><span><span class="badge badge-green">Paid</span></span><span><span class="badge badge-blue">IPD</span></span>
          </div>
          <div class="mock-table-row" style="display:grid; grid-template-columns:1.5fr 1.5fr 1fr 1fr 0.8fr; padding:7px 10px; border-bottom:1px solid #1e293b;">
            <span style="color:#60a5fa; font-size:10px;">IPDR/0004</span><span class="name" style="font-size:10px;">Rahul Kumar</span><span style="font-size:10px; color:#fbbf24;">₹500</span><span><span class="badge badge-amber">Pending</span></span><span><span class="badge badge-green">OPD</span></span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <h3>Navigation (Left Sidebar)</h3>
  <table class="info-table">
    <tr><th>Menu Item</th><th>What It Does</th></tr>
    <tr><td>🏠 Dashboard</td><td>Home screen with daily summary</td></tr>
    <tr><td>👥 Patients</td><td>Add, search, edit patient records</td></tr>
    <tr><td>📄 Billing</td><td>Create and manage bills</td></tr>
    <tr><td>💳 Payments</td><td>Record and track payments</td></tr>
    <tr><td>👨‍⚕️ Doctors</td><td>Manage doctor profiles</td></tr>
    <tr><td>🛠️ Services</td><td>Add/edit hospital services and rates</td></tr>
    <tr><td>📊 Reports</td><td>Generate revenue and other reports</td></tr>
    <tr><td>⚙️ Settings</td><td>Hospital info, logo, tax settings (Admin only)</td></tr>
  </table>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 4: PATIENT MANAGEMENT
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">04</div>
  <h2>Patient Management</h2>
  <p>How to register, find, and update patient records</p>
</div>
<div class="page">
  <h3>4.1 — Adding a New Patient</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Click "Patients" in the left menu</strong><span>You will see the Patient List with a search bar.</span></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Click the "+ New Patient" button (top right)</strong><span>A registration form will open.</span></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Fill in patient details</strong><span>Full Name, Mobile, Gender are required. Others are optional.</span></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Enter Date of Birth (DOB) for auto-age</strong><span>⭐ When you enter the DOB, the Age field fills automatically — you don't need to type it!</span></div></div>
    <div class="step"><div class="step-num">5</div><div class="step-body"><strong>Click "Save Patient"</strong><span>A unique UHID (e.g., UHID-2026-000001) is automatically assigned.</span></div></div>
  </div>

  <!-- Patient Form Mockup -->
  <div class="screen">
    <div class="screen-bar">
      <div class="screen-dot" style="background:#ef4444"></div><div class="screen-dot" style="background:#f59e0b"></div><div class="screen-dot" style="background:#22c55e"></div>
      <div class="screen-title">Patients — Add New Patient</div>
    </div>
    <div class="screen-body" style="min-height:300px; background:#111827;">
      <div class="mock-sidebar">
        <div style="padding:10px 14px; font-size:10px; color:#64748b; font-weight:700;">MENU</div>
        <div class="mock-nav-item"><span>🏠</span> Dashboard</div>
        <div class="mock-nav-item active"><span>👥</span> Patients</div>
        <div class="mock-nav-item"><span>📄</span> Billing</div>
      </div>
      <div class="mock-main" style="background:#0f1729; position:relative;">
        <!-- Overlay Modal -->
        <div style="position:absolute; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; padding:10px; border-radius:0 0 10px 0;">
          <div style="background:#1e293b; border:1px solid #334155; border-radius:10px; padding:16px; width:360px;">
            <div style="color:#f1f5f9; font-size:13px; font-weight:700; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:8px;"><span>Register New Patient</span><span style="color:#64748b; cursor:pointer;">✕</span></div>
            <div class="mock-form-grid">
              <div class="mock-form-full mock-input-group"><div class="mock-label">Full Name *</div><div class="mock-input">Rahul Sharma</div></div>
              <div class="mock-input-group"><div class="mock-label">Date of Birth</div><div class="mock-input">15-06-1990</div></div>
              <div class="mock-input-group"><div class="mock-label">Age <span style="color:#38bdf8; font-size:9px;">(auto)</span></div><div class="mock-input" style="background:#0f172a; color:#38bdf8;">36 years</div></div>
              <div class="mock-input-group"><div class="mock-label">Gender *</div><div class="mock-input">Male</div></div>
              <div class="mock-input-group"><div class="mock-label">Mobile *</div><div class="mock-input">9876543210</div></div>
              <div class="mock-form-full mock-input-group"><div class="mock-label">Address</div><div class="mock-input">At Post Jawhar, Palghar</div></div>
            </div>
            <div style="margin-top:12px; display:flex; justify-content:flex-end; gap:8px;">
              <div style="background:#1e293b; border:1px solid #334155; border-radius:5px; padding:6px 12px; font-size:10px; color:#94a3b8;">Cancel</div>
              <div style="background:#1d4ed8; border-radius:5px; padding:6px 12px; font-size:10px; color:#fff; font-weight:600;">Save Patient</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="tip"><strong>⭐ Auto Age Feature</strong><br>Enter the Date of Birth → Age calculates automatically. The Age field becomes read-only when DOB is entered. You do not need to calculate or type the age manually.</div>

  <h3>4.2 — Editing an Existing Patient</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Search for the patient</strong><span>Use the search bar — type the name, mobile, or UHID.</span></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Click the ✏️ Edit button (yellow pencil icon)</strong><span>All their existing information will load automatically in the form.</span></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Change only what needs to be updated</strong><span>Modify the field(s) you want to change.</span></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Click "Update Patient"</strong><span>The same patient record is updated. No new record is created.</span></div></div>
  </div>
  <div class="warning"><strong>⚠️ Important</strong><br>Editing a patient will update their existing record only. A new/duplicate patient record will NEVER be created by editing. The UHID remains the same.</div>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 5: BILLING
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">05</div>
  <h2>Billing &amp; Invoicing</h2>
  <p>Create, edit, print professional bills for OPD and IPD patients</p>
</div>
<div class="page">
  <h3>Understanding OPD vs IPD</h3>
  <table class="info-table">
    <tr><th>Type</th><th>Full Form</th><th>When to Use</th></tr>
    <tr><td><span class="badge badge-green" style="font-size:12px;">OPD</span></td><td>Outpatient Department</td><td>Patient comes for checkup, test, or consultation and goes back home the same day.</td></tr>
    <tr><td><span class="badge badge-blue" style="font-size:12px;">IPD</span></td><td>Inpatient Department</td><td>Patient is formally admitted — in a room/ward for treatment, surgery, or extended stay.</td></tr>
  </table>

  <h3>5.1 — Creating a New Bill</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Click "Billing" in the left menu</strong></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Click "+ Create New Bill"</strong><span>A 3-step wizard will open.</span></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Step 1 — Select Patient &amp; Type</strong><span>Choose IPD or OPD, then search and select the patient. Click Next →</span></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Step 2 — Add Services</strong><span>Search for a service (e.g., "Consultation") or add a custom item. Enter Qty and Rate — Amount calculates automatically. Click Next →</span></div></div>
    <div class="step"><div class="step-num">5</div><div class="step-body"><strong>Step 3 — Payment</strong><span>Apply a discount % if needed. Enter the amount paid (if any). Click ✓ Save Bill.</span></div></div>
  </div>

  <!-- Bill Creation Mockup -->
  <div class="screen">
    <div class="screen-bar">
      <div class="screen-dot" style="background:#ef4444"></div><div class="screen-dot" style="background:#f59e0b"></div><div class="screen-dot" style="background:#22c55e"></div>
      <div class="screen-title">Billing — Create New Bill (Step 2: Services)</div>
    </div>
    <div class="screen-body" style="min-height:280px;">
      <div class="mock-sidebar">
        <div class="mock-nav-item"><span>🏠</span> Dashboard</div>
        <div class="mock-nav-item"><span>👥</span> Patients</div>
        <div class="mock-nav-item active"><span>📄</span> Billing</div>
      </div>
      <div class="mock-main">
        <!-- Step indicator -->
        <div style="display:flex; gap:6px; margin-bottom:12px;">
          <div style="flex:1; background:#065f46; color:#34d399; text-align:center; padding:5px; border-radius:6px; font-size:10px; font-weight:600;">✓ 1. Patient</div>
          <div style="flex:1; background:#1e3a5f; color:#60a5fa; text-align:center; padding:5px; border-radius:6px; font-size:10px; font-weight:600; border:1px solid #1d4ed8;">2. Services</div>
          <div style="flex:1; background:#1e293b; color:#475569; text-align:center; padding:5px; border-radius:6px; font-size:10px;">3. Payment</div>
        </div>
        <div style="background:#1e293b; border:1px solid #334155; border-radius:8px; padding:12px; margin-bottom:10px;">
          <div style="font-size:10px; color:#94a3b8; margin-bottom:8px; font-weight:600;">SERVICES &amp; CHARGES</div>
          <div style="display:grid; grid-template-columns:3fr 1fr 1fr 1fr; padding:5px 8px; background:#0f172a; border-radius:4px; margin-bottom:4px;">
            <span style="font-size:9px; color:#64748b; font-weight:600;">Service Name</span>
            <span style="font-size:9px; color:#64748b; font-weight:600;">Qty</span>
            <span style="font-size:9px; color:#64748b; font-weight:600;">Rate (₹)</span>
            <span style="font-size:9px; color:#64748b; font-weight:600;">Amount</span>
          </div>
          <div style="display:grid; grid-template-columns:3fr 1fr 1fr 1fr; padding:6px 8px; border-bottom:1px solid #334155;">
            <span style="font-size:10px; color:#e2e8f0;">Consultation Fee</span>
            <span style="font-size:10px; color:#94a3b8;">1</span>
            <span style="font-size:10px; color:#94a3b8;">500.00</span>
            <span style="font-size:10px; color:#34d399;">500.00</span>
          </div>
          <div style="display:grid; grid-template-columns:3fr 1fr 1fr 1fr; padding:6px 8px;">
            <span style="font-size:10px; color:#e2e8f0;">Blood Test</span>
            <span style="font-size:10px; color:#94a3b8;">2</span>
            <span style="font-size:10px; color:#94a3b8;">150.00</span>
            <span style="font-size:10px; color:#34d399;">300.00</span>
          </div>
          <div style="display:flex; justify-content:flex-end; padding:8px; border-top:1px solid #334155;">
            <div style="text-align:right;"><span style="font-size:10px; color:#64748b;">Subtotal: </span><span style="font-size:12px; color:#f1f5f9; font-weight:700;">₹ 800.00</span></div>
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:6px;">
          <div style="background:#065f46; color:#34d399; padding:4px 10px; border-radius:4px; font-size:10px; font-weight:600; cursor:pointer;">+ Add Service</div>
          <div style="flex:1;"></div>
          <div style="background:#1e293b; border:1px solid #334155; color:#94a3b8; padding:4px 10px; border-radius:4px; font-size:10px;">← Back</div>
          <div style="background:#1d4ed8; color:#fff; padding:4px 10px; border-radius:4px; font-size:10px; font-weight:600;">Next →</div>
        </div>
      </div>
    </div>
  </div>

  <h3>5.2 — Editing an Existing Bill</h3>
  <p>If you made a mistake in a bill (wrong rate, wrong service), you can edit it:</p>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Find the bill in the Billing list</strong></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Click the 🟡 Edit button (amber pencil icon)</strong></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Change service rates, quantities, or discount</strong><span>The balance will auto-recalculate considering payments already made.</span></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Click "Save Changes"</strong></div></div>
  </div>

  <h3>5.3 — Printing a Bill / Saving as PDF</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Click the 👁️ View button (blue eye icon) on any bill</strong></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>The Bill Preview opens — professional A4 format with hospital logo</strong></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Click the 🖨️ Print button</strong><span>A PDF is automatically generated and opens in your browser or PDF reader.</span></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Print or Save from the PDF viewer</strong><span>Press Ctrl+P to print, or click Download to save the PDF.</span></div></div>
  </div>

  <div class="note"><strong>📋 Bill Numbers are Automatic</strong><br>The software assigns a unique bill number automatically (e.g., IPDR/2026/2027/0001). Numbers are never repeated, even across IPD and OPD bills.</div>

  <h3>5.4 — Cancelling a Bill</h3>
  <div class="warning"><strong>⚠️ Admin Only Feature</strong><br>Only Admin users can cancel a bill. Staff members cannot cancel bills.</div>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Find the bill in the Billing list</strong></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Click the 🔴 Cancel button (red X icon)</strong></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Enter a cancellation reason and confirm</strong></div></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 6: PAYMENTS
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">06</div>
  <h2>Payments</h2>
  <p>Collecting and tracking patient payments</p>
</div>
<div class="page">
  <h3>Recording a Payment</h3>
  <p>When a bill has a pending balance, you can record a payment for it:</p>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Open the Bill Preview</strong><span>Click 👁️ View on the bill in the Billing list.</span></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Click "+ Payment" button</strong><span>This appears only if the bill has a remaining balance.</span></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Enter the amount received</strong><span>Select the payment mode: Cash / Card / UPI / Bank Transfer.</span></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Click "Record Payment"</strong><span>The bill balance reduces instantly. A receipt number is generated.</span></div></div>
  </div>

  <h3>Payment Status Colors</h3>
  <table class="info-table">
    <tr><th>Color</th><th>Status</th><th>Meaning</th></tr>
    <tr><td><span class="badge badge-green">Paid</span></td><td>Fully Paid</td><td>Patient has paid the full amount. No balance remaining.</td></tr>
    <tr><td><span class="badge badge-amber">Partial</span></td><td>Partially Paid</td><td>Patient has paid some amount. Balance is still due.</td></tr>
    <tr><td><span class="badge badge-red">Pending</span></td><td>Not Paid</td><td>No payment received yet. Full amount is due.</td></tr>
  </table>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 7: DOCTORS
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">07</div>
  <h2>Doctors Management</h2>
  <p>Add and manage doctor profiles in the system</p>
</div>
<div class="page">
  <h3>Adding a New Doctor</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Click "Doctors" in the left menu</strong></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Click "+ Add Doctor"</strong></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Fill in the form</strong><span>Doctor Name (required), Specialization, Department, Mobile, Registration Number.</span></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Click "Add Doctor"</strong></div></div>
  </div>

  <h3>Editing a Doctor's Details</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Find the doctor in the Doctors list</strong></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Click the ✏️ Edit button (blue pencil icon)</strong><span>All their existing details will load in the form automatically.</span></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Update required fields and click "Update"</strong></div></div>
  </div>

  <div class="note"><strong>💡 Active / Inactive Status</strong><br>You can deactivate a doctor by clicking the toggle button. Inactive doctors won't appear in bill creation dropdowns but their past bills remain unchanged.</div>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 8: SERVICES
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">08</div>
  <h2>Services Management</h2>
  <p>Set up hospital services and their rates</p>
</div>
<div class="page">
  <h3>What Are Services?</h3>
  <p>Services are the items that appear on a patient's bill — e.g., Consultation Fee, Blood Test, Room Charges, X-Ray, etc. Each service has a fixed rate that auto-fills when you add it to a bill.</p>

  <h3>Adding a New Service</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Click "Services" in the menu</strong></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Click "+ Add Service"</strong></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Enter Service Name, Category, and Rate (₹)</strong></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Click "Add Service"</strong></div></div>
  </div>

  <div class="tip"><strong>💡 Tip: Set rates carefully</strong><br>When you add a service to a bill, its rate from this list is automatically used. You can still change the rate manually on the bill if needed.</div>

  <h3>Editing a Service Rate</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Find the service and click ✏️ Edit</strong><span>All current details (name, rate, category) load automatically in the form.</span></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Update the Rate or Name and click "Update"</strong></div></div>
  </div>
  <div class="warning"><strong>⚠️ Note</strong><br>Changing a service rate will only affect new bills. Past bills with the old rate are NOT changed.</div>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 9: REPORTS
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">09</div>
  <h2>Reports</h2>
  <p>Generate revenue reports, pending lists, and more</p>
</div>
<div class="page">
  <h3>How to Generate a Report</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Click "Reports" in the left menu</strong></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Select report type from the left panel</strong></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Set the date range (From / To)</strong></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Click "Run Report"</strong><span>Data appears in a table with charts (where applicable).</span></div></div>
    <div class="step"><div class="step-num">5</div><div class="step-body"><strong>Click "Export CSV" to download the data as Excel</strong></div></div>
  </div>

  <h3>Available Reports</h3>
  <table class="info-table">
    <tr><th>Report Name</th><th>What It Shows</th></tr>
    <tr><td>📅 Daily Collection</td><td>How much was collected each day (Cash, Card, UPI breakup). Bar chart included.</td></tr>
    <tr><td>📆 Monthly Collection</td><td>Month-wise revenue summary for the selected year. Line chart included.</td></tr>
    <tr><td>⏳ Pending Payments</td><td>All bills with outstanding balance — who owes money.</td></tr>
    <tr><td>🛠️ Service Revenue</td><td>How much each service (consultation, test, etc.) earned.</td></tr>
    <tr><td>👨‍⚕️ Doctor Revenue</td><td>Revenue attributed to each doctor.</td></tr>
    <tr><td>👥 Patient Report</td><td>Patients registered in the selected date range.</td></tr>
    <tr><td>❌ Cancelled Bills</td><td>Bills that were cancelled and the reason.</td></tr>
  </table>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 10: SETTINGS
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">10</div>
  <h2>Settings</h2>
  <p>Configure hospital information, logo, and billing preferences</p>
</div>
<div class="page">
  <div class="danger"><strong>🔒 Admin Only</strong><br>Settings can only be accessed and changed by Admin users.</div>

  <h3>Hospital Information</h3>
  <table class="info-table">
    <tr><th>Setting</th><th>What it does</th></tr>
    <tr><td>Hospital Name</td><td>Appears on the header of every bill</td></tr>
    <tr><td>Address</td><td>Shown below hospital name on bills</td></tr>
    <tr><td>Phone / Email</td><td>Contact info on bill header</td></tr>
    <tr><td>GST / Registration No.</td><td>Appears on top-right of bill header</td></tr>
    <tr><td>Logo</td><td>Hospital logo shown on every bill (upload from your computer)</td></tr>
    <tr><td>Bill Prefix</td><td>Prefix for bill numbers (e.g., "IPDR" → IPDR/2026/2027/0001)</td></tr>
    <tr><td>Currency Symbol</td><td>₹ by default — can be changed</td></tr>
    <tr><td>Tax</td><td>Enable/disable GST and set tax rate %</td></tr>
  </table>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 11: BACKUP & DATA SAFETY
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">11</div>
  <h2>Data Backup &amp; Safety</h2>
  <p>Protecting your hospital data from loss</p>
</div>
<div class="page">
  <div class="danger"><strong>⚠️ Critical — Read This!</strong><br>This software is 100% offline. All data is saved on your computer ONLY. If your computer crashes and you have no backup, all patient data will be lost forever. Please take weekly backups.</div>

  <h3>Where is Data Stored?</h3>
  <p>All patient records, bills, and payments are stored in one file:</p>
  <div style="background:#1e293b; border-radius:6px; padding:12px 16px; font-family:monospace; font-size:13px; color:#38bdf8; margin:12px 0;">
    C:\\Users\\[Your Username]\\AppData\\Roaming\\HospitalBilling\\database\\hospital.db
  </div>

  <h3>How to Take a Backup (Weekly)</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Close the Hospital Billing software first</strong></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Press Windows + R on keyboard</strong><span>The "Run" dialog box will open.</span></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Type: %appdata%\\HospitalBilling\\database</strong><span>Press Enter. A folder opens with the hospital.db file.</span></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Copy the hospital.db file</strong><span>Paste it to a Pen Drive, Google Drive, or external hard disk.</span></div></div>
    <div class="step"><div class="step-num">5</div><div class="step-body"><strong>Rename the copy with today's date</strong><span>E.g., hospital_backup_01Sep2026.db — so you know which is the latest.</span></div></div>
  </div>

  <h3>Restoring Data (After Crash or New PC)</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Install the software on the new PC</strong></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Navigate to: %appdata%\\HospitalBilling\\database\\</strong></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Paste your backup hospital.db file there</strong><span>If the file already exists, replace it.</span></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><strong>Open the software</strong><span>All your data is restored!</span></div></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 12: SHARING / GIVING TO OTHERS
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">12</div>
  <h2>Sharing the Software</h2>
  <p>How to give this software to someone else</p>
</div>
<div class="page">
  <h3>First Time Setup on a New Computer</h3>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-body"><strong>Copy the entire "win-unpacked" folder</strong><span>From: Hospital Billing / release / win-unpacked /</span></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><strong>Transfer via Pen Drive or Hard Disk</strong></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><strong>Paste on new computer, open Hospital Billing.exe</strong><span>No installation required. Just double-click and run!</span></div></div>
  </div>

  <h3>Sending a Bug Fix Update (Without Reinstalling)</h3>
  <p>When a bug is fixed, you don't need to transfer the whole folder. Just replace one file:</p>
  <table class="info-table">
    <tr><th>Step</th><th>Action</th></tr>
    <tr><td>1</td><td>Get the updated <strong>app.asar</strong> file from your developer</td></tr>
    <tr><td>2</td><td>Close the software on the target computer</td></tr>
    <tr><td>3</td><td>Navigate to: <code>win-unpacked / resources /</code></td></tr>
    <tr><td>4</td><td>Replace the old <strong>app.asar</strong> with the new one</td></tr>
    <tr><td>5</td><td>Reopen <strong>Hospital Billing.exe</strong></td></tr>
  </table>
  <div class="tip"><strong>✅ Data is Safe During Updates</strong><br>Replacing app.asar only updates the software code. All patient data (hospital.db) is stored separately and is never touched during updates.</div>
</div>

<!-- ═══════════════════════════════════════════
     SECTION 13: FAQ
════════════════════════════════════════════ -->
<div class="section-header">
  <div class="sec-num">13</div>
  <h2>Common Questions (FAQ)</h2>
  <p>Answers to frequently asked questions</p>
</div>
<div class="page">
  <h3>Frequently Asked Questions</h3>

  <h4>Q: Bill number conflict error aata hai?</h4>
  <p>This issue has been fixed in the current version. The system now uses a single shared counter for all bill types. If it still appears, contact your software support.</p>

  <h4>Q: Patient edit karte waqt purani details nahi aati?</h4>
  <p>This issue has been fixed. Click the ✏️ Edit button and all existing details (name, mobile, address, etc.) will load automatically.</p>

  <h4>Q: Report me values galat dikh rahi hain (extra zeros)?</h4>
  <p>This issue has been fixed. All amount values in reports are now correctly displayed with the ₹ symbol.</p>

  <h4>Q: Bill PDF me gap aa raha hai sides pe?</h4>
  <p>This has been fixed. The bill now prints edge-to-edge on A4 paper with no side margins.</p>

  <h4>Q: "This app doesn't support print preview" aa raha tha?</h4>
  <p>This is fixed. Clicking Print now automatically generates the PDF and opens it in your browser/PDF viewer. You can preview and print from there.</p>

  <h4>Q: Internet nahi hai to software chalega?</h4>
  <p>Yes! This software is 100% offline. No internet is needed at any time.</p>

  <h4>Q: Ek se zyada computer par use kar sakte hain?</h4>
  <p>Yes, but data will be separate on each computer. To share data, you need to copy the hospital.db file between computers manually.</p>

  <h4>Q: Logo bill pe nahi dikh raha?</h4>
  <p>Go to Settings → Upload Logo. Select your hospital logo image (JPG/PNG). It will appear on all bills automatically.</p>

  <!-- FOOTER -->
  <div style="margin-top: 60px; text-align: center; border-top: 1px solid var(--border); padding-top: 20px; color: var(--muted); font-size: 12px;">
    <p>🏥 Hospital Billing Management System — User Manual v1.0</p>
    <p>This is a computer-generated document. For support, contact your software administrator.</p>
  </div>
</div>

</body>
</html>`;

fs.writeFileSync('Documentation.html', html);
console.log('HTML created successfully.');

try {
  const edgePath = "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe";
  const outPdf = "E:\\\\Project\\\\Hospital Billing\\\\Hospital_Billing_Documentation.pdf";
  const inHtml = "E:\\\\Project\\\\Hospital Billing\\\\Documentation.html";
  
  const { execSync } = require('child_process');
  execSync(\`"\${edgePath}" --headless --disable-gpu --print-to-pdf="\${outPdf}" "\${inHtml}"\`);
  console.log('PDF created: ' + outPdf);
} catch(e) {
  console.error('PDF error:', e.message);
}
