# POS & Warehouse Management System Architecture

## Overview

This document outlines the architecture for a **Point of Sale (POS)** and **Warehouse Management** system that integrates with the Ailem Telegram e-commerce bot. Both systems share a single Supabase database for real-time inventory synchronization.

---

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase PostgreSQL                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Products │ Orders │ Users │ Variants │ Stock History    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────┬──────────────────────┬──────────────────────┬─────────┘
         │                      │                      │
    ┌────▼────┐         ┌──────▼──────┐      ┌───────▼────────┐
    │ Ailem   │         │   POS App   │      │  Warehouse App │
    │ Telegram│         │  (Retail)   │      │   (Inventory)  │
    │   Bot   │         │             │      │                │
    └─────────┘         └─────────────┘      └────────────────┘
       Online               In-Store            Stock Management
     Customers              Customers           & Receiving
```

---

## 1. Database Schema Updates

### 1.1 Add Barcode Support to Products

```sql
-- Migration: Add barcode and SKU fields
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS barcode_type TEXT DEFAULT 'EAN-13'; -- EAN-13, UPC, QR, etc.

-- Index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Barcode format validation
ALTER TABLE products 
ADD CONSTRAINT barcode_format CHECK (
  barcode_type IN ('EAN-13', 'UPC-A', 'CODE-128', 'QR', 'EAN-8')
);

COMMENT ON COLUMN products.barcode IS 'Product barcode for scanning (EAN-13, UPC, etc.)';
COMMENT ON COLUMN products.sku IS 'Stock Keeping Unit - unique product identifier';
COMMENT ON COLUMN products.barcode_type IS 'Barcode format type';
```

### 1.2 Update Variants JSONB Structure

```sql
-- Variants now include per-variant barcodes
-- Structure: [
--   {
--     color: "Oq",
--     size: "100x200", 
--     stock: 10,
--     barcode: "8600123456789",
--     sku: "BED-WHITE-100X200",
--     image: "url"
--   }
-- ]
```

### 1.3 Create POS-Specific Tables

```sql
-- ============================================
-- POS Transactions Table
-- ============================================
CREATE TABLE pos_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number TEXT UNIQUE NOT NULL,
  cashier_id UUID REFERENCES users(id),
  customer_id UUID REFERENCES users(id), -- Optional (for loyalty programs)
  
  -- Items & Pricing
  items JSONB NOT NULL, -- Cart snapshot
  subtotal NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  
  -- Payment
  payment_method TEXT NOT NULL, -- 'cash', 'card', 'payme', 'click', 'split'
  payment_details JSONB, -- Card last 4 digits, transaction IDs, etc.
  amount_paid NUMERIC(10, 2) NOT NULL,
  change_given NUMERIC(10, 2) DEFAULT 0,
  
  -- Receipt
  receipt_printed BOOLEAN DEFAULT false,
  receipt_url TEXT,
  
  -- Metadata
  store_location TEXT,
  pos_device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_payment_method CHECK (
    payment_method IN ('cash', 'card', 'payme', 'click', 'split', 'bonus')
  ),
  CONSTRAINT valid_total CHECK (total >= 0)
);

-- Index for fast transaction lookups
CREATE INDEX idx_pos_transactions_number ON pos_transactions(transaction_number);
CREATE INDEX idx_pos_transactions_cashier ON pos_transactions(cashier_id);
CREATE INDEX idx_pos_transactions_created ON pos_transactions(created_at DESC);

-- ============================================
-- Stock Movement History
-- ============================================
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_color TEXT,
  variant_size TEXT,
  
  -- Movement details
  movement_type TEXT NOT NULL, -- 'sale', 'return', 'restock', 'adjustment', 'damage', 'transfer'
  quantity INTEGER NOT NULL, -- Negative for decreases, positive for increases
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  
  -- Source/Destination
  source TEXT, -- 'pos', 'telegram', 'warehouse', 'supplier', 'manual'
  reference_id UUID, -- Order ID, POS transaction ID, etc.
  
  -- User & metadata
  user_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_movement_type CHECK (
    movement_type IN ('sale', 'return', 'restock', 'adjustment', 'damage', 'transfer')
  )
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);

