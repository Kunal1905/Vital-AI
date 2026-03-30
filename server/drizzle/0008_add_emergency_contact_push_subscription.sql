ALTER TABLE "emergency_contacts"
ADD COLUMN IF NOT EXISTS "push_subscription_id" text;
