'use client';

import { useEffect, useRef, useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserContext } from '../context/UserContext';
import { loadFromLocalStorage, removeFromLocalStorage } from '../utils/helpers';

// Global side effects extracted from App.jsx
// Runs once at app startup — handles referrals, pending payments, image protection
export default function GlobalEffects() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setReferredBy } = useContext(UserContext);
  const referralProcessed = useRef(false);

  // Handle referral codes from URL (?ref=CODE)
  useEffect(() => {
    if (referralProcessed.current || !user || user.isGuest) return;

    const refCode = searchParams.get('ref');
    if (!refCode) return;

    referralProcessed.current = true;

    // Clean ref param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    window.history.replaceState({}, '', url.pathname + url.search);

    // Prevent self-referral
    if (refCode === user.referralCode) {
      alert("Siz o'zingizning referral kodingizni ishlata olmaysiz!");
      return;
    }

    // Save referral code if user hasn't been referred before
    if (!user.referredBy && setReferredBy) {
      setReferredBy(refCode).then(() => {
        alert("Xush kelibsiz! Siz do'stingiz orqali taklif qilindingiz!");
      });
    }
  }, [user?.id, searchParams, setReferredBy]);

  // Check for pending payment when app loads
  useEffect(() => {
    const urlOrderId = searchParams.get('order');
    const urlPaymentMethod = searchParams.get('method');

    if (urlOrderId && urlPaymentMethod) {
      removeFromLocalStorage('pendingPayment');
      router.push(
        `/payment/status?order=${urlOrderId}&method=${urlPaymentMethod}`
      );
      return;
    }

    // Check localStorage for pending payment
    const pendingPayment = loadFromLocalStorage('pendingPayment');
    if (pendingPayment) {
      const { orderId, paymentMethod, timestamp } = pendingPayment;
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (timestamp > oneHourAgo) {
        removeFromLocalStorage('pendingPayment');
        router.push(
          `/payment/status?order=${orderId}&method=${paymentMethod}`
        );
      } else {
        removeFromLocalStorage('pendingPayment');
      }
    }
  }, [router, searchParams]);

  // Disable context menu on all images
  useEffect(() => {
    const preventContextMenu = (e) => {
      if (e.target.tagName === 'IMG') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    return () => document.removeEventListener('contextmenu', preventContextMenu);
  }, []);

  return null;
}
