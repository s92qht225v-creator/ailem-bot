// Shipping Label Generator
// Creates printable HTML shipping labels for orders

/**
 * Calculate total weight of order items
 */
function calculateOrderWeight(items) {
  if (!items || items.length === 0) return 0;

  const totalWeight = items.reduce((sum, item) => {
    const itemWeight = item.weight || 0.5; // Default 0.5kg if not specified
    return sum + (itemWeight * item.quantity);
  }, 0);

  return totalWeight.toFixed(1);
}

/**
 * Generate and print shipping label for a single order
 */
export function printShippingLabel(order) {
  const labelHTML = generateLabelHTML(order);

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  printWindow.document.write(labelHTML);
  printWindow.document.close();

  // Auto-print after a short delay to ensure rendering
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Generate and print multiple shipping labels
 */
export function printMultipleLabels(orders) {
  if (!orders || orders.length === 0) {
    alert('Hech qanday buyurtma tanlanmagan');
    return;
  }

  const allLabels = orders.map((order, index) => {
    const pageBreak = index < orders.length - 1
      ? '<div style="page-break-after: always;"></div>'
      : '';
    return generateLabelHTML(order, false) + pageBreak;
  }).join('');

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Shipping Labels</title>
      ${getStyles()}
    </head>
    <body>
      ${allLabels}
    </body>
    </html>
  `);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Generate HTML for a single label
 */
function generateLabelHTML(order, includeDocType = true) {
  const deliveryInfo = order.delivery_info || {};
  const weight = calculateOrderWeight(order.items);
  const itemCount = order.items?.length || 0;

  // Get courier name - handle both string and object formats
  let courier = 'N/A';

  // Try delivery_info.courier first
  if (deliveryInfo.courier) {
    if (typeof deliveryInfo.courier === 'string') {
      courier = deliveryInfo.courier;
    } else if (typeof deliveryInfo.courier === 'object' && deliveryInfo.courier.name) {
      courier = deliveryInfo.courier.name;
    }
  }

  // Fallback to top-level order.courier
  if (courier === 'N/A' && order.courier) {
    if (typeof order.courier === 'string') {
      courier = order.courier;
    } else if (typeof order.courier === 'object' && order.courier.name) {
      courier = order.courier.name;
    }
  }

  const orderDate = new Date(order.created_at).toLocaleDateString('uz-UZ');

  // Build address
  let address = deliveryInfo.address || '';
  if (deliveryInfo.district) {
    address += address ? ', ' : '';
    address += deliveryInfo.district + ' tumani';
  }
  if (deliveryInfo.city) {
    address += address ? ', ' : '';
    address += deliveryInfo.city;
  }

  const label = `
    <div class="label">
      <div class="header">
        <div class="header-left">
          <strong>AILEM.UZ</strong><br>
          <span style="font-size: 9pt;">+998 99 123 45 67</span>
        </div>
        <div class="header-right">
          <strong style="font-size: 14pt;">#${order.id}</strong>
        </div>
      </div>

      <div class="section-title">📦 KIMGA (TO):</div>
      <div class="section to-section">
        <div class="recipient-name">${deliveryInfo.fullName || 'N/A'}</div>
        <div class="recipient-phone">${deliveryInfo.phone || 'N/A'}</div>
        <div class="recipient-address">${address || 'Manzil ko\'rsatilmagan'}</div>
      </div>

      <div class="section-title">📤 KIMDAN (FROM):</div>
      <div class="section from-section">
        <strong>AILEM Do'koni</strong><br>
        Sergeli tumani, Toshkent<br>
        +998 99 123 45 67
      </div>

      <div class="section-title">📊 BUYURTMA MA'LUMOTLARI:</div>
      <div class="section info-section">
        <div class="info-row">
          <span class="info-label">Mahsulotlar:</span>
          <span class="info-value">${itemCount} ta</span>
        </div>
        <div class="info-row">
          <span class="info-label">Jami:</span>
          <span class="info-value">${(order.total || 0).toLocaleString('uz-UZ')} UZS</span>
        </div>
        <div class="info-row">
          <span class="info-label">Yetkazish:</span>
          <span class="info-value">${courier}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Og'irligi:</span>
          <span class="info-value">~${weight} kg</span>
        </div>
      </div>

      <div class="order-number">
        BUYURTMA #${order.id}
      </div>
      <div class="order-date">${orderDate}</div>
    </div>
  `;

  if (includeDocType) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Shipping Label #${order.id}</title>
        ${getStyles()}
      </head>
      <body>
        ${label}
      </body>
      </html>
    `;
  }

  return label;
}

/**
 * Get CSS styles for the label
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
          size: 10cm 15cm;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
        }
        .label {
          width: 10cm;
          height: 15cm;
          padding: 5mm;
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
        .label {
          width: 10cm;
          height: 15cm;
          background: white;
          padding: 5mm;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin: 10px;
        }
      }

      .label {
        font-family: Arial, sans-serif;
        font-size: 9pt;
        color: #000;
        display: flex;
        flex-direction: column;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #000;
        padding-bottom: 3mm;
        margin-bottom: 3mm;
      }

      .header-left {
        font-size: 11pt;
      }

      .header-right {
        text-align: right;
      }

      .section-title {
        font-weight: bold;
        font-size: 9pt;
        margin-top: 2mm;
        margin-bottom: 1mm;
      }

      .section {
        border: 2px solid #000;
        padding: 2mm;
        margin-bottom: 2mm;
        font-size: 9pt;
        line-height: 1.3;
      }

      .to-section {
        min-height: 22mm;
      }

      .recipient-name {
        font-size: 11pt;
        font-weight: bold;
        margin-bottom: 1mm;
      }

      .recipient-phone {
        font-size: 10pt;
        font-weight: bold;
        margin-bottom: 2mm;
      }

      .recipient-address {
        font-size: 9pt;
        line-height: 1.4;
      }

      .from-section {
        min-height: 15mm;
        font-size: 9pt;
      }

      .info-section {
        font-size: 9pt;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1mm;
      }

      .info-label {
        font-weight: normal;
      }

      .info-value {
        font-weight: bold;
        text-align: right;
      }

      .order-number {
        font-size: 16pt;
        font-weight: bold;
        text-align: center;
        margin-top: auto;
        padding-top: 3mm;
        border-top: 1px solid #ccc;
      }

      .order-date {
        font-size: 8pt;
        text-align: center;
        margin-top: 1mm;
        color: #666;
      }
    </style>
  `;
}
