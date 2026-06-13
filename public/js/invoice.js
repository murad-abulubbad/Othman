// ═══════════════════════════════════════════════════════════
//  INVOICE GENERATOR  — OFG Admin
//  Usage: printInvoice(order)
//  Generates a print-ready invoice in a new window.
//  No dependencies — pure vanilla JS + inline CSS.
// ═══════════════════════════════════════════════════════════

export function printInvoice(order) {
  const items        = Array.isArray(order.items) ? order.items : [];
  const totalQty     = items.reduce((s, it) => s + (Number(it.qty) || 1), 0);
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
  const afterDiscount = itemsTotal - discountAmt;

  const discountRow = discountAmt > 0 ? `
    <tr>
      <td colspan="3" style="padding:6px 12px;text-align:right;font-size:.83rem;color:#198754">
        خصم الكوبون${order.couponCode ? ' (' + order.couponCode + ')' : ''}</td>
      <td style="padding:6px 12px;font-family:monospace;color:#198754;font-size:.83rem;direction:ltr;text-align:right">- ${discountAmt.toFixed(2)}</td>
    </tr>
    <tr>
      <td colspan="3" style="padding:6px 12px;text-align:right;font-size:.83rem;color:#212529">السعر بعد الخصم</td>
      <td style="padding:6px 12px;font-family:monospace;font-size:.83rem;direction:ltr;text-align:right">${afterDiscount.toFixed(2)}</td>
    </tr>` : '';

  const deliveryRow = deliveryFee > 0 ? `
    <tr>
      <td colspan="3" style="padding:6px 12px;text-align:right;font-size:.83rem;color:#6c757d">
        رسوم التوصيل${order.deliveryMethod ? ' · ' + order.deliveryMethod : ''}</td>
      <td style="padding:6px 12px;font-family:monospace;color:#6c757d;font-size:.83rem;direction:ltr;text-align:right">${deliveryFee.toFixed(2)}</td>
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
  .page{max-width:794px;background:#fff;margin:0 auto;padding:36px 40px;position:relative}
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
  .info-box{background:#f8f9fa;border-radius:10px;padding:14px 16px;overflow:hidden}
  .info-box h4{font-size:.78rem;font-weight:800;color:#0d1117;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #dee2e6}
  .info-row{font-size:.82rem;color:#212529;margin-bottom:6px;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
  .info-row .lbl{color:#6c757d;font-size:.75rem;flex-shrink:0;white-space:nowrap}
  .info-row .val{font-weight:600;text-align:left;word-break:break-word}
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
  /* ── Watermark grid of stamps ── */
  .watermark-bg{
    position:fixed;inset:0;
    pointer-events:none;z-index:0;
    opacity:.13;
    display:grid;
    grid-template-columns:repeat(4,1fr);
    grid-template-rows:repeat(6,1fr);
    gap:0;
    overflow:hidden;
  }
  .wm-stamp{
    display:flex;align-items:center;justify-content:center;
  }
  .wm-circle{
    position:relative;width:90px;height:90px;
    transform:rotate(-25deg);
  }
  .wm-circle .r1{position:absolute;inset:0;border:2.5px solid #0033aa;border-radius:50%}
  .wm-circle .r2{position:absolute;inset:6px;border:1.5px dashed #0033aa;border-radius:50%}
  .wm-circle .inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
  .wm-circle .inner img{width:22px;height:22px;border-radius:3px;object-fit:contain}
  .wm-circle .t1{font-size:.42rem;font-weight:900;color:#0033aa;letter-spacing:.5px}
  .wm-circle .t2{font-size:.35rem;color:#0033aa;text-align:center;line-height:1.2;padding:0 4px}
  .sig-stamp{
    display:flex;justify-content:space-between;align-items:flex-end;
    padding:20px 0 10px;border-top:2px solid #dee2e6;margin-top:36px;
    page-break-inside:avoid;break-inside:avoid;
  }
  @media print{
    body{background:#fff}
    .page{margin:0;padding:28px 32px;max-width:100%}
    .watermark-bg{position:fixed;inset:0;opacity:.08}
  }
</style>
</head>
<body onload="window.print()">

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
  </table>

  <!-- Totals + Sig wrapped together to keep on same page if possible -->
  <div style="page-break-inside:avoid;break-inside:avoid">
  <div class="totals-wrap" style="margin-top:0">
    <table style="width:100%;border-collapse:collapse;table-layout:fixed">
      <tbody>
        <tr>
          <td colspan="3" style="padding:8px 12px;text-align:right;font-size:.83rem;color:#6c757d;border-top:2px solid #dee2e6">إجمالي السعر</td>
          <td style="width:22%;padding:8px 12px;font-family:monospace;border-top:2px solid #dee2e6;direction:ltr;text-align:right">${itemsTotal.toFixed(2)}</td>
        </tr>
        ${discountRow}
        ${deliveryRow}
        <tr>
          <td colspan="3" style="padding:8px 12px;text-align:right;font-size:.83rem;color:#6c757d">إجمالي الكميات</td>
          <td style="width:22%;padding:8px 12px;font-family:monospace;direction:ltr;text-align:right">${totalQty}</td>
        </tr>
        <tr class="grand-total">
          <td colspan="3" style="text-align:right;padding:12px">الإجمالي النهائي</td>
          <td>${total.toFixed(2)} JOD</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Sig + Stamp -->
  <div class="sig-stamp">
    <div style="text-align:center">
      <div style="border-bottom:1.5px solid #495057;width:150px;height:40px;margin:0 auto 4px"></div>
      <div style="font-size:.72rem;color:#495057;font-weight:700">توقيع المسؤول</div>
      <div style="font-size:.65rem;color:#adb5bd;margin-top:1px">OFG — عثمان للألعاب</div>
    </div>
    <div style="text-align:center">
      <div style="position:relative;width:90px;height:90px;margin:0 auto">
        <div style="position:absolute;inset:0;border:2.5px solid #0066e6;border-radius:50%;opacity:.8"></div>
        <div style="position:absolute;inset:6px;border:1.5px dashed #0066e6;border-radius:50%;opacity:.4"></div>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px">
          <img src="/assets/icons/icon-192x192.png" style="width:26px;height:26px;border-radius:5px;object-fit:contain" onerror="this.style.display='none'">
          <div style="font-size:.52rem;font-weight:900;color:#0066e6;letter-spacing:.5px">OFG</div>
          <div style="font-size:.44rem;color:#0066e6;text-align:center;line-height:1.2;padding:0 6px">عثمان للألعاب</div>
        </div>
      </div>
      <div style="font-size:.62rem;color:#adb5bd;margin-top:3px">الختم الرسمي</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>شكراً لتسوقكم معنا — OFG عثمان للألعاب</div>
    <div style="margin-top:4px;direction:ltr">#${order.id || invoiceNum}</div>
  </div>

</div>

<!-- Watermark grid -->
<div class="watermark-bg">${Array(24).fill(`
  <div class="wm-stamp">
    <div class="wm-circle">
      <div class="r1"></div>
      <div class="r2"></div>
      <div class="inner">
        <img src="/assets/icons/icon-192x192.png" onerror="this.style.display='none'">
        <div class="t1">OFG</div>
        <div class="t2">عثمان للألعاب</div>
      </div>
    </div>
  </div>`).join('')}
</div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة'); return; }
  win.document.write(html);
  win.document.close();
}
