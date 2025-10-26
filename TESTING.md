# Testing Guide

Complete guide to running and writing tests for the Ailem Telegram Mini App.

---

## 🧪 **Test Framework**

- **Vitest**: Fast unit testing framework (Vite-native)
- **React Testing Library**: Component testing utilities
- **jsdom**: Simulated browser environment

---

## 🚀 **Running Tests**

### **Run All Tests Once**
```bash
npm test
```

### **Watch Mode** (Re-run on file changes)
```bash
npm run test:watch
```

### **Interactive UI** (Browser-based test runner)
```bash
npm run test:ui
```
Then open: http://localhost:51204/__vitest__/

### **Coverage Report**
```bash
npm run test:coverage
```

View coverage report in `coverage/index.html`

---

## 📊 **Current Test Coverage**

### **✅ What's Tested:**

#### **Helper Functions** (`src/utils/helpers.test.js`)
- ✅ Price formatting with thousands separators
- ✅ Discount calculations
- ✅ Order number generation
- ✅ Referral code generation
- ✅ **Bonus points calculations** (critical!)
  - Earning bonus (10% default)
  - Max usage (20% of order)
  - Points to currency conversion
  - Full earn-and-spend flow
- ✅ Email validation
- ✅ Phone validation
- ✅ Text truncation

#### **Payment Services** (`src/services/payment.test.js`)
- ✅ **Payme payment link generation**
  - UZS to tiyin conversion (1 UZS = 100 tiyin)
  - Base64 encoding of params
  - Custom account parameters
  - Return URL handling
  - Test/production mode switching
- ✅ **Click payment link generation**
  - Direct UZS amounts (no tiyin)
  - Query parameter formatting
  - Order ID handling
  - Configuration validation
- ✅ Amount edge cases (large amounts, decimals, rounding)
- ✅ Payment gateway comparison tests

---

## 📝 **Writing New Tests**

### **Test File Naming**
- Place tests next to source files: `filename.test.js` or `filename.spec.js`
- Or in `src/tests/` directory

### **Basic Test Structure**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { functionToTest } from './yourFile';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    localStorage.clear();
  });

  it('should do something expected', () => {
    const result = functionToTest(input);
    expect(result).toBe(expectedOutput);
  });
  
  it('should handle edge cases', () => {
    expect(functionToTest(null)).toBe(defaultValue);
  });
});
```

---

## 🎯 **Test Examples**

### **Unit Test** (Pure Function)
```javascript
// Test: helpers.js
describe('calculateBonusPoints', () => {
  it('should calculate 10% bonus by default', () => {
    expect(calculateBonusPoints(100000)).toBe(10000);
  });
  
  it('should handle zero amount', () => {
    expect(calculateBonusPoints(0)).toBe(0);
  });
});
```

### **Integration Test** (Component + Logic)
```javascript
import { render, screen, fireEvent } from '@testing-library/react';

describe('CartPage', () => {
  it('should add item and update total', async () => {
    render(<CartPage />);
    
    const addButton = screen.getByText('Add to Cart');
    fireEvent.click(addButton);
    
    expect(screen.getByText('Total: 50,000 UZS')).toBeInTheDocument();
  });
});
```

### **Testing with Mocks**
```javascript
import { vi } from 'vitest';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [{ id: 1, name: 'Test Product' }],
        error: null
      }))
    }))
  }
}));

