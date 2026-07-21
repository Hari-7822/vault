import puppeteer from 'puppeteer';

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return String(dateStr);
  }
}

function formatDateLong(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return String(dateStr);
  }
}

function formatDateShort(date) {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return String(date); }
}

function getDayName(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { weekday: 'long' });
  } catch {
    return '';
  }
}

function formatINR(amount) {
  return Number(amount || 0).toFixed(2);
}

function calcWeightKg(quantity, unit) {
  if (unit === 'kg')    return quantity;
  if (unit === 'gram')  return quantity / 1000;
  if (unit === 'bunch') return null;
  if (unit === 'piece') return quantity * 0.1;
  if (unit === 'dozen') return quantity * 0.5;
  return null;
}

function fmtWeight(kg) {
  if (kg == null) return '—';
  return `${Number(kg).toFixed(2)} kg`;
}

const LOGO_URL =
  'https://res.cloudinary.com/dcz54ylrl/image/upload/v1775150003/dimdot___.jpg_r6vwbz.jpg';

function baseHTML(bodyContent) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#222;background:#fff;}
.page{padding:40px 48px;}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;}
.header-left img{height:56px;margin-bottom:6px;}
.header-left .brand{font-size:20px;font-weight:700;color:#1B5E20;}
.header-left .tagline{font-size:11px;color:#777;}
.header-left .contact{font-size:11px;color:#555;margin-top:4px;line-height:1.6;}
.header-right{text-align:right;}
.header-right .invoice-label{font-size:26px;font-weight:700;color:#1B5E20;letter-spacing:1px;}
.header-right .invoice-meta{font-size:12px;color:#555;margin-top:6px;line-height:1.8;}
.header-right .invoice-meta span{font-weight:600;color:#222;}
.divider{border:none;border-top:2px solid #1B5E20;margin:16px 0;}
.divider-light{border:none;border-top:1px solid #eee;margin:10px 0;}
.order-title{font-size:14px;font-weight:700;color:#1B5E20;margin-bottom:12px;}
table{width:100%;border-collapse:collapse;margin-bottom:0;}
thead tr{background:#1B5E20;color:#fff;}
thead th{padding:8px 10px;text-align:left;font-size:12px;font-weight:600;}
thead th.right{text-align:right;}
thead th.center{text-align:center;}
tbody tr{border-bottom:1px solid #f0f0f0;}
tbody tr:nth-child(even){background:#f9f9f9;}
tbody td{padding:8px 10px;font-size:12px;}
tbody td.right{text-align:right;}
tbody td.center{text-align:center;}
.totals-block{margin-top:12px;display:flex;justify-content:flex-end;}
.totals-table{width:280px;}
.totals-table .row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#444;}
.totals-table .row.subtotal{border-top:1px solid #ddd;margin-top:4px;padding-top:6px;font-weight:600;color:#222;}
.totals-table .row.order-total{border-top:2px solid #1B5E20;margin-top:6px;padding-top:8px;font-weight:700;font-size:14px;color:#1B5E20;}
.grand-summary{margin-top:28px;border:2px solid #1B5E20;border-radius:6px;overflow:hidden;}
.grand-summary-header{background:#1B5E20;color:#fff;padding:10px 16px;font-size:14px;font-weight:700;letter-spacing:0.5px;}
.grand-summary-body{padding:14px 16px;}
.grand-summary-body .row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#333;}
.grand-summary-body .row.grand-total{border-top:2px solid #1B5E20;margin-top:8px;padding-top:10px;font-weight:700;font-size:16px;color:#1B5E20;}
.footer{margin-top:32px;text-align:center;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:12px;}
.footer strong{color:#1B5E20;}
</style>
</head>
<body><div class="page">${bodyContent}</div></body>
</html>`;
}

function headerHTML({ invoiceNo, date, plan }) {
  return `
<div class="header">
  <div class="header-left">
    <img src="${LOGO_URL}" onerror="this.style.display='none'" />
    <div class="brand">dimdot</div>
    <div class="tagline">dimdot.com &nbsp;|&nbsp; dimdot9@gmail.com &nbsp;|&nbsp; +91 9344430899</div>
  </div>
  <div class="header-right">
    <div class="invoice-label">INVOICE</div>
    <div class="invoice-meta">
      Invoice No: <span>${invoiceNo || '—'}</span><br/>
      Date: <span>${date ? formatDateLong(date) : '—'}</span><br/>
      Plan: <span>${plan || 'Subscription'}</span>
    </div>
  </div>
</div>
<hr class="divider"/>`;
}

function orderTableHTML(items) {
  const rows = items.map((i) => `
<tr>
  <td>${i.name}</td>
  <td>${i.quantity}</td>
  <td>${i.unit}</td>
  <td class="right">${formatINR(i.price)}</td>
  <td class="right">${formatINR(Number(i.price) * Number(i.quantity))}</td>
</tr>`).join('');

  return `
<table>
  <thead>
    <tr>
      <th>ITEM DESCRIPTION</th>
      <th>QTY</th>
      <th>UNIT</th>
      <th class="right">PRICE (&#8377;)</th>
      <th class="right">TOTAL (&#8377;)</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function orderTotalsHTML({ subtotal, deliveryFee, platformFee, packagingFee, shippingFee, total, label }) {
  return `
<div class="totals-block">
  <div class="totals-table">
    <div class="row subtotal"><span>Vegetable Subtotal</span><span>${formatINR(subtotal)}</span></div>
    <div class="row"><span>Platform Fee</span><span>${formatINR(platformFee)}</span></div>
    <div class="row"><span>Packaging Fee (White Jute/Biodegradable)</span><span>${formatINR(packagingFee)}</span></div>
    <div class="row"><span>Delivery Fee</span><span>${formatINR(deliveryFee)}</span></div>
    <div class="row"><span>Shipping Fee</span><span>${formatINR(shippingFee)}</span></div>
    <div class="row order-total"><span>${label}</span><span>${formatINR(total)}</span></div>
  </div>
</div>`;
}

function groupByDate(items) {
  return items.reduce((acc, item) => {
    const d = item.deliveryDate;
    if (!acc[d]) acc[d] = [];
    acc[d].push(item);
    return acc;
  }, {});
}

function buildInvoiceHTML({
  paymentId, date, plan, items = [],
  subtotal, deliveryFee = 0, platformFee = 0,
  packagingFee = 0, shippingFee = 0, total,
}) {
  const table  = orderTableHTML(items);
  const totals = orderTotalsHTML({ subtotal, deliveryFee, platformFee, packagingFee, shippingFee, total, label: 'Order Total' });

  return baseHTML(`
${headerHTML({ invoiceNo: paymentId, date, plan })}
${table}
${totals}
<div class="footer">Thank you for your subscription.<br/><strong>dimdot</strong> - bridging the gap between farms and households.</div>
`);
}

function buildWeeklySummaryHTML({
  dateRange, invoiceNo, date, plan,
  items = [],
  deliveryFee = 0, platformFee = 0,
  packagingFee = 0, shippingFee = 0,
  totalAmount,
}) {
  const grouped    = groupByDate(items);
  const sortedDates = Object.keys(grouped).sort();
  const numDays    = sortedDates.length || 1;

  const feePerDay = {
    delivery:  deliveryFee  / numDays,
    platform:  platformFee  / numDays,
    packaging: packagingFee / numDays,
    shipping:  shippingFee  / numDays,
  };

  let combinedVegetableTotal = 0;

  const ordersHTML = sortedDates.map((dateKey, idx) => {
    const dayItems   = grouped[dateKey];
    const daySubtotal = dayItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
    combinedVegetableTotal += daySubtotal;

    const dayTotal =
      daySubtotal +
      feePerDay.delivery + feePerDay.platform +
      feePerDay.packaging + feePerDay.shipping;

    const orderNum = idx + 1;
    const label    = `Order ${orderNum}: ${getDayName(dateKey)} Delivery`;

    return `
<div class="order-title">${label}</div>
${orderTableHTML(dayItems)}
${orderTotalsHTML({
  subtotal:    daySubtotal,
  deliveryFee: feePerDay.delivery,
  platformFee: feePerDay.platform,
  packagingFee: feePerDay.packaging,
  shippingFee: feePerDay.shipping,
  total:       dayTotal,
  label:       `Order ${orderNum} Total`,
})}
${idx < sortedDates.length - 1 ? '<hr class="divider" style="margin-top:24px;"/>' : ''}`;
  }).join('');

  const grandHTML = `
<div class="grand-summary">
  <div class="grand-summary-header">WEEKLY COMBINED SUMMARY</div>
  <div class="grand-summary-body">
    <div class="row"><span>Combined Vegetable Total</span><span>${formatINR(combinedVegetableTotal)}</span></div>
    <div class="row"><span>Combined Platform Fees</span><span>${formatINR(platformFee)}</span></div>
    <div class="row"><span>Combined Packaging Fees</span><span>${formatINR(packagingFee)}</span></div>
    <div class="row"><span>Combined Delivery Fees</span><span>${formatINR(deliveryFee)}</span></div>
    <div class="row"><span>Combined Shipping Fees</span><span>${formatINR(shippingFee)}</span></div>
    <div class="row grand-total"><span>GRAND TOTAL (&#8377;)</span><span>${formatINR(totalAmount)}</span></div>
  </div>
</div>`;

  return baseHTML(`
${headerHTML({ invoiceNo, date, plan })}
${ordersHTML}
${grandHTML}
<div class="footer">Thank you for your subscription.<br/><strong>dimdot</strong> - bridging the gap between farms and households.</div>
`);
}

function buildDailyRequirementsHTML({ date, items = [] }) {
  const dateLabel = formatDateShort(date);
  let grandWeight = 0;
  let grandQty    = 0;

  const rows = items.map(item => {
    const wKg = calcWeightKg(Number(item.quantity), item.unit);
    if (wKg != null) grandWeight += wKg;
    grandQty += Number(item.quantity);
    return `
<tr>
  <td>${item.name} (${item.unit})</td>
  <td class="center">${item.quantity}</td>
  <td class="center">${fmtWeight(wKg)}</td>
</tr>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#222;background:#fff;}
.page{padding:48px 52px;}
.top{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px;}
h1{font-size:26px;font-weight:800;color:#222;}
.date{font-size:13px;color:#555;}
hr{border:none;border-top:2px solid #222;margin:10px 0 22px;}
table{width:100%;border-collapse:collapse;}
thead tr{background:#009688;color:#fff;}
thead th{padding:10px 14px;text-align:left;font-size:12px;font-weight:600;}
thead th.center{text-align:center;}
tbody tr{border-bottom:1px solid #eee;}
tbody tr:nth-child(even){background:#fafafa;}
tbody td{padding:9px 14px;font-size:12px;}
tbody td.center{text-align:center;}
.total-row td{font-weight:700;background:#f0f0f0;border-top:2px solid #ccc;}
.grand-box{margin-top:18px;background:#e0f2f1;border-radius:6px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;}
.grand-box .label{font-size:13px;font-weight:700;color:#004D40;}
.grand-box .value{font-size:13px;font-weight:700;color:#004D40;}
</style>
</head>
<body>
<div class="page">
  <div class="top">
    <h1>Daily Requirements</h1>
    <span class="date">${dateLabel}</span>
  </div>
  <hr/>
  <table>
    <thead>
      <tr>
        <th>Vegetable (Unit)</th>
        <th class="center">Total Qty</th>
        <th class="center">Total Weight</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td>TOTAL</td>
        <td class="center">${grandQty}</td>
        <td class="center">${fmtWeight(grandWeight)}</td>
      </tr>
    </tbody>
  </table>
  <div class="grand-box">
    <span class="label">Grand Total Weight</span>
    <span class="value">${fmtWeight(grandWeight)}</span>
  </div>
</div>
</body>
</html>`;
}

function buildDeliveryListHTML({ date, deliveries = [] }) {
  const dateLabel = formatDateShort(date);

  const sections = deliveries.map(d => {
    let personWeight = 0;

    const rows = d.items.map(item => {
      const wKg = calcWeightKg(Number(item.quantity), item.unit);
      if (wKg != null) personWeight += wKg;
      const qtyLabel = item.unit === 'bunch'
        ? `${item.quantity} bunch`
        : `${item.quantity} ${item.unit}`;

      return `
<tr>
  <td style="padding-left:16px;">${item.name}</td>
  <td>${item.type || 'Order'}</td>
  <td>${qtyLabel}</td>
  <td>${fmtWeight(wKg)}</td>
</tr>`;
    }).join('');

    const addr = [
      d.address?.flatNo,
      d.address?.apartmentName,
      d.address?.street,
      d.address?.city,
      d.address?.state,
      d.address?.zipCode,
    ].filter(Boolean).join(', ');

    return `
<div class="customer-block">
  <div class="customer-header">
    <div class="customer-info">
      <span class="name">${d.customerName}</span>
      <span class="phone">&#128241; ${d.phone || '—'}</span>
      <div class="address">${addr || '—'}</div>
    </div>
    <div class="weight-badge">Weight: ${fmtWeight(personWeight)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Type</th>
        <th>Qty</th>
        <th>Weight</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;color:#222;background:#fff;}
.page{padding:48px 52px;}
.top{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px;}
h1{font-size:26px;font-weight:800;color:#222;}
.date{font-size:13px;color:#555;}
hr{border:none;border-top:2px solid #222;margin:10px 0 28px;}
.section-title{font-size:16px;font-weight:600;color:#222;margin-bottom:20px;}
.customer-block{margin-bottom:32px;}
.customer-header{display:flex;justify-content:space-between;align-items:flex-start;background:#f5f5f5;padding:10px 14px;border-radius:4px 4px 0 0;border:1px solid #e0e0e0;border-bottom:none;}
.customer-info .name{font-weight:700;font-size:13px;margin-right:10px;}
.customer-info .phone{font-size:12px;color:#555;}
.customer-info .address{font-size:11px;color:#777;margin-top:3px;}
.weight-badge{font-size:12px;font-weight:700;color:#009688;white-space:nowrap;}
table{width:100%;border-collapse:collapse;border:1px solid #e0e0e0;}
thead tr{background:#fff;}
thead th{padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#555;border-bottom:1px solid #ddd;}
tbody tr{border-bottom:1px solid #f0f0f0;}
tbody td{padding:7px 12px;font-size:12px;}
</style>
</head>
<body>
<div class="page">
  <div class="top">
    <h1>Per Person Delivery List</h1>
    <span class="date">${dateLabel}</span>
  </div>
  <hr/>
  <div class="section-title">Delivery &amp; Packing List</div>
  ${sections}
</div>
</body>
</html>`;
}

async function generatePDF(html) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-client-side-phishing-detection',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--no-first-run',
    ],
  });

  try {
    const page = await browser.newPage();
    const ALLOWED_HOSTS = ['res.cloudinary.com'];

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.url().startsWith('http')) {
        const allowed = ALLOWED_HOSTS.some((host) => req.url().includes(host));
        allowed ? req.continue() : req.abort();
      } else {
        req.continue();
      }
    });

    await page.setCacheEnabled(false);
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return pdf;
  } finally {
    await browser.close();
  }
}

export async function generateInvoicePDF(data) {
  return generatePDF(buildInvoiceHTML(data));
}

export async function generateWeeklySummaryPDF(data) {
  return generatePDF(buildWeeklySummaryHTML(data));
}

export async function generateDailyRequirementsPDF(data) {
  return generatePDF(buildDailyRequirementsHTML(data));
}

export async function generateDeliveryListPDF(data) {
  return generatePDF(buildDeliveryListHTML(data));
}