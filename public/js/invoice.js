// ═══════════════════════════════════════════════════════════
//  INVOICE GENERATOR  — OFG Admin
//  Usage: printInvoice(order)
//  Generates a print-ready invoice in a new window.
//  No dependencies — pure vanilla JS + inline CSS.
// ═══════════════════════════════════════════════════════════

export function saveInvoicePDF(order) {
  _openInvoice(order, true);
}

export function printInvoice(order) {
  _openInvoice(order, false);
}

function _openInvoice(order, asPDF) {
  const items        = Array.isArray(order.items) ? order.items : [];
  const deliveryFee  = Number(order.deliveryFee)  || 0;
  const itemsTotal   = order.itemsTotal != null
    ? Number(order.itemsTotal)
    : items.reduce((s, it) => s + (Number(it.price)||0) * (Number(it.qty)||1), 0);
  const discountAmt  = Number(order.discountAmount) || 0;
  const total        = Number(order.total) ?? (itemsTotal - discountAmt + deliveryFee);

  const date = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' })
    : order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' })
      : new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });

  const invoiceNum = order.id ? order.id.slice(-8).toUpperCase() : Date.now().toString(36).toUpperCase();

  // ── Item rows ──────────────────────────────────────────────
  const itemRows = items.map(it => {
    const unitPrice  = Number(it.price) || 0;
    const qty        = Number(it.qty)   || 1;
    const lineTotal  = unitPrice * qty;
    const flashBadge = it.salePrice  ? `<span style="background:#fff3cd;color:#856404;border-radius:4px;padding:1px 6px;font-size:.7rem;margin-right:4px">⚡ فلاش</span>` : '';
    const discBadge  = it.originalPrice && it.price < it.originalPrice
      ? `<span style="background:#d1e7dd;color:#0f5132;border-radius:4px;padding:1px 6px;font-size:.7rem;margin-right:4px">خصم</span>` : '';
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;font-size:.88rem">
          ${it.name || '—'}${flashBadge}${discBadge}
          ${it.condition ? `<div style="font-size:.73rem;color:#6c757d;margin-top:2px">${it.condition}${it.platform ? ' · ' + it.platform : ''}</div>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:center;font-size:.88rem">${qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;font-size:.88rem">${unitPrice.toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;font-weight:700;font-size:.88rem">${lineTotal.toFixed(2)}</td>
      </tr>`;
  }).join('');

  // ── Totals section ─────────────────────────────────────────
  const discountRow = discountAmt > 0 ? `
    <tr>
      <td colspan="3" style="padding:6px 12px;text-align:right;font-size:.83rem;color:#198754">
        خصم الكوبون${order.couponCode ? ' (' + order.couponCode + ')' : ''}
      </td>
      <td style="padding:6px 12px;font-family:monospace;color:#198754;font-size:.83rem">- ${discountAmt.toFixed(2)}</td>
    </tr>` : '';

  const deliveryRow = deliveryFee > 0 ? `
    <tr>
      <td colspan="3" style="padding:6px 12px;text-align:right;font-size:.83rem;color:#6c757d">رسوم التوصيل</td>
      <td style="padding:6px 12px;font-family:monospace;color:#6c757d;font-size:.83rem">${deliveryFee.toFixed(2)}</td>
    </tr>` : '';

  // ── HTML ───────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>فاتورة #${invoiceNum}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cairo',sans-serif;background:#f8f9fa;color:#212529;direction:rtl}
  .page{max-width:794px;min-height:1123px;background:#fff;margin:0 auto;padding:36px 40px;position:relative}
  .header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #dee2e6;gap:16px}
  .logo-area{display:flex;flex-direction:column;gap:4px;flex-shrink:0}
  .logo-img{width:56px;height:56px;object-fit:contain;border-radius:10px;margin-bottom:6px}
  .logo-name{font-size:1.15rem;font-weight:900;color:#0d1117}
  .logo-sub{font-size:.72rem;color:#6c757d}
  .invoice-meta{text-align:left;min-width:0}
  .invoice-title{font-size:1.5rem;font-weight:900;color:#0066e6;margin-bottom:6px}
  .meta-row{font-size:.8rem;color:#6c757d;margin-bottom:3px}
  .meta-row strong{color:#212529}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px}
  .info-box{background:#f8f9fa;border-radius:10px;padding:12px 14px;overflow:hidden}
  .info-box h4{font-size:.75rem;font-weight:700;color:#6c757d;margin-bottom:8px;letter-spacing:.4px}
  .info-row{font-size:.83rem;color:#212529;margin-bottom:5px;word-break:break-word}
  .info-row span{color:#6c757d;font-size:.75rem;display:block}
  table{width:100%;border-collapse:collapse;margin-bottom:0;table-layout:fixed}
  thead th{background:#0d1117;color:#fff;padding:9px 10px;font-size:.8rem;font-weight:700}
  thead th:nth-child(1){width:45%;text-align:right}
  thead th:nth-child(2){width:12%;text-align:center}
  thead th:nth-child(3){width:21%;text-align:right;direction:ltr}
  thead th:nth-child(4){width:22%;text-align:right;direction:ltr}
  tbody td:nth-child(2){text-align:center}
  tbody td:nth-child(3),tbody td:nth-child(4){text-align:right;direction:ltr;font-family:monospace}
  tfoot td:last-child{text-align:right;direction:ltr;font-family:monospace}
  .grand-total td{background:#0d1117;color:#fff;font-size:.95rem;font-weight:900;padding:11px 10px}
  .grand-total td:last-child{font-size:1rem}
  .footer{margin-top:28px;padding-top:14px;border-top:1px solid #dee2e6;text-align:center;font-size:.72rem;color:#6c757d}
  @media print{
    body{background:#fff}
    .page{margin:0;padding:28px 32px;max-width:100%}
  }
</style>
</head>
<body onload="__invokeAction()">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
<script>
  const __pdf = false;
  function __invokeAction() {
    if (__pdf) {
      const el = document.querySelector('.page');
      const fname = document.title + '.pdf';
      html2pdf().set({
        margin: 10,
        filename: fname,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(el).save().then(() => setTimeout(() => window.close(), 800));
    } else {
      window.print();
    }
  }
<\/script>

<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <img class="logo-img" src="/assets/icons/icon-192x192.png" alt="OFG" onerror="this.style.display='none'">
      <div class="logo-name">OFG — عثمان للألعاب</div>
      <div class="logo-sub">Othman For Games</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">فاتورة</div>
      <div class="meta-row">رقم الفاتورة: <strong>#${invoiceNum}</strong></div>
      <div class="meta-row">التاريخ: <strong>${date}</strong></div>
    </div>
  </div>

  <!-- Customer + Delivery info -->
  <div class="info-grid">
    <div class="info-box">
      <h4>بيانات العميل</h4>
      <div class="info-row"><span>الاسم</span>${order.customerName || '—'}</div>
      <div class="info-row"><span>الهاتف</span><span dir="ltr" style="display:inline">${order.phone || '—'}</span></div>
      ${order.email ? `<div class="info-row"><span>البريد</span>${order.email}</div>` : ''}
    </div>
    <div class="info-box">
      <h4>بيانات التوصيل</h4>
      ${order.address ? `<div class="info-row"><span>العنوان</span>${order.address}</div>` : ''}
      ${order.deliveryMethod ? `<div class="info-row"><span>طريقة الاستلام</span>${order.deliveryMethod}</div>` : ''}
      ${deliveryFee > 0 ? `<div class="info-row"><span>رسوم التوصيل</span>${deliveryFee.toFixed(2)} JOD</div>` : ''}
      ${order.note ? `<div class="info-row"><span>ملاحظة</span>${order.note}</div>` : ''}
    </div>
  </div>

  <!-- Items table -->
  <table>
    <thead>
      <tr>
        <th>المنتج</th>
        <th>الكمية</th>
        <th>سعر الوحدة (JOD)</th>
        <th>الإجمالي (JOD)</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#6c757d">لا توجد منتجات</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="padding:8px 12px;text-align:right;font-size:.83rem;color:#6c757d;border-top:2px solid #dee2e6">إجمالي المنتجات</td>
        <td style="padding:8px 12px;text-align:left;font-family:monospace;border-top:2px solid #dee2e6">${itemsTotal.toFixed(2)}</td>
      </tr>
      ${discountRow}
      ${deliveryRow}
      <tr class="grand-total">
        <td colspan="3" style="text-align:right;padding:12px">الإجمالي النهائي</td>
        <td>${total.toFixed(2)} JOD</td>
      </tr>
    </tfoot>
  </table>

  <!-- Signature & Stamp -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:40px;padding-top:20px;border-top:1px solid #dee2e6">
    <!-- Signature -->
    <div style="text-align:center;min-width:180px">
      <div style="border-bottom:1.5px solid #212529;width:160px;margin:0 auto 6px;height:48px"></div>
      <div style="font-size:.78rem;color:#6c757d;font-weight:600">توقيع المسؤول</div>
      <div style="font-size:.72rem;color:#adb5bd;margin-top:2px">OFG — عثمان للألعاب</div>
    </div>

    <!-- Official Stamp -->
    <div style="text-align:center">
      <div style="position:relative;width:120px;height:120px;margin:0 auto">
        <!-- Outer ring -->
        <div style="position:absolute;inset:0;border:3px solid #0066e6;border-radius:50%;opacity:.85"></div>
        <!-- Inner ring -->
        <div style="position:absolute;inset:8px;border:1.5px dashed #0066e6;border-radius:50%;opacity:.5"></div>
        <!-- Content -->
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px">
          <img src="/assets/icons/icon-192x192.png" style="width:32px;height:32px;border-radius:6px;object-fit:contain" onerror="this.style.display='none'">
          <div style="font-size:.6rem;font-weight:900;color:#0066e6;letter-spacing:.5px">OFG</div>
          <div style="font-size:.52rem;color:#0066e6;text-align:center;line-height:1.3;padding:0 10px">عثمان للألعاب</div>
        </div>
      </div>
      <div style="font-size:.72rem;color:#adb5bd;margin-top:6px">الختم الرسمي</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>شكراً لتسوقكم معنا — OFG عثمان للألعاب</div>
    <div style="margin-top:4px;direction:ltr">#${order.id || invoiceNum}</div>
  </div>

</div>
</body>
</html>`;

  const titleStr = asPDF ? `فاتورة-${invoiceNum}` : `فاتورة #${invoiceNum}`;
  const finalHtml = html.replace(`<title>فاتورة #${invoiceNum}</title>`, `<title>${titleStr}</title>`);

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة'); return; }
  const htmlWithFlag = asPDF
    ? finalHtml.replace('const __pdf = false;', 'const __pdf = true;')
    : finalHtml;
  win.document.write(htmlWithFlag);
  win.document.close();
}
