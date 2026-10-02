# 🏥 Hospital Billing Management System

**Offline Hospital Billing & Patient Management Desktop Application**

---

## ✅ Features

### Patient Management
- Unique UHID generation per patient
- Complete patient profile (demographics, contact, insurance)
- Advanced search by name, UHID, mobile

### OPD (Outpatient Department)
- Daily OPD registration
- OPD visit tracking
- Consultation fee collection

### IPD (Inpatient Department)
- Patient admission with auto IPD number
- Bed/room category assignment
- TPA/Insurance claim tracking
- Discharge processing

### Billing
- Multi-step bill creation (Patient → Services → Payment)
- Automatic bill numbering
- Service master integration
- Discount (% or flat amount)
- Tax support (configurable)
- Bill preview with professional A4 layout
- Print & PDF generation
- Bill cancellation with reason

### Payments
- Partial payment tracking
- Multiple payment modes (Cash, Card, UPI, Bank Transfer, Cheque)
- Receipt number generation
- Outstanding balance management

### Services Management
- Service categories (Administration, Room, ICU, Lab, Radiology, etc.)
- Rate management (stored as integer paise - no float errors)
- Active/Inactive toggle

### Doctors Management
- Department-wise doctor roster
- Specialization tracking
- Active/Inactive status

### Reports
- Daily Collection Report
- Monthly Revenue Report
- Pending Payments Report
- Service Revenue Report
- Doctor Revenue Report
- Patient Report
- IPD/OPD Reports
- Cancelled Bills Report
- CSV Export

### User Management (Admin Only)
- Admin & Receptionist roles
- Password reset
- User activation/deactivation

### Audit Logs (Admin Only)
- Complete activity trail
- Filter by module, date range, action

### Backup & Restore (Admin Only)
- Local backup creation
- Safety backup before restore
- Backup rotation management

### Settings (Admin Only)
- Hospital logo & details
- GST number
- Bill/UHID/IPD number prefixes
- Tax configuration
- Footer text & terms
- Session timeout

---

## 🔧 Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Electron 30 |
| Frontend | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS |
| Database | SQLite (better-sqlite3) |
| State Management | Zustand |
| Forms | React Hook Form + Zod |
| Auth | bcryptjs (local hashing) |
| Charts | Recharts |

---

## 🚀 Getting Started

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
npm run build
```

### Create Windows Installer
```bash
npm run dist
```
Output: `release/Hospital Billing Setup X.X.X.exe`

---

## 📂 Project Structure

```
Hospital Billing/
├── electron/                # Electron main process
│   ├── main.ts             # App entry point
│   ├── preload.ts          # Secure IPC bridge
│   ├── database/
│   │   ├── db.ts           # SQLite init + migrations
│   │   └── repositories/   # Data access layer
│   └── ipc/                # IPC handlers (one per module)
├── src/                    # React renderer
│   ├── App.tsx             # Router + auth guards
│   ├── pages/              # Page components
│   ├── components/         # Shared UI components
│   ├── store/              # Zustand stores
│   ├── utils/              # Currency, date helpers
│   └── types/              # TypeScript interfaces
├── public/                 # Static assets
└── dist/                   # Built frontend (generated)
```

---

## 🔐 Security

- All patient data stored **locally** in SQLite — never sent to any server
- Password hashing with bcryptjs (SALT_ROUNDS=10)
- Session timeout (configurable, default 60 minutes)
- Admin-only routes protected both in UI and IPC layer
- Context isolation enabled in Electron
- No Node.js integration in renderer process

---

## 💾 Database Location

```
%APPDATA%\HospitalBilling\database\hospital.db
```

Backups are stored in:
```
%APPDATA%\HospitalBilling\backups\
```

---

## 🖨️ Printing

- Use **Ctrl+P** to print any bill
- Professional A4 layout with hospital header
- Print to PDF supported via system print dialog

---

## 📋 First-Time Setup

1. Launch the application
2. Complete the Setup Wizard:
   - Enter Hospital Name & contact details
   - Create Admin username & password
3. Login with your credentials
4. Go to **Settings** to configure:
   - Upload hospital logo
   - Set bill number prefix
   - Configure GST settings
5. Add **Services** and **Doctors** from their respective pages
6. Start registering **Patients**!

---

## ⚠️ Important Notes

- This application works **completely offline** — no internet required
- Take regular **backups** from the Backup page
- Store backup files on an external drive for safety
- The application stores data in the Windows AppData folder

---

*Built with ❤️ for efficient hospital billing management*
