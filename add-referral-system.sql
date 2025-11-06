-- Referral System Migration
-- Creates tables and fields needed for tracking referrals and rewarding users

-- ============================================
-- REFERRALS TABLE
-- ============================================
-- Tracks individual referral relationships and their status

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL, -- The code used for referral
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, rewarded
  reward_amount INTEGER DEFAULT 0, -- Bonus points awarded
  first_order_id UUID, -- Reference to first order (will add constraint later)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE, -- When referred user made first purchase
  rewarded_at TIMESTAMP WITH TIME ZONE, -- When referrer received bonus

  CONSTRAINT unique_referral UNIQUE(referrer_id, referred_id),
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ============================================
-- ORDERS TABLE - Add referral tracking
-- ============================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES referrals(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_first_order BOOLEAN DEFAULT false;

-- Add index for referral lookups
CREATE INDEX IF NOT EXISTS idx_orders_referral ON orders(referral_id);

-- ============================================
-- FUNCTION: Award Referral Bonus
-- ============================================
-- Automatically awards bonus points when a referred user completes first order

CREATE OR REPLACE FUNCTION award_referral_bonus()
RETURNS TRIGGER AS $$
DECLARE
  referral_record RECORD;
  reward_amount INTEGER := 50000; -- 50,000 UZS default reward
BEGIN
  -- Only process if order is approved and is a first order
  IF NEW.status = 'approved' AND NEW.is_first_order = true AND NEW.referral_id IS NOT NULL THEN

    -- Get referral record
    SELECT * INTO referral_record FROM referrals WHERE id = NEW.referral_id;

    -- Only process if referral is still pending
    IF referral_record.status = 'pending' THEN

      -- Update referral to completed
      UPDATE referrals
      SET
        status = 'completed',
        first_order_id = NEW.id,
        completed_at = NOW()
      WHERE id = NEW.referral_id;

      -- Award bonus points to referrer
      UPDATE users
      SET bonus_points = COALESCE(bonus_points, 0) + reward_amount
      WHERE id = referral_record.referrer_id;

      -- Mark as rewarded
      UPDATE referrals
      SET
        status = 'rewarded',
        reward_amount = reward_amount,
        rewarded_at = NOW()
      WHERE id = NEW.referral_id;

      RAISE NOTICE 'Awarded % bonus points to user % for referral %',
        reward_amount, referral_record.referrer_id, NEW.referral_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-award on order approval
-- ============================================

DROP TRIGGER IF EXISTS trigger_award_referral_bonus ON orders;

CREATE TRIGGER trigger_award_referral_bonus
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION award_referral_bonus();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE referrals IS 'Tracks user referrals and rewards';
COMMENT ON COLUMN referrals.status IS 'pending: user signed up, completed: first order placed, rewarded: bonus awarded';
COMMENT ON COLUMN orders.referral_id IS 'Links order to referral if user was referred';
COMMENT ON COLUMN orders.is_first_order IS 'True if this is the user''s first approved order';

-- ============================================
-- VERIFICATION
-- ============================================

-- Show referrals table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'referrals'
ORDER BY ordinal_position;

-- Show updated orders columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name IN ('referral_id', 'is_first_order');
