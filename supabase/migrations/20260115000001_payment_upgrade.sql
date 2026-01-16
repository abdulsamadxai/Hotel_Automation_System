-- ============================================
-- PAYMENT & INVOICE UPGRADE
-- ============================================

-- 1. INVOICES: Add support for line items and partial payments
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0.00;

-- 2. BOOKINGS: Add payment tracking
CREATE TYPE payment_status_type AS ENUM ('pending', 'partially_paid', 'paid', 'refunded');

-- Safely add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_type') THEN
        CREATE TYPE payment_status_type AS ENUM ('pending', 'partially_paid', 'paid', 'refunded');
    END IF;
END $$;

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_status payment_status_type DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0.00;

-- 3. REVENUE FUNCTION: accurate daily revenue
CREATE OR REPLACE FUNCTION get_daily_revenue(target_date DATE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total
  FROM public.invoices
  WHERE status = 'paid'
  AND DATE(paid_at) = target_date;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- 4. AUTOMATION: Update booking payment status when invoice is paid
CREATE OR REPLACE FUNCTION sync_booking_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.booking_id IS NOT NULL THEN
    UPDATE public.bookings 
    SET payment_status = 'paid', updated_at = NOW()
    WHERE id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_invoice_paid_update_booking
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_payment_status();
