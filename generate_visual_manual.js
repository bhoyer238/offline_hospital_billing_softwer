const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const billPreviewImg = "file:///C:/Users/bhoye/.gemini/antigravity/brain/760050d0-07b1-426b-ae33-3996305de01f/hospital_bill_preview_1787246407658.jpg";

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hospital Billing Software - Simple User Manual</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            line-height: 1.6;
            padding: 0;
            margin: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #0f172a;
            text-align: center;
            font-size: 32px;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 10px;
        }
        h2 {
            color: #2563eb;
            margin-top: 40px;
            font-size: 24px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
        }
        h3 {
            color: #334155;
            font-size: 20px;
        }
        p, li {
            font-size: 16px;
            color: #475569;
        }
        .step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 20px;
        }
        .step-number {
            background-color: #3b82f6;
            color: white;
            font-weight: bold;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-right: 15px;
            margin-top: 2px;
        }
        .step-content {
            flex-grow: 1;
        }
        
        /* Simulated UI Screenshots (CSS Mockups) */
        .mock-app {
            border: 2px solid #cbd5e1;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            margin: 25px 0;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            background: #f1f5f9;
        }
        .mock-sidebar {
            width: 200px;
            background: #0f172a;
            color: #94a3b8;
            padding: 20px 0;
            min-height: 300px;
        }
        .mock-menu-item {
            padding: 10px 20px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .mock-menu-item.active {
            background: #1e293b;
            color: #38bdf8;
            border-left: 3px solid #38bdf8;
        }
        .mock-main {
            flex-grow: 1;
            padding: 20px;
        }
        .mock-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .mock-title {
            font-size: 20px;
            font-weight: bold;
            color: #0f172a;
        }
        .mock-btn-primary {
            background: #3b82f6;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
        }
        .mock-btn-edit {
            background: #eab308;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .mock-cards {
            display: flex;
            gap: 15px;
        }
        .mock-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            flex: 1;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
        }
        .mock-card-title { font-size: 12px; color: #64748b; }
        .mock-card-value { font-size: 24px; font-weight: bold; color: #0f172a; margin-top: 5px; }
        .mock-table {
            width: 100%;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            border-collapse: collapse;
        }
        .mock-table th, .mock-table td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
            font-size: 14px;
        }
        .mock-table th { background: #f8fafc; color: #475569; }
        
        /* Modal Mockup */
        .mock-modal-overlay {
            background: rgba(15, 23, 42, 0.7);
            position: absolute;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .mock-modal {
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 400px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .mock-input {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 8px;
            width: 90%;
            margin-bottom: 10px;
            background: #f8fafc;
            color: #334155;
            font-size: 12px;
        }
        .note {
            background: #fffbeb;
            border-left: 5px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .important {
            background: #fef2f2;
            border-left: 5px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .real-img {
            max-width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>

<div class="container">
    <h1>Hospital Billing Software<br><span style="font-size: 20px; color: #64748b; font-weight: normal;">Simple Step-by-Step Training Guide</span></h1>
    
    <p>Namaste! Yeh software bilkul aasan tareeke se banaya gaya hai. Is guide mein hum photos (visuals) ke saath dekhenge ki software ko kaise chalana hai. Koi technical knowledge ki zaroorat nahi hai!</p>

    <!-- SECTION 1 -->
    <h2>1. Dashboard (Main Screen)</h2>
    <p>Jab aap software open karenge, sabse pehle aapko <strong>Dashboard</strong> dikhega. Yeh screen aapko batati hai ki aaj kitne patients aaye aur kitni kamai (revenue) hui.</p>
    
    <!-- MOCKUP: Dashboard -->
    <div class="mock-app">
        <div class="mock-sidebar">
            <div class="mock-menu-item active">🏠 Dashboard</div>
            <div class="mock-menu-item">👥 Patients</div>
            <div class="mock-menu-item">📄 Billing</div>
            <div class="mock-menu-item">💳 Payments</div>
        </div>
        <div class="mock-main">
            <div class="mock-header">
                <div class="mock-title">Dashboard</div>
            </div>
            <div class="mock-cards">
                <div class="mock-card">
                    <div class="mock-card-title">Today's Revenue (Aaj ki Kamai)</div>
                    <div class="mock-card-value">₹ 5,400</div>
                </div>
                <div class="mock-card">
                    <div class="mock-card-title">Total Patients</div>
                    <div class="mock-card-value">12</div>
                </div>
                <div class="mock-card">
                    <div class="mock-card-title">Pending Bills</div>
                    <div class="mock-card-value" style="color: #ef4444;">3</div>
                </div>
            </div>
        </div>
    </div>

    <!-- SECTION 2 -->
    <h2>2. Patient Ko Kaise Jodein (Add New Patient)</h2>
    <p>Kisi bhi naye mareez (patient) ka record banane ke liye in steps ko follow karein:</p>
    
    <div class="step">
        <div class="step-number">1</div>
        <div class="step-content">Left side menu mein <strong>Patients</strong> par click karein.</div>
    </div>
    <div class="step">
        <div class="step-number">2</div>
        <div class="step-content">Upar Right side mein nile rang ke <strong>+ New Patient</strong> button ko dabayein.</div>
    </div>

    <!-- MOCKUP: Patients List -->
    <div class="mock-app">
        <div class="mock-sidebar">
            <div class="mock-menu-item">🏠 Dashboard</div>
            <div class="mock-menu-item active">👥 Patients</div>
            <div class="mock-menu-item">📄 Billing</div>
        </div>
        <div class="mock-main">
            <div class="mock-header">
                <div class="mock-title">Patients List</div>
                <div class="mock-btn-primary">+ New Patient</div>
            </div>
            <table class="mock-table">
                <tr><th>UHID</th><th>Name</th><th>Mobile</th><th>Action</th></tr>
                <tr><td>UHID/2026/01</td><td>Rahul Kumar</td><td>9876543210</td><td><span class="mock-btn-edit">✏️ Edit</span></td></tr>
                <tr><td>UHID/2026/02</td><td>Priya Sharma</td><td>9123456789</td><td><span class="mock-btn-edit">✏️ Edit</span></td></tr>
            </table>
        </div>
    </div>

    <div class="step">
        <div class="step-number">3</div>
        <div class="step-content">
            <strong>Form Bharein:</strong> Ek naya form khulega. Usme Patient ka naam aur details daalein.<br>
            <span style="color: #059669; font-weight: bold;">⭐ Jadoo (Magic Feature):</span> Jaise hi aap Patient ki <strong>Date of Birth (DOB)</strong> daalenge, uski <strong>Age</strong> apne aap calculate ho jayegi! Aapko age type karne ki zaroorat nahi hai.
        </div>
    </div>

    <!-- MOCKUP: Add Patient Modal -->
    <div class="mock-app" style="position: relative; justify-content: center; height: 350px;">
        <div class="mock-modal-overlay">
            <div class="mock-modal">
                <div class="mock-header">
                    <div class="mock-title">Add New Patient</div>
                    <div style="cursor:pointer">❌</div>
                </div>
                <div style="font-size: 12px; margin-bottom: 4px;">Full Name *</div>
                <div class="mock-input">Rahul Kumar</div>
                
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1;">
                        <div style="font-size: 12px; margin-bottom: 4px;">Date of Birth</div>
                        <div class="mock-input">15-08-1990</div>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 12px; margin-bottom: 4px;">Age <span style="color:#3b82f6">(Auto calculated)</span></div>
                        <div class="mock-input" style="background:#e2e8f0;">36 Years</div>
                    </div>
                </div>
                
                <div style="font-size: 12px; margin-bottom: 4px;">Mobile Number</div>
                <div class="mock-input">9876543210</div>
                
                <div style="text-align: right; margin-top: 15px;">
                    <span class="mock-btn-primary">Save Patient</span>
                </div>
            </div>
        </div>
    </div>

    <div class="note">
        <strong>Purane Patient ko Edit karna (Update):</strong> Agar kisi patient ki details galat ho gayi hain, toh Patient List mein uske naam ke aage yellow color ke <strong>✏️ Edit</strong> button par click karein. Purani saari details form mein aa jayengi. Badlaav karein aur 'Update' daba dein.
    </div>

    <div style="page-break-after: always;"></div>

    <!-- SECTION 3 -->
    <h2>3. Bill Banana (IPD / OPD Billing)</h2>
    <p>Patient ke ilaj ke baad uska bill banana sabse zaroori kaam hai.</p>
    
    <div class="step">
        <div class="step-number">1</div>
        <div class="step-content">Left menu mein <strong>Billing</strong> par click karein.</div>
    </div>
    <div class="step">
        <div class="step-number">2</div>
        <div class="step-content"><strong>+ Create New Bill</strong> button dabayein.</div>
    </div>
    <div class="step">
        <div class="step-number">3</div>
        <div class="step-content">
            <strong>Bill Type Select Karein:</strong><br>
            🔘 <strong>OPD:</strong> Jab patient sirf checkup ke liye aata hai aur ghar chala jaata hai.<br>
            🔘 <strong>IPD:</strong> Jab patient hospital mein admit hota hai (ward/room mein).
        </div>
    </div>
    <div class="step">
        <div class="step-number">4</div>
        <div class="step-content">
            <strong>Services Add Karein:</strong> Jese 'Consultation Fee', 'Blood Test', 'Room Charge'. Aap list se service select karke uska rate daal sakte hain. Total amount apne aap calculate hoga.
        </div>
    </div>

    <!-- SECTION 4 -->
    <h2>4. Bill Print Karna (A4 Size)</h2>
    <p>Bill banne ke baad aap usko mareez ko de sakte hain. Bill list mein <strong>👁️ View (Aankh ka nishan)</strong> par click karein. Ek bahut hi professional aur sundar bill dikhega.</p>
    
    <p>Aapke software ka Real Bill Preview aesa dikhta hai:</p>
    <div style="text-align: center;">
        <img src="${billPreviewImg}" class="real-img" alt="Bill Preview Image">
    </div>

    <div class="step">
        <div class="step-number">🖨️</div>
        <div class="step-content">Bill ke neeche <strong>Print Bill</strong> ka button hoga. Us par click karte hi aapke printer se A4 size ka bill nikal aayega. Agar aap chahein toh isko PDF banakar WhatsApp bhi kar sakte hain.</div>
    </div>

    <!-- SECTION 5 -->
    <h2>5. Sabse Zaroori Baat: Data Backup (Safe Rakhna)</h2>
    <p>Yeh software <strong>100% Offline</strong> hai. Iska matlab saara data (patients, bills) aapke computer ke andar ek file mein save hota hai. Internet ki koi zaroorat nahi hai.</p>

    <div class="important">
        <strong>⚠️ Data Backup Kaise Lein:</strong> Agar kal ko aapka computer kharab ho jaye, toh data bachane ke liye ye karna zaroori hai:
        <br><br>
        1. Apne computer mein ye rasta (path) kholein:<br>
        <code>C:\\Users\\[Aapka Naam]\\AppData\\Roaming\\HospitalBilling\\database\\</code><br>
        2. Wahan aapko <strong>hospital.db</strong> naam ki ek file milegi.<br>
        3. Hafte mein ek baar is <code>hospital.db</code> file ko Pen-Drive ya Google Drive mein Copy-Paste kar lein.<br>
        4. Agar computer badalna ho, toh naye computer mein software daal kar bas yahi file wapas rakh dein. Aapka saara purana data wapas aa jayega!
    </div>

</div>

</body>
</html>
`;

fs.writeFileSync('Visual_Manual.html', htmlContent);
console.log('Visual HTML created.');

try {
    const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    const outPdf = "E:\\Project\\Hospital Billing\\Hospital_Billing_Simple_Manual.pdf";
    const inHtml = "E:\\Project\\Hospital Billing\\Visual_Manual.html";
    const cmd = `"${edgePath}" --headless --disable-gpu --print-to-pdf="${outPdf}" "${inHtml}"`;
    execSync(cmd);
    console.log('PDF created.');
} catch(e) {
    console.error(e);
}
