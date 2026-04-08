-- Fix: Add rejection_reason column and update reject_email RPC to store it

ALTER TABLE emails ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Recreate reject_email RPC with reason parameter
CREATE OR REPLACE FUNCTION reject_email(
  p_email_id uuid,
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reject all extractions
  UPDATE email_extractions
  SET verification_status = 'rejected',
      verified_by = p_user_id,
      verified_at = NOW()
  WHERE email_id = p_email_id;

  -- Reject the email with reason
  UPDATE emails
  SET verification_status = 'rejected',
      verified_by = p_user_id,
      verified_at = NOW(),
      rejection_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_email_id;
END;
$$;