-- ============================================
-- Purchase Orders (for receiving stock)
-- ============================================
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT UNIQUE NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_contact TEXT,
  
  -- Items
  items JSONB NOT NULL, -- [{product_id, quantity, unit_cost}]
  total_cost NUMERIC(10, 2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'received', 'partial', 'cancelled'
  ordered_date DATE NOT NULL,
  expected_date DATE,
  received_date DATE,
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES users(id),
  received_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_po_status CHECK (
    status IN ('pending', 'received', 'partial', 'cancelled')
  )
);

CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_name);
```

---

## 2. POS Application Structure

### 2.1 Technology Stack

```
Frontend: React 18 + Vite
UI: Tailwind CSS (same as Ailem bot)
Database: Supabase (shared with Telegram bot)
Barcode: html5-qrcode + react-barcode-reader
Printing: react-to-print
State: React Context API
```

### 2.2 Project Structure

```
ailem-pos/
├── public/
│   └── sounds/
│       ├── beep.mp3           # Successful scan
│       └── error.mp3          # Scan error
├── src/
│   ├── assets/
│   │   └── logo.png
│   ├── components/
│   │   ├── barcode/
│   │   │   ├── BarcodeScanner.jsx      # Camera/USB scanner
│   │   │   ├── BarcodeInput.jsx        # Manual barcode entry
│   │   │   └── BarcodeGenerator.jsx    # Generate barcode images
│   │   ├── cart/
│   │   │   ├── CartItem.jsx            # Individual cart item
│   │   │   ├── CartSummary.jsx         # Totals display
│   │   │   └── QuickActions.jsx        # Clear, hold, recall
│   │   ├── checkout/
│   │   │   ├── PaymentModal.jsx        # Payment processing
│   │   │   ├── PaymentMethods.jsx      # Cash, card, split
│   │   │   ├── CustomerDisplay.jsx     # Customer-facing screen
│   │   │   └── ReceiptPreview.jsx      # Print preview
│   │   ├── products/
│   │   │   ├── ProductSearch.jsx       # Search by name
│   │   │   ├── ProductGrid.jsx         # Browse products
│   │   │   └── QuickCategories.jsx     # Fast category access
│   │   ├── keyboard/
│   │   │   ├── NumericKeypad.jsx       # Quantity/price entry
│   │   │   └── Shortcuts.jsx           # F-key shortcuts
│   │   └── common/
│   │       ├── Header.jsx              # POS header with cashier info
│   │       ├── StatusBar.jsx           # Connection, time, device
│   │       └── Modal.jsx               # Reusable modal
│   ├── context/
│   │   ├── POSContext.jsx              # Cart, transactions
│   │   ├── ProductsContext.jsx         # Product data (shared with bot)
│   │   ├── CashierContext.jsx          # Current cashier session
│   │   └── OfflineContext.jsx          # Offline queue management
│   ├── services/
│   │   ├── api.js                      # Supabase API (shared with bot)
│   │   ├── barcode.js                  # Barcode scanning logic
│   │   ├── payment.js                  # Payment processing
│   │   ├── receipt.js                  # Receipt generation
│   │   ├── offline.js                  # Offline sync queue
│   │   └── printer.js                  # Printer communication
│   ├── utils/
│   │   ├── calculations.js             # Tax, discount, change
│   │   ├── shortcuts.js                # Keyboard shortcuts
│   │   ├── sound.js                    # Audio feedback
│   │   └── validation.js               # Input validation
│   ├── hooks/
│   │   ├── useBarcode.js               # Barcode scanner hook
│   │   ├── useKeyboard.js              # Keyboard shortcuts
│   │   └── useRealtimeStock.js         # Supabase realtime subscription
│   ├── pages/
│   │   ├── SalePage.jsx                # Main POS screen
│   │   ├── TransactionHistory.jsx      # Past transactions
│   │   ├── EndOfDay.jsx                # Cash drawer reconciliation
│   │   ├── Returns.jsx                 # Return/refund processing
│   │   └── Reports.jsx                 # Sales reports
│   ├── App.jsx
│   ├── main.jsx
│   └── supabase.js                     # Same Supabase client
├── package.json
├── vite.config.js
└── README.md
```

### 2.3 Key Components

#### Main POS Screen Layout

```
┌────────────────────────────────────────────────────────────┐
│  AILEM POS  │  Cashier: Ali  │  Register: 001  │  12:30 PM │
├──────────────────────────────┬─────────────────────────────┤
│  Product Search / Scan       │  CART (3 items)             │
│  [___________________] 🔍    │                             │
│                              │  Bedsheet White 100x200     │
│  Quick Categories:           │  500,000 UZS × 2            │
│  [Bedsheets] [Pillows]       │                      1,000,000│
│  [Curtains]  [Towels]        │                             │
│                              │  Pillow Premium Cotton      │
│  Recent/Popular:             │  150,000 UZS × 1            │
│  • Premium Cotton Bedsheet   │                        150,000│
│  • Luxury Pillow Set         │                             │
│  • Blackout Curtain          │  Towel Set Blue             │
│                              │  200,000 UZS × 1            │
│  [F1] New Sale               │                        200,000│
│  [F2] Product Search         │  ─────────────────────────  │
│  [F3] Customer Info          │  Subtotal:        1,350,000  │
│  [F4] Hold Transaction       │  Discount:                0  │
│  [F5] Recall Transaction     │  Tax (0%):                0  │
│                              │  ─────────────────────────  │
│                              │  TOTAL:           1,350,000  │
│                              │                             │
│                              │  [Checkout] [Clear] [Hold]  │
└──────────────────────────────┴─────────────────────────────┘
```

#### Payment Modal

```
┌─────────────────────────────────────────┐
│  💳 Payment                             │
│  ─────────────────────────────────────  │
│  Total: 1,350,000 UZS                   │
│                                         │
│  Select Payment Method:                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │  💵     │  │  💳     │  │ Payme   ││
│  │  Cash   │  │  Card   │  │         ││
│  └─────────┘  └─────────┘  └─────────┘│
│  ┌─────────┐  ┌─────────┐              │
│  │ Click   │  │  Split  │              │
│  │         │  │ Payment │              │
│  └─────────┘  └─────────┘              │
│                                         │
│  [Cancel]                   [Confirm]   │
└─────────────────────────────────────────┘
```

---

## 3. Warehouse Application Structure

### 3.1 Technology Stack

```
Frontend: React 18 + Vite (can reuse POS codebase)
UI: Tailwind CSS
Database: Supabase (shared)
Barcode: html5-qrcode (for stock counting)
Mobile: Can be Progressive Web App (PWA) or React Native
```

### 3.2 Project Structure

```
ailem-warehouse/
├── src/
│   ├── components/
│   │   ├── inventory/
│   │   │   ├── StockList.jsx           # All products with stock levels
│   │   │   ├── StockAdjustment.jsx     # Adjust stock manually
│   │   │   ├── LowStockAlerts.jsx      # Products below threshold
│   │   │   └── StockHistory.jsx        # Movement history
│   │   ├── receiving/
│   │   │   ├── PurchaseOrderList.jsx   # List of POs
│   │   │   ├── ReceiveStock.jsx        # Scan items as they arrive
│   │   │   ├── PODetails.jsx           # PO details
│   │   │   └── ReceiptConfirmation.jsx # Confirm receipt
│   │   ├── counting/
│   │   │   ├── StockCount.jsx          # Physical count
│   │   │   ├── CountSession.jsx        # Active counting session
│   │   │   └── VarianceReport.jsx      # Expected vs actual
│   │   ├── barcode/
│   │   │   ├── BarcodeScanner.jsx      # Scan for counting
│   │   │   ├── BarcodeGenerator.jsx    # Generate new barcodes
│   │   │   └── BarcodePrint.jsx        # Print labels
│   │   └── reports/
│   │       ├── StockReport.jsx         # Current stock levels
│   │       ├── MovementReport.jsx      # Stock movements
│   │       └── ValuationReport.jsx     # Inventory value
│   ├── pages/
│   │   ├── Dashboard.jsx               # Warehouse overview
│   │   ├── InventoryPage.jsx           # Stock management
│   │   ├── ReceivingPage.jsx           # Receive stock
│   │   ├── CountingPage.jsx            # Stock counting
│   │   ├── BarcodeManagement.jsx       # Barcode generation
│   │   └── ReportsPage.jsx             # Analytics
│   ├── context/
│   │   ├── InventoryContext.jsx        # Stock data
│   │   ├── ReceivingContext.jsx        # POs and receiving
│   │   └── CountingContext.jsx         # Active count sessions
│   ├── services/
│   │   ├── api.js                      # Supabase API (shared)
│   │   ├── inventory.js                # Stock operations
│   │   ├── receiving.js                # PO management
│   │   └── barcode.js                  # Barcode operations
│   └── utils/
│       ├── stockCalculations.js        # Stock value, turnover
│       └── exports.js                  # CSV/Excel export
└── package.json
```

### 3.3 Key Features

#### Stock Receiving Workflow

```
1. Create Purchase Order in system
2. Receive notification when supplier delivers
3. Open "Receive Stock" screen
4. Scan each item barcode (or manual entry)
5. Enter quantity received
6. System updates stock automatically
7. Mark PO as complete/partial
8. Stock now available in POS and Telegram bot
```

#### Stock Counting Workflow

```
1. Start new count session
2. Select products to count (all or by category)
3. Scan barcodes and enter counted quantity
4. System compares counted vs system stock
5. Generate variance report
6. Approve adjustments → update stock
7. Log discrepancies for investigation
```

---

## 4. Shared Services & APIs

### 4.1 Supabase API Service (Shared Across All Apps)

```javascript
// src/services/inventoryAPI.js

