import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Telegram WebApp API
global.window = global.window || {};
global.window.Telegram = {
  WebApp: {
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    MainButton: {
      show: vi.fn(),
      hide: vi.fn(),
      setText: vi.fn(),
      onClick: vi.fn(),
      offClick: vi.fn(),
      showProgress: vi.fn(),
      hideProgress: vi.fn()
    },
    BackButton: {
      show: vi.fn(),
      hide: vi.fn(),
      onClick: vi.fn(),
      offClick: vi.fn()
    },
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    initDataUnsafe: {
      user: {
        id: 999999,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser'
      }
    }
  }
};

// Mock environment variables
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.VITE_PAYME_MERCHANT_ID = 'test-merchant-id';
process.env.VITE_PAYME_TEST_MODE = 'true';
process.env.VITE_CLICK_SERVICE_ID = 'test-service-id';
process.env.VITE_CLICK_MERCHANT_ID = 'test-merchant-id';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

global.localStorage = localStorageMock;