it('should fetch products', async () => {
  const products = await productsAPI.getAll();
  expect(products).toHaveLength(1);
});
```

---

## 🛠️ **Test Utilities**

### **Mocked Globals** (in `src/tests/setup.js`)

#### **Telegram WebApp API**
```javascript
window.Telegram.WebApp.MainButton.show(); // Mocked
window.Telegram.WebApp.showAlert('Test'); // Mocked
```

#### **localStorage**
```javascript
localStorage.setItem('key', 'value');
localStorage.getItem('key'); // Works in tests
localStorage.clear(); // Reset between tests
```

#### **Environment Variables**
```javascript
process.env.VITE_SUPABASE_URL; // Pre-configured for tests
process.env.VITE_PAYME_MERCHANT_ID; // Available in tests
```

---

## 📋 **Test Patterns**

### **Arrange-Act-Assert (AAA)**
```javascript
it('should calculate total with discount', () => {
  // Arrange
  const price = 100000;
  const discount = 20;
  
  // Act
  const result = calculateDiscountedPrice(price, discount);
  
  // Assert
  expect(result).toBe(80000);
});
```

### **Given-When-Then (BDD)**
```javascript
it('should give bonus points after purchase', () => {
  // Given a 100,000 UZS order
  const orderAmount = 100000;
  
  // When calculating bonus
  const bonus = calculateBonusPoints(orderAmount);
  
  // Then user receives 10,000 points
  expect(bonus).toBe(10000);
});
```

---

## 🚨 **What Should Be Tested?**

### **✅ Always Test:**
- ✅ Critical business logic (bonus calculations, payments)
- ✅ Data transformations (UZS ↔ tiyin, field mapping)
- ✅ Edge cases (null, zero, large numbers, empty strings)
- ✅ Validation functions (email, phone, amounts)
- ✅ Error handling

### **⚠️ Consider Testing:**
- API response formatting
- URL generation (payment links)
- State management logic
- Complex calculations

### **❌ Don't Need to Test:**
- Third-party libraries (Supabase, Telegram API)
- Simple getters/setters
- Constants
- Styles/CSS

---

## 🔍 **Debugging Tests**

### **View Test Output**
```bash
npm run test:watch
# In another terminal:
npm run test:ui
```

### **Add Console Logs**
```javascript
it('should calculate bonus', () => {
  const result = calculateBonusPoints(100000);
  console.log('Result:', result); // Shows in terminal
  expect(result).toBe(10000);
});
```

### **Debug Single Test**
```javascript
it.only('should focus on this test', () => {
  // Only this test runs
});
```

### **Skip Failing Tests Temporarily**
```javascript
it.skip('should fix this later', () => {
  // Test skipped
});
```

---

## 📈 **Coverage Goals**

### **Current Status:**
- ✅ Helper functions: **~90% coverage**
- ✅ Payment services: **~85% coverage**
- ⚠️ React components: **0% coverage** (not yet implemented)
- ⚠️ API services: **0% coverage** (requires mocking)

### **Target Coverage:**
- Critical paths (payments, bonus): **>90%**
- Helper functions: **>80%**
- Components: **>60%**
- Overall: **>70%**

---

## 🎓 **Testing Best Practices**

### **1. Test Behavior, Not Implementation**
```javascript
// ❌ Bad: Testing implementation details
expect(calculateBonus.toString()).toContain('* 0.1');

// ✅ Good: Testing behavior
expect(calculateBonus(100000)).toBe(10000);
```

### **2. Use Descriptive Test Names**
```javascript
// ❌ Bad
it('works', () => { ... });

// ✅ Good
it('should calculate 10% bonus points for 100,000 UZS order', () => { ... });
```

### **3. One Assertion Per Test** (when possible)
```javascript
// ❌ Okay but less clear
it('should format prices', () => {
  expect(formatPrice(50000)).toBe('50,000 UZS');
  expect(formatPrice(100000)).toBe('100,000 UZS');
});

// ✅ Better
it('should format 50,000 UZS', () => {
  expect(formatPrice(50000)).toBe('50,000 UZS');
});

it('should format 100,000 UZS', () => {
  expect(formatPrice(100000)).toBe('100,000 UZS');
});
```

### **4. Test Edge Cases**
```javascript
describe('calculateBonusPoints', () => {
  it('should handle normal amounts', () => { ... });
  it('should handle zero', () => { ... });
  it('should handle very large amounts', () => { ... });
  it('should round decimals correctly', () => { ... });
  it('should use custom config if provided', () => { ... });
});
```

### **5. Clean Up After Tests**
```javascript
beforeEach(() => {
  localStorage.clear(); // Reset state
});

afterEach(() => {
  vi.clearAllMocks(); // Clear mocks
});
```

---

## 🐛 **Common Issues**

### **"Cannot find module './helpers'"**
**Solution**: Use correct import paths (relative or absolute with @/)

### **"localStorage is not defined"**
**Solution**: Already mocked in `src/tests/setup.js`

### **"window is not defined"**
**Solution**: Use `jsdom` environment (already configured in `vitest.config.js`)

### **Tests pass locally but fail in CI**
**Solution**: Check environment variables, ensure deterministic tests

---

## 📚 **Resources**

- **Vitest Docs**: https://vitest.dev/
- **React Testing Library**: https://testing-library.com/react
- **Testing Best Practices**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library

---

## ✅ **Quick Start Checklist**

- [x] Testing framework installed (Vitest)
- [x] Test scripts added to package.json
- [x] Helper functions tested
- [x] Payment services tested
- [ ] Component tests (future)
- [ ] E2E tests (future)

---

**Happy Testing! 🎉**

Run `npm test` to see your tests pass!
