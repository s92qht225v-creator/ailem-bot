import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generatePaymeLink, formatPaymeAmount } from './payme';
import { generateClickLink, formatClickAmount, CLICK_ERROR_CODES } from './click';

// Mock environment variables
vi.mock('../utils/helpers', () => ({
  loadFromLocalStorage: vi.fn(() => null)
}));

describe('Payme Payment Service', () => {
  beforeEach(() => {
    // Set up environment
    import.meta.env.VITE_PAYME_MERCHANT_ID = 'test-merchant-123';
    import.meta.env.VITE_PAYME_TEST_MODE = 'true';
  });

  describe('generatePaymeLink', () => {
    it('should generate valid payment link with required parameters', () => {
      const link = generatePaymeLink({
        orderId: 'ORD-123',
        amount: 50000, // 50,000 UZS
        description: 'Test order'
      });

      expect(link).toContain('https://checkout.test.paycom.uz');
      expect(link).toMatch(/^https:\/\/checkout\.test\.paycom\.uz\/.+$/);
    });

    it('should convert amount from UZS to tiyin correctly', () => {
      const link = generatePaymeLink({
        orderId: 'ORD-123',
        amount: 100000 // 100,000 UZS = 10,000,000 tiyin
      });

      // Decode base64 to check amount
      const base64Part = link.split('/').pop();
      const decoded = atob(base64Part);
      
      expect(decoded).toContain('a=10000000'); // Amount in tiyin
    });

    it('should include order ID in params', () => {
      const orderId = 'ORD-TEST-456';
      const link = generatePaymeLink({
        orderId,
        amount: 50000
      });

      const base64Part = link.split('/').pop();
      const decoded = atob(base64Part);
      
      expect(decoded).toContain(`ac.order_id=${orderId}`);
    });

    it('should include merchant ID in params', () => {
      const link = generatePaymeLink({
        orderId: 'ORD-123',
        amount: 50000
      });

      const base64Part = link.split('/').pop();
      const decoded = atob(base64Part);
      
      expect(decoded).toContain('m=test-merchant-123');
    });

    it('should add custom account parameters', () => {
      const link = generatePaymeLink({
        orderId: 'ORD-123',
        amount: 50000,
        account: {
          user_id: 'USER-789',
          phone: '+998901234567'
        }
      });

      const base64Part = link.split('/').pop();
      const decoded = atob(base64Part);
      
      expect(decoded).toContain('ac.user_id=USER-789');
      expect(decoded).toContain('ac.phone=+998901234567');
    });

    it('should add return URL when provided', () => {
      const returnUrl = 'https://myapp.com/payment/success';
      const link = generatePaymeLink({
        orderId: 'ORD-123',
        amount: 50000,
        returnUrl
      });

      const base64Part = link.split('/').pop();
      const decoded = atob(base64Part);
      
      expect(decoded).toContain('c=');
      expect(decoded).toContain('ct=2000'); // Delay parameter
    });

    it('should throw error if merchant ID is missing', () => {
      import.meta.env.VITE_PAYME_MERCHANT_ID = '';
      
      expect(() => {
        generatePaymeLink({
          orderId: 'ORD-123',
          amount: 50000
        });
      }).toThrow('Payme Merchant ID not configured');
    });

    it('should use production URL when test mode is false', () => {
      import.meta.env.VITE_PAYME_TEST_MODE = 'false';
      
      const link = generatePaymeLink({
        orderId: 'ORD-123',
        amount: 50000
      });

      expect(link).toContain('https://checkout.paycom.uz');
      expect(link).not.toContain('.test.');
    });

    it('should round amount to nearest tiyin', () => {
      const link = generatePaymeLink({
        orderId: 'ORD-123',
        amount: 50000.75 // 50000.75 * 100 = 5000075 tiyin (Math.round)
      });

      const base64Part = link.split('/').pop();
      const decoded = atob(base64Part);
      
      expect(decoded).toContain('a=5000075'); // Rounded to nearest tiyin
    });
  });

  describe('formatPaymeAmount', () => {
    it('should convert tiyin to UZS', () => {
      const formatted = formatPaymeAmount(5000000); // 50,000 UZS in tiyin
      expect(formatted).toContain('50');
      expect(formatted).toContain('000');
    });

    it('should handle zero amount', () => {
      const formatted = formatPaymeAmount(0);
      expect(formatted).toBeDefined();
    });
  });
});

