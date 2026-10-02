---
title: Hospital Billing Management System
author: System Administrator
---

<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
  h1 { color: #1565C0; border-bottom: 2px solid #1565C0; padding-bottom: 10px; }
  h2 { color: #1e88e5; margin-top: 30px; }
  h3 { color: #424242; }
  .note { background: #e3f2fd; padding: 15px; border-left: 5px solid #1976d2; margin: 20px 0; border-radius: 4px; }
  .warning { background: #fff3e0; padding: 15px; border-left: 5px solid #f57c00; margin: 20px 0; border-radius: 4px; }
  img { max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 15px 0; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
  th { background-color: #f5f5f5; color: #333; }
</style>

# Hospital Billing Management System
## Complete User & Administration Manual

---

## 1. Introduction
Welcome to the **Hospital Billing Management System**. This software is a completely offline, secure, and fast desktop application built to manage patient registrations, hospital billing, OPD/IPD tracking, and revenue reporting.

### Key Features:
- **100% Offline**: No internet required. Your data stays on your computer.
- **Patient Management**: Quick registration with automatic age calculation from Date of Birth.
- **Smart Billing**: Generate professional A4 bills for IPD (Inpatient) and OPD (Outpatient) services.
- **Payment Tracking**: Keep track of pending balances, paid amounts, and partial payments.
- **Secure Architecture**: Unique bill numbers guaranteed without conflicts.

---

## 2. Getting Started & Setup

### How to Launch the Software
1. Open the folder where the software is stored (e.g., `Hospital Billing/release/win-unpacked/`).
2. Double-click the **`Hospital Billing.exe`** application icon.
3. The software will launch instantly. 

<div class="note">
<strong>Login:</strong> By default, if the software requires a login, use the Admin credentials provided during installation.
</div>

---

## 3. Dashboard Overview

When you log in, you will see the **Dashboard**. This is the control center of your hospital software.
- **Today's Revenue**: Shows total collections for the current day.
- **Active IPD Patients**: Number of patients currently admitted.
- **Pending Bills**: Quick alert for bills that are not fully paid.
- **Sidebar Menu**: Located on the left, use this to navigate to Patients, Billing, Payments, Reports, and Settings.

---

## 4. Patient Management (Registration & Editing)

### How to Add a New Patient
1. Click on **Patients** in the left sidebar.
2. Click the **+ New Patient** button (blue button at the top right).
3. The Registration Form will appear.
4. **Auto Age Calculation**: If you enter the **Date of Birth (DOB)**, the software will automatically calculate the patient's Age in years. You do not need to type the age manually!
5. Fill in required details like *Name*, *Mobile*, *Gender*, and *Address*.
6. Click **Save / Register Patient**.

### How to Edit an Existing Patient
1. In the Patients list, search for the patient using Name, Mobile, or UHID in the search bar.
2. Click the **yellow Edit (✏️) icon** next to the patient's name.
3. The form will open with *all their previous information loaded automatically*.
4. Change the required fields (e.g., update phone number or address).
5. Click **Update Patient**.

<div class="warning">
<strong>Note:</strong> Editing a patient will update their existing record. It will NOT create a duplicate patient. Unique IDs (UHID) remain unchanged.
</div>

---

## 5. Understanding OPD vs IPD

Before generating bills, it is helpful to understand how the software categorizes visits:

| Department | Meaning | When to Use |
|------------|---------|-------------|
| **OPD** | Outpatient Department | When a patient comes for a normal checkup, consultation, or tests, and goes back home the same day. |
| **IPD** | Inpatient Department | When a patient is formally *admitted* to the hospital (ward/room/ICU) for an extended stay, surgery, or treatment. |

*In the Billing section, you can select whether a bill is for OPD or IPD. The software ensures that bill numbers are generated systematically across both departments.*

---

## 6. Billing & Invoicing

### Generating a New Bill
1. Go to the **Billing** section from the sidebar.
2. Click **+ Create New Bill**.
3. **Step 1 (Patient)**: Select the patient from the list.
4. **Step 2 (Services)**: 
   - Click **+ Add Item** to add services (e.g., Consultation, Blood Test, Room Charges).
   - Enter the **Quantity** and **Rate**. The *Amount* will calculate automatically.
   - You can add as many items as needed.
5. **Step 3 (Discount & Payment)**: 
   - Apply a Discount (%) if necessary. The Net Amount will update automatically.
6. Click **Save Bill**.

### Editing an Existing Bill
If you made a mistake in a finalized bill, you can edit it:
1. Find the bill in the Billing list.
2. Click the **yellow Edit (✏️) button**.
3. The Edit Bill screen will open. You can:
   - Change service rates or quantities.
   - Add new services or remove existing ones.
   - Change the discount percentage.
4. The software automatically recalculates the *New Balance* taking into account what the patient has already paid.
5. Click **Save Changes**.

### Printing Bills to PDF / A4
1. Click the **blue View (👁️) button** next to any bill.
2. The Bill Preview will open showing the professional hospital layout.
3. Click the **Print** button at the bottom right.
4. The software will safely open the Windows Print Dialog.
   - Select your Printer to print a physical copy.
   - OR select **"Microsoft Print to PDF"** / **"Save as PDF"** to save a soft copy.
5. The printout is perfectly formatted for A4 size paper, with headers, footers, and color coding.

---

## 7. Payments & Balance

If a bill is generated but not fully paid, it shows an *Outstanding Balance*.
1. To collect pending money, click **+ Payment** on the bill.
2. Enter the amount received and select the payment mode (Cash/Card/UPI).
3. The bill's balance will instantly reduce, and a Receipt is generated.

---

## 8. Data Safety, Backup & Portability

Because this software is 100% offline, your data is stored locally on your machine. **There are no cloud servers.**

### Where is the Data Stored?
The database file is securely stored on your Windows system at:
`C:\Users\[Your Username]\AppData\Roaming\HospitalBilling\database\hospital.db`

### How to Take a Backup (Highly Recommended)
1. Close the Hospital Billing software.
2. Press `Windows Key + R` on your keyboard to open the "Run" dialog.
3. Type `%appdata%\HospitalBilling\database` and press Enter.
4. You will see a file named **`hospital.db`**.
5. Copy this file and paste it into a safe location (e.g., Pen Drive, Google Drive, External Hard Disk).
6. *Do this weekly to ensure you never lose patient data if your computer crashes!*

### Moving the Software to Another Computer
If you buy a new computer or want to give the software to a colleague:
1. Copy the entire `Hospital Billing/release/win-unpacked/` folder to a Pen Drive.
2. Paste it on the new computer.
3. The software will run perfectly.
4. *(Optional)* If you want to move the *Data* too, copy your backed-up `hospital.db` file into the `%appdata%\HospitalBilling\database` folder on the new computer.

---

## Need Support?
If you encounter bugs, do not attempt to modify the `app.asar` code manually. Contact your system administrator to provide a new patched `.asar` file, which you can simply replace in the `resources` folder without losing any patient data.

---
*End of Document*
