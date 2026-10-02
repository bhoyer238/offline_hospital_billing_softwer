import { useState, useEffect } from 'react';
import type { Bill, HospitalSettings } from '../../types';
import { numberToWords, paiseToRupees } from '../../utils/currency';
import { formatDate } from '../../utils/dateUtils';

interface BillPreviewProps {
  bill: Bill;
  settings: HospitalSettings | null;
  isReprint?: boolean;
}

// Hook: load logo as base64 via IPC (avoids file:// protocol restrictions)
function useLogoBase64(logoPath?: string | null) {
  const [base64, setBase64] = useState<string | null>(null);
  useEffect(() => {
    if (!logoPath) { setBase64(null); return; }
    window.api.settings.readLogo(logoPath).then(r => {
      setBase64(r.success && r.base64 ? r.base64 : null);
    }).catch(() => setBase64(null));
  }, [logoPath]);
  return base64;
}

export default function BillPreview({ bill, settings, isReprint = false }: BillPreviewProps) {
  const sym = settings?.currency_symbol || '₹';
  const items = bill.items || [];
  const hospitalName = settings?.hospital_name || 'HOSPITAL NAME';
  const logoBase64 = useLogoBase64(settings?.logo_path);

  // Calculate days of stay
  let stayDays = '';
  if (bill.admission_date && bill.discharge_date) {
    const adm = new Date(bill.admission_date);
    const dis = new Date(bill.discharge_date);
    const diff = Math.ceil((dis.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24));
    stayDays = `${diff} Day${diff !== 1 ? 's' : ''}`;
  }

  return (
    <div
      id="bill-preview"
      style={{
        fontFamily: "'Segoe UI', Arial, sans-serif",
        fontSize: '12px',
        color: '#111',
        width: '100%',
        background: '#fff',
      }}
    >
      {/* ═══════════════ HEADER ═══════════════ */}
      <div style={{
        background: '#1565C0',
        color: '#fff',
        padding: '18px 24px 14px',
        position: 'relative',
        overflow: 'hidden',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}>
        {/* Decorative bg circles */}
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', right: '70px', top: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          {/* Logo + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '68px', height: '68px', flexShrink: 0,
              background: '#fff', borderRadius: '10px', padding: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}>
              {logoBase64 ? (
                <img src={logoBase64} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '6px' }} />
              ) : (
                <span style={{ fontSize: '28px', color: '#1565C0', fontWeight: 900 }}>✚</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', lineHeight: 1.1 }}>
                {hospitalName}
              </div>
              {settings?.address && (
                <div style={{ fontSize: '10.5px', opacity: 0.9, marginTop: '3px', lineHeight: 1.4 }}>
                  {[settings.address, settings.city, settings.district].filter(Boolean).join(', ')}
                  {settings.pin_code ? ` - ${settings.pin_code}` : ''}
                </div>
              )}
              <div style={{ fontSize: '10.5px', opacity: 0.9, marginTop: '2px' }}>
                {settings?.phone && <span>📞 {settings.phone}</span>}
                {settings?.email && <span style={{ marginLeft: '12px' }}>✉ {settings.email}</span>}
              </div>
            </div>
          </div>

          {/* Reg/GST + Reprint badge */}
          <div style={{ textAlign: 'right', fontSize: '10px' }}>
            {settings?.registration_number && (
              <div style={{ marginBottom: '3px', opacity: 0.9 }}>
                Reg. No.: <strong>{settings.registration_number}</strong>
              </div>
            )}
            {settings?.gst_number && (
              <div style={{ opacity: 0.9 }}>
                GST No.: <strong>{settings.gst_number}</strong>
              </div>
            )}
            {isReprint && settings?.show_reprint_stamp && (
              <div style={{ marginTop: '8px', background: '#FF8F00', color: '#fff', padding: '3px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '10px', letterSpacing: '1px' }}>
                ⟳ REPRINT
              </div>
            )}
          </div>
        </div>

        {/* Bill type bar */}
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
            {bill.bill_type === 'IPD' ? '🏥 IPD — Inpatient Department Bill' : '🩺 OPD — Outpatient Department Bill'}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.85 }}>
            Printed: {new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* ═══════════════ BILL INFO + PATIENT INFO ═══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '2px solid #1565C0' }}>
        {/* Bill Details */}
        <div style={{ padding: '14px 18px', background: '#F8F9FA', borderRight: '1px solid #E0E0E0' }}>
          <SectionTitle title="Bill Details" />
          <InfoTable rows={[
            { label: 'Bill Number', value: bill.bill_number, bold: true },
            { label: 'Bill Date', value: formatDate(bill.bill_date) },
            { label: 'UHID', value: bill.uhid || '—' },
            ...(bill.ipd_number ? [{ label: 'IPD Number', value: bill.ipd_number }] : []),
            ...(bill.opd_number ? [{ label: 'OPD Number', value: bill.opd_number }] : []),
            ...(bill.tpa_name ? [{ label: 'TPA Name', value: bill.tpa_name }] : []),
            ...(bill.claim_number ? [{ label: 'Claim No.', value: bill.claim_number }] : []),
            ...(bill.policy_name ? [{ label: 'Policy', value: bill.policy_name }] : []),
          ]} />
        </div>

        {/* Patient Details */}
        <div style={{ padding: '14px 18px', background: '#fff' }}>
          <SectionTitle title="Patient Details" />
          <InfoTable rows={[
            { label: 'Patient Name', value: bill.patient_name || '—', bold: true, large: true },
            { label: 'Age / Gender', value: `${bill.age || '—'} ${bill.age_unit || ''} / ${bill.gender || '—'}` },
            ...(bill.address ? [{ label: 'Address', value: [bill.address, bill.city, bill.district].filter(Boolean).join(', ') }] : []),
            ...(bill.doctor_name ? [{ label: 'Consultant', value: `Dr. ${bill.doctor_name}` }] : []),
            ...(bill.admission_date ? [{ label: 'Admission', value: formatDate(bill.admission_date) }] : []),
            ...(bill.discharge_date ? [{ label: 'Discharge', value: formatDate(bill.discharge_date) }] : []),
            ...(stayDays ? [{ label: 'Stay Duration', value: stayDays }] : []),
            ...(bill.diagnosis ? [{ label: 'Diagnosis', value: bill.diagnosis }] : []),
            ...(bill.category ? [{ label: 'Category', value: bill.category }] : []),
          ]} />
        </div>
      </div>

      {/* ═══════════════ SERVICES TABLE ═══════════════ */}
      <div style={{ background: '#1565C0', color: '#fff', padding: '7px 18px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        Services &amp; Charges
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#E3F2FD', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <th style={th({ width: '5%' })}>Sr.</th>
            <th style={{ ...th({}), textAlign: 'left', paddingLeft: '14px', width: '50%' }}>Description of Service</th>
            <th style={th({ width: '11%' })}>Qty/Days</th>
            <th style={th({ width: '17%' })}>Rate ({sym})</th>
            <th style={th({ width: '17%' })}>Amount ({sym})</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #EEEEEE' }}>
              <td style={td({ textAlign: 'center' })}>{idx + 1}</td>
              <td style={{ ...td({}), textAlign: 'left', paddingLeft: '14px', fontWeight: 500 }}>
                {item.service_name}
                {item.notes && <span style={{ display: 'block', fontSize: '10px', color: '#777', marginTop: '1px' }}>{item.notes}</span>}
              </td>
              <td style={td({ textAlign: 'center' })}>{item.quantity}</td>
              <td style={td({ textAlign: 'right', paddingRight: '12px' })}>
                {paiseToRupees(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td style={td({ textAlign: 'right', paddingRight: '12px', fontWeight: 600 })}>
                {paiseToRupees(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
          {/* Minimum blank rows */}
          {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
            <tr key={`e${i}`} style={{ background: (items.length + i) % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: '1px solid #EEEEEE' }}>
              {[0, 1, 2, 3, 4].map(c => <td key={c} style={td({ height: '22px' })}>&nbsp;</td>)}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#E3F2FD', borderTop: '2px solid #1565C0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <td colSpan={4} style={{ padding: '7px 14px', fontWeight: 700, fontSize: '12px', textAlign: 'right', color: '#1565C0' }}>
              TOTAL CHARGES
            </td>
            <td style={{ padding: '7px 12px 7px 0', fontWeight: 700, fontSize: '12px', textAlign: 'right', color: '#1565C0' }}>
              {sym} {paiseToRupees(bill.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ═══════════════ AMOUNT IN WORDS + BILL SUMMARY ═══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #E0E0E0' }}>
        {/* Amount in words */}
        <div style={{ padding: '14px 18px', background: '#F8F9FA', borderRight: '1px solid #E0E0E0' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#1565C0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1.5px solid #1565C0' }}>
            Net Amount in Words
          </div>
          <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#333', lineHeight: 1.6, fontWeight: 500 }}>
            {numberToWords(bill.net_amount)}
          </div>
          {bill.notes && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#1565C0', textTransform: 'uppercase', marginBottom: '3px' }}>Remarks</div>
              <div style={{ fontSize: '11px', color: '#555' }}>{bill.notes}</div>
            </div>
          )}
        </div>

        {/* Bill Summary */}
        <div style={{ padding: '14px 18px', background: '#fff' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#1565C0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1.5px solid #1565C0' }}>
            Bill Summary
          </div>
          <SummaryRow label="Total Charges" value={paiseToRupees(bill.subtotal)} sym={sym} />
          {bill.discount_amount > 0 && (
            <SummaryRow label={`Discount${bill.discount_percent > 0 ? ` (${bill.discount_percent}%)` : ''}`} value={-paiseToRupees(bill.discount_amount)} sym={sym} color="#C62828" />
          )}
          {bill.tax_amount > 0 && (
            <SummaryRow label="Tax / GST" value={paiseToRupees(bill.tax_amount)} sym={sym} />
          )}
          <div style={{ borderTop: '2px solid #1565C0', margin: '6px 0 4px' }} />
          <SummaryRow label="Net Amount" value={paiseToRupees(bill.net_amount)} sym={sym} bold bg="#E3F2FD" color="#1565C0" size={13} />
          <div style={{ borderTop: '1px solid #DDD', margin: '4px 0' }} />
          <SummaryRow label="Amount Paid" value={paiseToRupees(bill.paid_amount)} sym={sym} color="#2E7D32" />
          <SummaryRow
            label="Balance Due"
            value={paiseToRupees(bill.balance_amount)}
            sym={sym}
            bold
            color={bill.balance_amount > 0 ? '#C62828' : '#2E7D32'}
            bg={bill.balance_amount > 0 ? '#FFF3E0' : 'transparent'}
          />
        </div>
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <div style={{ borderTop: '3px solid #1565C0', padding: '14px 18px 12px' }}>
        {settings?.terms_conditions && (
          <div style={{ fontSize: '9.5px', color: '#555', marginBottom: '14px', lineHeight: 1.5, padding: '7px 10px', background: '#FFF8E1', borderLeft: '3px solid #FFC107', borderRadius: '0 4px 4px 0' }}>
            <span style={{ fontWeight: 700, color: '#E65100' }}>Terms &amp; Conditions: </span>
            {settings.terms_conditions}
          </div>
        )}

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginTop: '20px', marginBottom: '10px' }}>
          {['Patient / Attendant Signature', 'Cashier / Receptionist', `Authorised Signatory\n${hospitalName}`].map((label, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ height: '38px' }} />
              <div style={{ borderTop: '1px solid #888', paddingTop: '5px' }}>
                {label.split('\n').map((l, j) => (
                  <div key={j} style={{ fontSize: j === 0 ? '10px' : '9px', fontWeight: j === 0 ? 600 : 400, color: j === 0 ? '#333' : '#888', lineHeight: 1.4 }}>{l}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer message */}
        <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #CCC' }}>
          <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>
            {settings?.footer_text || '🙏 Thank you for choosing our hospital. Wishing you a speedy recovery!'}
          </div>
          <div style={{ fontSize: '9px', color: '#AAA', marginTop: '2px' }}>
            {hospitalName} · This is a computer-generated bill
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function SectionTitle({ title }: { title: string }) {
  return (
    <div style={{ fontSize: '10px', fontWeight: 700, color: '#1565C0', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', paddingBottom: '5px', borderBottom: '1.5px solid #1565C0', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ display: 'inline-block', width: '3px', height: '12px', background: '#1565C0', borderRadius: '2px', flexShrink: 0 }} />
      {title}
    </div>
  );
}

interface InfoRowDef { label: string; value: string; bold?: boolean; large?: boolean; }
function InfoTable({ rows }: { rows: InfoRowDef[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', fontSize: '11px', lineHeight: 1.4 }}>
          <span style={{ minWidth: '100px', flexShrink: 0, color: '#666', fontWeight: 500, fontSize: '10.5px' }}>{row.label}</span>
          <span style={{ color: '#555', marginRight: '4px' }}>:</span>
          <span style={{ fontWeight: row.bold ? 700 : 500, color: row.bold ? '#111' : '#333', fontSize: row.large ? '13px' : '11px' }}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SummaryRow({ label, value, sym, bold, bg, color, size }: {
  label: string; value: number; sym: string;
  bold?: boolean; bg?: string; color?: string; size?: number;
}) {
  const isNegative = value < 0;
  const displayVal = `${isNegative ? '- ' : ''}${sym} ${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: size ?? 12, fontWeight: bold ? 700 : 500,
      color: color || '#333',
      padding: bg ? '5px 8px' : '2px 8px',
      background: bg || 'transparent',
      borderRadius: bg ? '4px' : 0,
      marginBottom: '2px',
    }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'monospace' }}>{displayVal}</span>
    </div>
  );
}

function th(extra: React.CSSProperties): React.CSSProperties {
  return { padding: '8px 8px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#1565C0', background: '#E3F2FD', borderBottom: '2px solid #1565C0', borderRight: '1px solid #BBDEFB', ...extra };
}
function td(extra: React.CSSProperties): React.CSSProperties {
  return { padding: '6px 8px', fontSize: '11.5px', color: '#333', borderRight: '1px solid #EEEEEE', verticalAlign: 'middle', ...extra };
}