export const inventoryAPI = {
  // Get product by barcode
  async getByBarcode(barcode) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update stock (with history tracking)
  async updateStock(productId, newStock, movementData) {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', productId)
      .single();
    
    if (fetchError) throw fetchError;

    // Update stock
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId);
    
    if (updateError) throw updateError;

    // Log movement
    await supabase.from('stock_movements').insert([{
      product_id: productId,
      movement_type: movementData.type,
      quantity: newStock - product.stock,
      previous_stock: product.stock,
      new_stock: newStock,
      source: movementData.source,
      reference_id: movementData.referenceId,
      user_id: movementData.userId,
      notes: movementData.notes
    }]);

    return newStock;
  },

  // Update variant stock
  async updateVariantStock(productId, color, size, newStock, movementData) {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('variants')
      .eq('id', productId)
      .single();
    
    if (fetchError) throw fetchError;

    const variants = product.variants || [];
    const variantIndex = variants.findIndex(v => 
      v.color === color && v.size === size
    );

    if (variantIndex === -1) throw new Error('Variant not found');

    const previousStock = variants[variantIndex].stock;
    variants[variantIndex].stock = newStock;

    // Update variants
    const { error: updateError } = await supabase
      .from('products')
      .update({ variants })
      .eq('id', productId);
    
    if (updateError) throw updateError;

    // Log movement
    await supabase.from('stock_movements').insert([{
      product_id: productId,
      variant_color: color,
      variant_size: size,
      movement_type: movementData.type,
      quantity: newStock - previousStock,
      previous_stock: previousStock,
      new_stock: newStock,
      source: movementData.source,
      reference_id: movementData.referenceId,
      user_id: movementData.userId
    }]);

    return newStock;
  },

  // Get stock movements history
  async getStockHistory(productId, limit = 50) {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // Get low stock products
  async getLowStockProducts(threshold = 10) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .lte('stock', threshold)
      .gt('stock', 0)
      .order('stock', { ascending: true });
    
    if (error) throw error;
    return data;
  }
};

