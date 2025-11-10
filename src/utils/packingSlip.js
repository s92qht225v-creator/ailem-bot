/**
 * Packing Slip Generator
 * Generates printable packing slips for warehouse staff to collect and pack items
 */

/**
 * Generate and print packing slip for a single order
 */
export function printPackingSlip(order) {
  const slipHTML = generatePackingSlipHTML(order);
  const printWindow = window.open('', '_blank', 'width=800,height=600');

  if (!printWindow) {
    alert('Iltimos, pop-up blocker\'ni o\'chiring');
    return;
  }

  printWindow.document.write(slipHTML);
  printWindow.document.close();

  // Wait for content to load before printing
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Generate and print multiple packing slips
 */
export function printMultiplePackingSlips(orders) {
  if (!orders || orders.length === 0) {
    alert('Hech qanday buyurtma tanlanmagan');
    return;
  }

  const allSlips = orders.map((order, index) => {
    const pageBreak = index < orders.length - 1
      ? '<div style="page-break-after: always;"></div>'
      : '';
    return generatePackingSlipHTML(order, false) + pageBreak;
  }).join('');

  const fullHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Packing Slips</title>
      ${getStyles()}
    </head>
    <body>
      ${allSlips}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=800,height=600');

  if (!printWindow) {
    alert('Iltimos, pop-up blocker\'ni o\'chiring');
    return;
  }

  printWindow.document.write(fullHTML);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Generate HTML for a single packing slip
 */
function generatePackingSlipHTML(order, includeDocType = true) {
  const orderDate = new Date(order.created_at).toLocaleDateString('uz-UZ');
  const items = order.items || [];

  // Calculate totals
  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const slip = `
    <div class="packing-slip">
      <div class="header">
        <div class="header-left">
          <h1>YIGISH VARAG'I</h1>
          <p class="subtitle">Packing Slip</p>
        </div>
        <div class="header-right">
          <div class="order-number">#${order.id}</div>
          <div class="order-date">${orderDate}</div>
        </div>
      </div>

      <div class="customer-info">
        <div class="info-label">MIJOZ:</div>
        <div class="info-value">${order.userName || 'N/A'}</div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th class="col-no">№</th>
            <th class="col-product">MAHSULOT</th>
            <th class="col-variant">VARIANT</th>
            <th class="col-quantity">SONI</th>
            <th class="col-check">✓</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, index) => {
            const variantInfo = [];
            if (item.color) variantInfo.push(item.color);
            if (item.size) variantInfo.push(item.size);
            const variant = variantInfo.length > 0 ? variantInfo.join(', ') : '-';

            return `
              <tr>
                <td class="col-no">${index + 1}</td>
                <td class="col-product">${item.productName || item.name || 'N/A'}</td>
                <td class="col-variant">${variant}</td>
                <td class="col-quantity">${item.quantity || 0}</td>
                <td class="col-check"></td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="total-label">JAMI:</td>
            <td class="total-value">${totalItems}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div class="notes-section">
        <div class="notes-title">ESLATMALAR:</div>
        <div class="notes-lines">
          <div class="note-line"></div>
          <div class="note-line"></div>
          <div class="note-line"></div>
        </div>
      </div>

      <div class="footer">
        <div class="signature-section">
          <div class="signature-label">Yig'uvchi:</div>
          <div class="signature-line">_______________________</div>
        </div>
        <div class="signature-section">
          <div class="signature-label">Tekshiruvchi:</div>
          <div class="signature-line">_______________________</div>
        </div>
      </div>
    </div>
  `;

  if (includeDocType) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Packing Slip #${order.id}</title>
        ${getStyles()}
      </head>
      <body>
        ${slip}
      </body>
      </html>
    `;
  }

  return slip;
}

/**
 * Get CSS styles for packing slip
 */
function getStyles() {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      @media print {
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          margin: 0;
          padding: 0;
        }
      }

      @media screen {
        body {
          background: #f0f0f0;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .packing-slip {
          background: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin: 10px;
        }
      }

      .packing-slip {
        font-family: Arial, sans-serif;
        width: 21cm;
        padding: 20mm;
        color: #000;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 3px solid #000;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }

      .header-left h1 {
        font-size: 24pt;
        font-weight: bold;
        margin-bottom: 2px;
      }

      .header-left .subtitle {
        font-size: 10pt;
        color: #666;
      }

      .header-right {
        text-align: right;
      }

      .order-number {
        font-size: 20pt;
        font-weight: bold;
        margin-bottom: 5px;
      }

      .order-date {
        font-size: 10pt;
        color: #666;
      }

      .customer-info {
        background: #f5f5f5;
        padding: 10px 15px;
        margin-bottom: 20px;
        border-left: 4px solid #000;
      }

      .info-label {
        font-size: 9pt;
        font-weight: bold;
        margin-bottom: 3px;
      }

      .info-value {
        font-size: 14pt;
        font-weight: bold;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }

      .items-table thead {
        background: #000;
        color: #fff;
      }

      .items-table th {
        padding: 10px;
        text-align: left;
        font-size: 10pt;
        font-weight: bold;
      }

      .items-table td {
        padding: 12px 10px;
        border-bottom: 1px solid #ddd;
        font-size: 11pt;
      }

      .items-table tbody tr:hover {
        background: #f9f9f9;
      }

      .col-no {
        width: 40px;
        text-align: center;
      }

      .col-product {
        width: auto;
      }

      .col-variant {
        width: 150px;
      }

      .col-quantity {
        width: 80px;
        text-align: center;
        font-weight: bold;
      }

      .col-check {
        width: 60px;
        text-align: center;
        background: #f9f9f9;
      }

      .items-table tfoot {
        background: #f0f0f0;
        font-weight: bold;
      }

      .items-table tfoot td {
        padding: 12px 10px;
        border-bottom: 2px solid #000;
      }

      .total-label {
        text-align: right;
        font-size: 12pt;
      }

      .total-value {
        font-size: 14pt;
        text-align: center;
      }

      .notes-section {
        margin: 30px 0;
        padding: 15px;
        border: 1px solid #ddd;
        background: #fafafa;
      }

      .notes-title {
        font-weight: bold;
        font-size: 10pt;
        margin-bottom: 10px;
      }

      .note-line {
        height: 30px;
        border-bottom: 1px solid #ccc;
        margin-bottom: 5px;
      }

      .footer {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
      }

      .signature-section {
        flex: 1;
        text-align: center;
      }

      .signature-label {
        font-size: 10pt;
        margin-bottom: 30px;
      }

      .signature-line {
        font-size: 10pt;
        color: #999;
      }

      @media print {
        .items-table tbody tr:hover {
          background: none;
        }
      }
    </style>
  `;
}