describe('Click Payment Service', () => {
  beforeEach(() => {
    // Set up environment
    import.meta.env.VITE_CLICK_MERCHANT_ID = 'click-merchant-456';
    import.meta.env.VITE_CLICK_SERVICE_ID = 'click-service-789';
    import.meta.env.VITE_CLICK_TEST_MODE = 'true';
    import.meta.env.VITE_APP_URL = 'https://www.ailem.uz';
  });

  describe('generateClickLink', () => {
    it('should generate valid payment link with required parameters', () => {
      const link = generateClickLink({
        orderId: 'ORD-123',
        amount: 50000 // 50,000 UZS
      });

      expect(link).toContain('https://my.click.uz/services/pay');
      expect(link).toContain('service_id=click-service-789');
      expect(link).toContain('merchant_id=click-merchant-456');
    });

    it('should use UZS amount directly (not tiyin)', () => {
      const link = generateClickLink({
        orderId: 'ORD-123',
        amount: 100000 // 100,000 UZS (stays same, not multiplied by 100)
      });

      expect(link).toContain('amount=100000');
    });

    it('should include order ID as both params', () => {
      const orderId = 'ORD-CLICK-789';
      const link = generateClickLink({
        orderId,
        amount: 50000
      });

      expect(link).toContain(`transaction_param=${orderId}`);
      expect(link).toContain(`merchant_trans_id=${orderId}`);
    });

    it('should include return URL', () => {
      const link = generateClickLink({
        orderId: 'ORD-123',
        amount: 50000
      });

      // URL is encoded, so check for encoded version
      expect(link).toContain('return_url=https%3A%2F%2Fwww.ailem.uz%2F%23%2Fprofile');
    });

    it('should throw error if credentials missing', () => {
      import.meta.env.VITE_CLICK_MERCHANT_ID = '';
      
      expect(() => {
        generateClickLink({
          orderId: 'ORD-123',
          amount: 50000
        });
      }).toThrow('Click Merchant ID or Service ID not configured');
    });

    it('should round decimal amounts', () => {
      const link = generateClickLink({
        orderId: 'ORD-123',
        amount: 50000.75
      });

      expect(link).toContain('amount=50001');
    });

    it('should use same URL for test and production mode', () => {
      const testLink = generateClickLink({
        orderId: 'ORD-123',
        amount: 50000
      });

      import.meta.env.VITE_CLICK_TEST_MODE = 'false';
      
      const prodLink = generateClickLink({
        orderId: 'ORD-123',
        amount: 50000
      });

      expect(testLink.split('?')[0]).toBe(prodLink.split('?')[0]);
    });
  });

  describe('formatClickAmount', () => {
    it('should format UZS amount', () => {
      const formatted = formatClickAmount(50000);
      expect(formatted).toBeDefined();
      expect(formatted).toContain('50');
    });

    it('should handle zero amount', () => {
      const formatted = formatClickAmount(0);
      expect(formatted).toBeDefined();
    });
  });

  describe('CLICK_ERROR_CODES', () => {
    it('should export all required error codes', () => {
      expect(CLICK_ERROR_CODES.SUCCESS).toBe(0);
      expect(CLICK_ERROR_CODES.SIGN_CHECK_FAILED).toBe(-1);
      expect(CLICK_ERROR_CODES.INVALID_AMOUNT).toBe(-2);
      expect(CLICK_ERROR_CODES.ALREADY_PAID).toBe(-4);
      expect(CLICK_ERROR_CODES.USER_NOT_FOUND).toBe(-5);
    });
  });
});

describe('Payment Gateway Comparison', () => {
  it('should show Payme uses tiyin, Click uses UZS', () => {
    const amount = 100000; // 100,000 UZS
    
    // Payme: multiply by 100 for tiyin
    const paymeLink = generatePaymeLink({
      orderId: 'ORD-123',
      amount
    });
    const paymeBase64 = paymeLink.split('/').pop();
    const paymeDecoded = atob(paymeBase64);
    expect(paymeDecoded).toContain('a=10000000'); // 10,000,000 tiyin
    
    // Click: uses UZS directly
    const clickLink = generateClickLink({
      orderId: 'ORD-123',
      amount
    });
    expect(clickLink).toContain('amount=100000'); // 100,000 UZS
  });

  it('should generate different link formats', () => {
    const paymeLink = generatePaymeLink({
      orderId: 'ORD-123',
      amount: 50000
    });
    
    const clickLink = generateClickLink({
      orderId: 'ORD-123',
      amount: 50000
    });

    // Payme uses base64 encoded params in path
    expect(paymeLink).toMatch(/checkout\.(test\.)?paycom\.uz\/[A-Za-z0-9+/=]+$/);
    
    // Click uses query parameters
    expect(clickLink).toContain('?');
    expect(clickLink).toContain('service_id=');
  });
});

describe('Payment Amount Edge Cases', () => {
  it('should handle very large amounts', () => {
    const largeAmount = 99999999; // ~100 million UZS
    
    const paymeLink = generatePaymeLink({
      orderId: 'ORD-123',
      amount: largeAmount
    });
    
    const clickLink = generateClickLink({
      orderId: 'ORD-123',
      amount: largeAmount
    });

    expect(paymeLink).toBeDefined();
    expect(clickLink).toBeDefined();
  });

  it('should handle minimum amounts', () => {
    const minAmount = 1000; // 1,000 UZS
    
    const paymeLink = generatePaymeLink({
      orderId: 'ORD-123',
      amount: minAmount
    });
    
    const clickLink = generateClickLink({
      orderId: 'ORD-123',
      amount: minAmount
    });

    expect(paymeLink).toBeDefined();
    expect(clickLink).toBeDefined();
  });

  it('should handle decimal rounding correctly', () => {
    const amount1 = 12345.49; // Should round to 12345
    const amount2 = 12345.50; // Should round to 12346
    
    const link1 = generateClickLink({ orderId: 'ORD-1', amount: amount1 });
    const link2 = generateClickLink({ orderId: 'ORD-2', amount: amount2 });
    
    expect(link1).toContain('amount=12345');
    expect(link2).toContain('amount=12346');
  });
});
