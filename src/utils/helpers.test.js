import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatPrice,
  calculateDiscountPercentage,
  calculateDiscountedPrice,
  generateOrderNumber,
  generateReferralCode,
  calculateBonusPoints,
  calculateMaxBonusUsage,
  bonusPointsToDollars,
  validateEmail,
  validatePhone,
  truncateText
} from './helpers';

describe('Price Formatting', () => {
  it('should format price with thousand separators', () => {
    expect(formatPrice(50000)).toBe('50,000 UZS');
    expect(formatPrice(1234567)).toBe('1,234,567 UZS');
  });

  it('should round decimal prices', () => {
    expect(formatPrice(50000.75)).toBe('50,001 UZS');
    expect(formatPrice(99999.49)).toBe('99,999 UZS');
  });

  it('should handle zero and negative prices', () => {
    expect(formatPrice(0)).toBe('0 UZS');
    expect(formatPrice(-100)).toBe('-100 UZS');
  });
});

describe('Discount Calculations', () => {
  it('should calculate discount percentage correctly', () => {
    expect(calculateDiscountPercentage(100000, 80000)).toBe(20);
    expect(calculateDiscountPercentage(50000, 40000)).toBe(20);
    expect(calculateDiscountPercentage(75000, 60000)).toBe(20);
  });

  it('should return 0 if no discount', () => {
    expect(calculateDiscountPercentage(50000, 50000)).toBe(0);
    expect(calculateDiscountPercentage(50000, 60000)).toBe(0);
  });

  it('should calculate discounted price', () => {
    expect(calculateDiscountedPrice(100000, 20)).toBe(80000);
    expect(calculateDiscountedPrice(50000, 10)).toBe(45000);
  });

  it('should return original price if discount is 0 or negative', () => {
    expect(calculateDiscountedPrice(50000, 0)).toBe(50000);
    expect(calculateDiscountedPrice(50000, -10)).toBe(50000);
  });
});

describe('Order Number Generation', () => {
  it('should generate unique order numbers', () => {
    const order1 = generateOrderNumber();
    const order2 = generateOrderNumber();
    
    expect(order1).toMatch(/^ORD-\d+-\d+$/);
    expect(order2).toMatch(/^ORD-\d+-\d+$/);
    expect(order1).not.toBe(order2);
  });

  it('should start with ORD- prefix', () => {
    const orderNum = generateOrderNumber();
    expect(orderNum.startsWith('ORD-')).toBe(true);
  });
});

describe('Referral Code Generation', () => {
  it('should generate code from user name', () => {
    const code = generateReferralCode('John Doe');
    expect(code).toMatch(/^JOHN[A-Z0-9]{4}$/);
    expect(code.length).toBe(8);
  });

  it('should handle short names', () => {
    const code = generateReferralCode('Al');
    expect(code.startsWith('AL')).toBe(true);
    expect(code.length).toBe(6);
  });

  it('should remove spaces and uppercase', () => {
    const code = generateReferralCode('ali babaev');
    expect(code.startsWith('ALIB')).toBe(true);
  });

  it('should generate different codes for same name', () => {
    const code1 = generateReferralCode('John');
    const code2 = generateReferralCode('John');
    expect(code1).not.toBe(code2);
  });
});

describe('Bonus Points Calculations', () => {
  beforeEach(() => {
    // Reset localStorage bonus config before each test
    localStorage.clear();
  });

  it('should calculate 10% bonus points by default', () => {
    expect(calculateBonusPoints(100000)).toBe(10000);
    expect(calculateBonusPoints(50000)).toBe(5000);
    expect(calculateBonusPoints(25000)).toBe(2500);
  });

  it('should handle zero amount', () => {
    expect(calculateBonusPoints(0)).toBe(0);
  });

  it('should round bonus points', () => {
    expect(calculateBonusPoints(12345)).toBe(1235); // 10% of 12345 = 1234.5, rounded to 1235
  });

  it('should use custom bonus percentage from config', () => {
    localStorage.setItem('bonusConfig', JSON.stringify({ purchaseBonus: 15 }));
    expect(calculateBonusPoints(100000)).toBe(15000); // 15% instead of 10%
  });
});

