-- 1. Create booking_occupants table (The "Stay Entity")
CREATE TABLE IF NOT EXISTS public.booking_occupants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  identification_number TEXT, -- CNIC or Passport
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for booking_occupants
ALTER TABLE public.booking_occupants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view occupants"
ON public.booking_occupants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage occupants"
ON public.booking_occupants FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'reception'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'reception'));


-- 2. DATA CLEANUP: Merge duplicate keys in 'guests' table (Customers)
-- Strategy: Identify duplicates by (email). Keep the oldest record (or one with most data). 
-- Move bookings to the 'primary' guest. Delete duplicates.

DO $$
DECLARE
    r RECORD;
    primary_id UUID;
BEGIN
    -- Loop through guests with duplicate emails (ignoring nulls)
    FOR r IN 
        SELECT email, array_agg(id ORDER BY created_at ASC) as ids
        FROM public.guests 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email 
        HAVING COUNT(*) > 1
    LOOP
        -- First ID is the primary (oldest)
        primary_id := r.ids[1];
        
        -- Update stats on primary
        -- (Ideally we sum total_stays etc, but for now let's just reassign bookings)
        
        -- Reassign bookings from other IDs to primary_id
        UPDATE public.bookings 
        SET guest_id = primary_id 
        WHERE guest_id = ANY(r.ids[2:]);
        
        -- Reassign invoices
        UPDATE public.invoices
        SET guest_id = primary_id
        WHERE guest_id = ANY(r.ids[2:]);

        -- Delete the duplicates
        DELETE FROM public.guests WHERE id = ANY(r.ids[2:]);
        
        RAISE NOTICE 'Merged duplicates for email: %', r.email;
    END LOOP;
    
    -- Same for Phone Numbers
    FOR r IN 
        SELECT phone, array_agg(id ORDER BY created_at ASC) as ids
        FROM public.guests 
        WHERE phone IS NOT NULL AND phone != ''
        GROUP BY phone 
        HAVING COUNT(*) > 1
    LOOP
        primary_id := r.ids[1];
        
        UPDATE public.bookings SET guest_id = primary_id WHERE guest_id = ANY(r.ids[2:]);
        UPDATE public.invoices SET guest_id = primary_id WHERE guest_id = ANY(r.ids[2:]);
        
        DELETE FROM public.guests WHERE id = ANY(r.ids[2:]);
        
        RAISE NOTICE 'Merged duplicates for phone: %', r.phone;
    END LOOP;
END $$;

-- 3. Recalculate Stats for all guests
UPDATE public.guests g
SET 
    total_stays = (SELECT COUNT(*) FROM public.bookings b WHERE b.guest_id = g.id AND b.status IN ('checked_in', 'checked_out')),
    total_spent = (SELECT COALESCE(SUM(total_amount), 0) FROM public.bookings b WHERE b.guest_id = g.id),
    last_stay_at = (SELECT MAX(check_out) FROM public.bookings b WHERE b.guest_id = g.id);
