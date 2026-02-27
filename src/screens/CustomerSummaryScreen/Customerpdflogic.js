export function generateCustomerSummaryPDF({
  summaryRows,
  dailyTotals,
  totalRow,
  selectedMonth,
  selectedYear,
  months,
  companyName = ''
}) {
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const rowsPerPage = 90;
  const pages = splitRowsIntoPages(summaryRows, rowsPerPage);

  // 👇 formatter to clean up .00
  function formatNum(num) {
    return parseFloat(num.toFixed(2));
  }

  const tableHeader = `
    <colgroup>
      <col style="width: 60px;">
      <col style="width: 30px;">
      ${Array.from({ length: daysInMonth }, () => '<col style="width: 20px;">').join('')}
      <col style="width: 50px;">
      <col style="width: 50px;">
      <col style="width: 50px;">
      <col style="width: 50px;">
      <col style="width: 50px;">
      <col style="width: 50px;">
    </colgroup>
    <tr>
      <th>Name</th><th>Price</th>
      ${Array.from({ length: daysInMonth }, (_, i) => `<th>${i + 1}</th>`).join('')}
      <th>Total</th><th>Amount</th><th>Advance</th><th>Pending</th><th>Paid</th><th>Due</th>
    </tr>
  `;

  let html = `
  <html>
    <head>
      <style>
        @page {
          size: A4 portrait;
          margin: 1mm 1mm;
        }
        body {
          font-family: Arial;
          margin: 0;
          padding: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7px;
          table-layout: fixed;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 0.1px;
          text-align: center;
          word-wrap: break-word;
        }
        .total-row {
          background: #eef5ff;
          font-weight: bold;
        }
        .page-break {
          page-break-after: always;
        }
        .page-container {
          padding: 0;
          margin: 0;
        }
        .page-container + .page-container {
          margin-top: 20px;
        }
        h2 {
          font-size: 18px;
          text-align: center;
          margin: 10px 0 20px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h2>${companyName ? companyName + ' – ' : ''} Monthly Summary - ${months[selectedMonth - 1]} ${selectedYear}</h2>
  `;

  pages.forEach((rows, pageIndex) => {
    html += `
      <div class="page-container">
        <table>
          ${tableHeader}
          ${rows.map(r => `
            <tr>
              <td>${r.name}</td>
              <td>${formatNum(r.milkPrice)}</td>
              ${Array.from({ length: daysInMonth }, (_, i) => `<td>${formatNum(r.dateLiters[i] || 0)}</td>`).join('')}
              <td>${formatNum(r.totalLiters)}</td>
              <td>${formatNum(r.totalAmount)}</td>
              <td>${formatNum(r.advance)}</td>
              <td>${formatNum(r.pending)}</td>
              <td>${formatNum(r.paidAmount)}</td>
              <td>${formatNum(r.due)}</td>
            </tr>
          `).join('')}
          ${
            pageIndex === pages.length - 1
              ? `<tr class="total-row">
                   <td colspan="2">Total</td>
                  ${Array.from({ length: daysInMonth }, (_, i) => `<td>${formatNum(dailyTotals[i] || 0)}</td>`).join('')}
                  <td>${formatNum(totalRow.totalLiters)}</td>
                  <td>${formatNum(totalRow.totalAmount)}</td>
                  <td>${formatNum(totalRow.totalAdvance)}</td>
                  <td>${formatNum(totalRow.totalPending)}</td>
                  <td>${formatNum(totalRow.totalPaid || 0)}</td>
                  <td>${formatNum(totalRow.totalDue)}</td>
                </tr>`
              : ''
          }
        </table>
      </div>
    `;
    if (pageIndex !== pages.length - 1) {
      html += `<div class="page-break"></div>`;
    }
  });

  html += `
    </body>
  </html>
  `;

  return html;
}

function splitRowsIntoPages(rows, rowsPerPage = 90) {
  const pages = [];
  for (let i = 0; i < rows.length; i += rowsPerPage) {
    pages.push(rows.slice(i, i + rowsPerPage));
  }
  return pages;
}


  export function generateCustomerInvoicePDF({
  summary,
  companyName = '',
  selectedMonth,
  selectedYear,
  months
}) {
  const name = summary.name || 'Mx.';
  const monthName = months[selectedMonth - 1] || 'Month';
  const liters = Number(summary.totalLiters) || 0;
  const rate = Number(summary.milkPrice) || 0;
  const pending = Number(summary.pending) || 0;
  const advance = Number(summary.advance) || 0;
  const paid = Number(summary.paidAmount) || 0;

  const milkAmount = liters * rate;
  const grossAmount = milkAmount + pending;
  const finalAmount = grossAmount - advance;
  const due = Math.max(0, finalAmount - paid);
  const overpaid = Math.max(0, paid - finalAmount);

  return `
  <html><head><style>
    body { font-family:Georgia,serif; margin:40px; }
    h2 { font-size:36px; text-align:center; }
    .meta { display:flex; justify-content:space-between; margin-bottom:20px; }
    table { width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px; }
    th,td { border:1px solid #000; padding:10px; text-align:center; }
    .footer-note { font-size:16px; margin-top:20px; font-weight:bold; }
  </style></head><body>
    <h2>${companyName || 'MiniiMilkApp'}</h2>
    <div class="meta">
      <div><strong>Mx.:</strong> ${name}</div>
      <div><strong>Month:</strong> ${monthName} ${selectedYear}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Particulars</th>
          <th>Qty / Unit</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Milk</td>
          <td>${liters.toFixed(2)} Ltrs</td>
          <td>₹${rate.toFixed(2)}</td>
          <td>₹${milkAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td>+ Pending</td>
          <td>-</td>
          <td>-</td>
          <td>₹${pending.toFixed(2)}</td>
        </tr>
        <tr>
          <td>– Advance</td>
          <td>-</td>
          <td>-</td>
          <td>₹${advance.toFixed(2)}</td>
        </tr>
        <tr>
          <td>– Paid</td>
          <td>-</td>
          <td>-</td>
          <td>₹${paid.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>+ Due</strong></td>
          <td>-</td>
          <td>-</td>
          <td><strong>₹${due.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="footer-note">
      ${
        overpaid > 0
          ? `💼 Advance Available: ₹${overpaid.toFixed(2)} will be adjusted in the next billing.`
          : due === 0
          ? '✅ You have paid in full. THANK YOU '
          : `💰 Net Amount to Pay: ₹${due.toFixed(2)}`
      }
    </div>
  </body></html>
  `;
}