// POS Transaction API
export const posAPI = {
  async createTransaction(transactionData) {
    // Generate transaction number
    const transactionNumber = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { data, error } = await supabase
      .from('pos_transactions')
      .insert([{
        transaction_number: transactionNumber,
        ...transactionData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;

    // Update stock for each item
    for (const item of transactionData.items) {
      if (item.variantColor && item.variantSize) {
        await inventoryAPI.updateVariantStock(
          item.productId,
          item.variantColor,
          item.variantSize,
          item.previousStock - item.quantity,
          {
            type: 'sale',
            source: 'pos',
            referenceId: data.id,
            userId: transactionData.cashier_id
          }
        );
      } else {
        await inventoryAPI.updateStock(
          item.productId,
          item.previousStock - item.quantity,
          {
            type: 'sale',
            source: 'pos',
            referenceId: data.id,
            userId: transactionData.cashier_id
          }
        );
      }
    }

    return data;
  },

  async getTransactions(filters = {}) {
    let query = supabase
      .from('pos_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.cashierId) {
      query = query.eq('cashier_id', filters.cashierId);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};

// Purchase Order API
export const purchaseOrderAPI = {
  async create(poData) {
    const poNumber = `PO-${Date.now()}`;
    
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([{
        po_number: poNumber,
        ...poData,
        ordered_date: new Date().toISOString().split('T')[0]
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async receive(poId, receivedItems, userId) {
    // Update stock for received items
    for (const item of receivedItems) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.productId)
        .single();
      
      await inventoryAPI.updateStock(
        item.productId,
        product.stock + item.quantityReceived,
        {
          type: 'restock',
          source: 'supplier',
          referenceId: poId,
          userId: userId,
          notes: `PO received: ${item.quantityReceived} units`
        }
      );
    }

    // Update PO status
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'received',
        received_date: new Date().toISOString().split('T')[0],
        received_by: userId
      })
      .eq('id', poId);
    
    if (error) throw error;
  }
};
```

---

## 5. Real-Time Stock Synchronization

### 5.1 Supabase Realtime Integration

```javascript
// src/hooks/useRealtimeStock.js

import { useEffect } from 'react';
import { supabase } from '../supabase';

export const useRealtimeStock = (onStockUpdate) => {
  useEffect(() => {
    // Subscribe to product updates
    const subscription = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Stock updated:', payload.new);
          onStockUpdate(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [onStockUpdate]);
};

// Usage in POS or Warehouse app:
// useRealtimeStock((updatedProduct) => {
//   // Update local state with new stock
//   setProducts(prev => 
//     prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
//   );
// });
```

### 5.2 Synchronization Flow

```
Customer buys in Telegram Bot:
1. Order approved in AdminContext
2. Stock updated in Supabase products table
3. Supabase broadcasts UPDATE event
4. POS/Warehouse apps receive real-time update
5. UI refreshes with new stock levels

Cashier sells in POS:
1. Transaction processed
2. Stock updated via inventoryAPI.updateStock()
3. Supabase broadcasts UPDATE event
4. Telegram bot receives update
5. Online customers see updated stock

Warehouse receives shipment:
1. PO marked as received
2. Stock increased via inventoryAPI.updateStock()
3. Supabase broadcasts UPDATE event
4. Both POS and Telegram update instantly
```

---

## 6. Barcode Integration

### 6.1 Barcode Types Supported

- **EAN-13**: European Article Number (13 digits)
- **UPC-A**: Universal Product Code (12 digits)
- **CODE-128**: Alphanumeric codes
- **QR Code**: Can encode product ID, price, variants

### 6.2 Barcode Scanner Setup

#### USB Scanner
```javascript
// Works automatically - scanner acts as keyboard
// Types barcode and presses Enter

// src/hooks/useBarcode.js
export const useUSBScanner = (onScan) => {
  useEffect(() => {
    let buffer = '';
    
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        if (buffer.length > 0) {
          onScan(buffer);
          buffer = '';
        }
      } else {
        buffer += e.key;
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [onScan]);
};
```

#### Camera Scanner
```javascript
// src/components/barcode/BarcodeScanner.jsx
import { Html5QrcodeScanner } from 'html5-qrcode';

const BarcodeScanner = ({ onScan }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: 250,
      supportedScanTypes: [
        Html5QrcodeScanType.SCAN_TYPE_CAMERA
      ]
    });

    scanner.render(onScan, (error) => {
      console.warn(error);
    });

    return () => scanner.clear();
  }, [onScan]);

  return <div id="reader" />;
};
```

### 6.3 Barcode Generation

```javascript
// Generate unique barcodes for products
// Format: 860 + Category(2) + Product(7) + Check(1)

export const generateBarcode = (categoryId, productSequence) => {
  const prefix = '860'; // Uzbekistan country code
  const category = categoryId.toString().padStart(2, '0');
  const sequence = productSequence.toString().padStart(7, '0');
  
  // Calculate check digit (simplified)
  const partial = prefix + category + sequence;
  const checkDigit = calculateCheckDigit(partial);
  
  return partial + checkDigit;
};

// Example: 8600100001234 
// 860 (UZ) + 01 (Bedsheets) + 0000123 (product) + 4 (check)
```

---

## 7. Offline Mode Support

### 7.1 Offline Queue

```javascript
// src/services/offline.js

export class OfflineQueue {
  constructor() {
    this.queue = this.loadQueue();
  }

  loadQueue() {
    const saved = localStorage.getItem('offlineQueue');
    return saved ? JSON.parse(saved) : [];
  }

  saveQueue() {
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }

  addTransaction(transaction) {
    this.queue.push({
      id: Date.now(),
      type: 'transaction',
      data: transaction,
      timestamp: new Date().toISOString()
    });
    this.saveQueue();
  }

  async sync() {
    if (!navigator.onLine || this.queue.length === 0) {
      return;
    }

    const failed = [];
    
    for (const item of this.queue) {
      try {
        if (item.type === 'transaction') {
          await posAPI.createTransaction(item.data);
        }
      } catch (error) {
        console.error('Sync failed for item:', item, error);
        failed.push(item);
      }
    }

    this.queue = failed;
    this.saveQueue();
    
    return { synced: this.queue.length, failed: failed.length };
  }
}

// Auto-sync when connection restored
window.addEventListener('online', () => {
  const queue = new OfflineQueue();
  queue.sync().then(result => {
    console.log('Synced offline transactions:', result);
  });
});
```

---

## 8. Receipt Printing

### 8.1 Thermal Printer (Recommended)

```javascript
// Uses ESC/POS commands
// Popular printers: Epson TM-T20, Star TSP143

// src/services/printer.js
export const printReceipt = async (transaction) => {
  const receipt = formatReceipt(transaction);
  
  // Option 1: Browser print API
  const printWindow = window.open('', '_blank');
  printWindow.document.write(receipt);
  printWindow.document.close();
  printWindow.print();
  
  // Option 2: Direct thermal printer (requires driver/middleware)
  // await fetch('http://localhost:9100/print', {
  //   method: 'POST',
  //   body: JSON.stringify({ escpos: receipt })
  // });
};

const formatReceipt = (transaction) => {
  return `
    <html>
      <head>
        <style>
          body { font-family: monospace; width: 300px; }
          .center { text-align: center; }
          .right { text-align: right; }
          table { width: 100%; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2>AILEM</h2>
          <p>Home Textiles Store</p>
          <p>Phone: +998 XX XXX XXXX</p>
        </div>
        <hr>
        <p>Transaction: ${transaction.transaction_number}</p>
        <p>Date: ${new Date().toLocaleString()}</p>
        <p>Cashier: ${transaction.cashier_name}</p>
        <hr>
        <table>
          ${transaction.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td class="right">${item.quantity} x ${formatPrice(item.price)}</td>
            </tr>
            <tr>
              <td></td>
              <td class="right">${formatPrice(item.quantity * item.price)}</td>
            </tr>
          `).join('')}
        </table>
        <hr>
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="right">${formatPrice(transaction.subtotal)}</td>
          </tr>
          <tr>
            <td>Tax:</td>
            <td class="right">${formatPrice(transaction.tax)}</td>
          </tr>
          <tr>
            <td><strong>TOTAL:</strong></td>
            <td class="right"><strong>${formatPrice(transaction.total)}</strong></td>
          </tr>
          <tr>
            <td>Paid:</td>
            <td class="right">${formatPrice(transaction.amount_paid)}</td>
          </tr>
          <tr>
            <td>Change:</td>
            <td class="right">${formatPrice(transaction.change_given)}</td>
          </tr>
        </table>
        <hr>
        <p class="center">Thank you for shopping with us!</p>
        <p class="center">Telegram: @ailemuz_bot</p>
      </body>
    </html>
  `;
};
```

---

## 9. Keyboard Shortcuts for POS

```javascript
// src/utils/shortcuts.js

export const POS_SHORTCUTS = {
  F1: 'new-sale',      // Start new transaction
  F2: 'search',        // Product search
  F3: 'customer',      // Customer lookup
  F4: 'hold',          // Hold transaction
  F5: 'recall',        // Recall held transaction
  F6: 'discount',      // Apply discount
  F7: 'payment',       // Process payment
  F8: 'void',          // Void transaction
  F9: 'quantity',      // Change quantity
  F10: 'reports',      // Open reports
  F11: 'end-of-day',   // Cash drawer count
  F12: 'logout',       // Cashier logout
  
  ESCAPE: 'cancel',    // Cancel current action
  ENTER: 'confirm',    // Confirm action
  DELETE: 'remove',    // Remove cart item
  '+': 'increase',     // Increase quantity
  '-': 'decrease'      // Decrease quantity
};

// src/hooks/useKeyboard.js
export const useKeyboardShortcuts = (handlers) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const action = POS_SHORTCUTS[e.key.toUpperCase()];
      if (action && handlers[action]) {
        e.preventDefault();
        handlers[action]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
```

---

## 10. Security & User Roles

### 10.1 User Roles

```sql
-- Add role column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

ALTER TABLE users
ADD CONSTRAINT valid_user_role CHECK (
  role IN ('customer', 'cashier', 'warehouse_staff', 'admin')
);

-- Role permissions:
-- customer: Can only shop (Telegram bot)
-- cashier: Can use POS, view reports
-- warehouse_staff: Can manage inventory, receive stock
-- admin: Full access to all systems
```

### 10.2 Row Level Security (RLS)

```sql
-- Cashiers can only see their own transactions
CREATE POLICY "Cashiers see own transactions"
  ON pos_transactions FOR SELECT
  USING (
    auth.uid() = cashier_id 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Warehouse staff can read/write inventory
CREATE POLICY "Warehouse staff manage inventory"
  ON stock_movements FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('warehouse_staff', 'admin')
  );
```

---

## 11. Deployment Architecture

### 11.1 Hosting Options

#### POS App
- **Option 1**: Local network (tablets/computers in store)
  - Build: `npm run build`
  - Serve: Local web server (nginx, Apache)
  - Access: `http://192.168.1.100:3000`

- **Option 2**: Cloud-hosted (PWA)
  - Deploy to: Vercel, Netlify
  - Access: `https://pos.ailem.uz`
  - Works offline with service workers

#### Warehouse App
- Same as POS, can be same deployment with different routes
- Mobile-friendly for handheld scanners

### 11.2 Network Architecture

```
┌─────────────────────────────────────────────────┐
│               Internet Cloud                     │
│  ┌────────────┐         ┌──────────────────┐   │
│  │  Supabase  │◄───────►│ Ailem Telegram   │   │
│  │  Database  │         │      Bot         │   │
│  └──────┬─────┘         └──────────────────┘   │
│         │                                        │
└─────────┼────────────────────────────────────────┘
          │
          ▼ (WebSocket / REST)
┌─────────────────────────────────────────────────┐
│            Store Local Network                   │
│                                                  │
│  ┌──────────────┐      ┌──────────────┐        │
│  │   POS #1     │      │   POS #2     │        │
│  │   (Tablet)   │      │   (Tablet)   │        │
│  └──────────────┘      └──────────────┘        │
│                                                  │
│  ┌──────────────┐      ┌──────────────┐        │
│  │  Warehouse   │      │   Receipt    │        │
│  │   Scanner    │      │   Printer    │        │
│  └──────────────┘      └──────────────┘        │
└──────────────────────────────────────────────────┘
```

---

## 12. Implementation Phases

### Phase 1: Database & Core API (Week 1)
- [x] Run database migration (add barcode columns)
- [ ] Add barcodes to existing products in admin panel
- [ ] Create POS transaction table
- [ ] Create stock movement table
- [ ] Implement inventoryAPI service
- [ ] Test real-time sync

### Phase 2: Basic POS (Week 2-3)
- [ ] Create POS app structure
- [ ] Implement barcode scanning (USB)
- [ ] Build shopping cart UI
- [ ] Implement checkout flow (cash only)
- [ ] Add receipt printing (browser print)
- [ ] Test end-to-end sale flow

### Phase 3: Advanced POS (Week 4)
- [ ] Add payment methods (Payme, Click)
- [ ] Implement hold/recall transactions
- [ ] Add keyboard shortcuts
- [ ] Create transaction history
- [ ] Build end-of-day reports
- [ ] Offline mode support

### Phase 4: Warehouse App (Week 5-6)
- [ ] Create warehouse app structure
- [ ] Implement stock receiving
- [ ] Add purchase order management
- [ ] Build stock counting feature
- [ ] Generate barcode labels
- [ ] Stock movement reports

### Phase 5: Polish & Production (Week 7)
- [ ] Mobile responsiveness
- [ ] Sound effects for scanning
- [ ] Customer display screen
- [ ] Multi-language UI (Uzbek/Russian)
- [ ] User training documentation
- [ ] Production deployment

---

## 13. Hardware Requirements

### POS Terminal
- **Computer/Tablet**: iPad, Android tablet, or Windows PC
- **Barcode Scanner**: USB (e.g., Honeywell Voyager 1200g) - $50-150
- **Receipt Printer**: Thermal printer (e.g., Epson TM-T20) - $150-300
- **Cash Drawer**: Connected to receipt printer - $100-200
- **Internet**: Stable WiFi connection

### Warehouse
- **Handheld Scanner**: Mobile device with camera or dedicated barcode scanner
- **Label Printer**: For printing barcode labels (e.g., Zebra ZD410) - $200-400
- **Computer**: For receiving and reporting

### Total Initial Investment
- **Basic Setup (1 POS)**: ~$500-800
- **Full Setup (2 POS + Warehouse)**: ~$1,500-2,000

---

## 14. Success Metrics

### POS System
- Average transaction time: < 2 minutes
- Barcode scan success rate: > 95%
- System uptime: > 99.5%
- Offline transaction sync: < 5 minutes after reconnection

### Inventory Management
- Stock accuracy: > 98%
- Receiving time per item: < 30 seconds
- Real-time sync delay: < 2 seconds

### Business Impact
- Reduced manual stock counting time: 70%
- Eliminated stock discrepancies: 90%
- Unified online/offline inventory: 100%

---

## 15. Next Steps

1. **Review this architecture** - Confirm approach and requirements
2. **Run database migration** - Add barcode support
3. **Add barcodes to products** - Update admin panel
4. **Build POS prototype** - Basic scanning and checkout
5. **Test in real environment** - Use USB scanner and receipt printer
6. **Iterate based on feedback** - Add features as needed

---

## Questions to Consider

1. **How many POS terminals** do you need?
2. **Do you have USB barcode scanners** or need camera-based?
3. **Thermal printer** or regular paper printing?
4. **Offline support priority** - Critical or nice-to-have?
5. **Mobile warehouse app** or desktop-only?
6. **Barcode label printing** - Required immediately?

---

## References

- Supabase Realtime: https://supabase.com/docs/guides/realtime
- html5-qrcode: https://github.com/mebjas/html5-qrcode
- ESC/POS Printing: https://github.com/receipt-print-hq/escpos-tools
- Barcode Standards: https://www.gs1.org/standards/barcodes

---

**This architecture is designed to scale with your business** - start with basic POS, add warehouse management, then expand to multiple locations with centralized inventory. All apps share the same Supabase database for real-time synchronization.