describe('Max Bonus Usage Calculations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should calculate max bonus usage as 20% of order', () => {
    // Default point value is 1000 (1 point = 1000 so'm)
    // 20% of 100,000 = 20,000 so'm = 20 points
    expect(calculateMaxBonusUsage(100000)).toBe(20);
    
    // 20% of 50,000 = 10,000 so'm = 10 points
    expect(calculateMaxBonusUsage(50000)).toBe(10);
  });

  it('should handle zero order total', () => {
    expect(calculateMaxBonusUsage(0)).toBe(0);
  });

  it('should use custom point value from config', () => {
    // Change point value to 500 (1 point = 500 so'm)
    localStorage.setItem('bonusConfig', JSON.stringify({ pointValue: 500 }));
    
    // 20% of 100,000 = 20,000 so'm = 40 points (at 500 per point)
    expect(calculateMaxBonusUsage(100000)).toBe(40);
  });
});

describe('Bonus Points to Currency Conversion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should convert points to currency with default value', () => {
    // Default: 1 point = 1000 so'm
    expect(bonusPointsToDollars(10)).toBe(10000);
    expect(bonusPointsToDollars(5)).toBe(5000);
  });

  it('should handle zero points', () => {
    expect(bonusPointsToDollars(0)).toBe(0);
  });

  it('should use custom point value from config', () => {
    localStorage.setItem('bonusConfig', JSON.stringify({ pointValue: 500 }));
    expect(bonusPointsToDollars(10)).toBe(5000); // 10 points × 500 = 5000
  });
});

describe('Email Validation', () => {
  it('should validate correct emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    expect(validateEmail('admin@ailem.uz')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('test @example.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});

describe('Phone Validation', () => {
  it('should validate correct phone numbers', () => {
    expect(validatePhone('+998901234567')).toBe(true);
    expect(validatePhone('998901234567')).toBe(true);
    expect(validatePhone('+1 (555) 123-4567')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validatePhone('123')).toBe(false); // Too short
    expect(validatePhone('abcdefghij')).toBe(false); // Letters
    expect(validatePhone('')).toBe(false);
  });

  it('should handle phone numbers with spaces and dashes', () => {
    expect(validatePhone('998 90 123 45 67')).toBe(true);
    expect(validatePhone('998-90-123-45-67')).toBe(true);
  });
});

describe('Text Truncation', () => {
  it('should truncate long text', () => {
    const longText = 'This is a very long text that needs truncation';
    expect(truncateText(longText, 20)).toBe('This is a very long ...');
  });

  it('should not truncate short text', () => {
    const shortText = 'Short text';
    expect(truncateText(shortText, 20)).toBe('Short text');
  });

  it('should handle exact length', () => {
    const text = '12345678901234567890';
    expect(truncateText(text, 20)).toBe('12345678901234567890');
  });
});

describe('Bonus Points System Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should correctly calculate earn and spend flow', () => {
    const orderAmount = 100000;
    
    // Step 1: Calculate earned bonus points (10% of order)
    const earnedPoints = calculateBonusPoints(orderAmount);
    expect(earnedPoints).toBe(10000);
    
    // Step 2: Calculate max points can be used (20% of order)
    const maxUsablePoints = calculateMaxBonusUsage(orderAmount);
    expect(maxUsablePoints).toBe(20);
    
    // Step 3: Convert points to discount value
    const discountValue = bonusPointsToDollars(maxUsablePoints);
    expect(discountValue).toBe(20000); // 20 points × 1000 = 20,000 so'm
    
    // Step 4: Final order total after discount
    const finalTotal = orderAmount - discountValue;
    expect(finalTotal).toBe(80000);
  });

  it('should handle scenario where user has more points than allowed', () => {
    const orderAmount = 50000;
    const userPoints = 100; // User has 100 points
    
    // Max they can use is 20% of order = 10,000 so'm = 10 points
    const maxUsablePoints = calculateMaxBonusUsage(orderAmount);
    expect(maxUsablePoints).toBe(10);
    
    // User can only use 10 points even though they have 100
    const actualPointsUsed = Math.min(userPoints, maxUsablePoints);
    expect(actualPointsUsed).toBe(10);
    
    const discount = bonusPointsToDollars(actualPointsUsed);
    expect(discount).toBe(10000);
    
    expect(orderAmount - discount).toBe(40000);
  });
});
