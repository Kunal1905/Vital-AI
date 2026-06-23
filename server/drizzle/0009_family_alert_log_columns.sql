ALTER TABLE "family_alert_log"
  ADD COLUMN IF NOT EXISTS "trigger_type" text NOT NULL DEFAULT 'manual';

ALTER TABLE "family_alert_log"
  ADD COLUMN IF NOT EXISTS "message_template" text NOT NULL DEFAULT '';

ALTER TABLE "family_alert_log"
  ADD COLUMN IF NOT EXISTS "message_sent" text NOT NULL DEFAULT '';

ALTER TABLE "family_alert_log"
  ADD COLUMN IF NOT EXISTS "delivered" boolean NOT NULL DEFAULT false;

ALTER TABLE "family_alert_log"
  ADD COLUMN IF NOT EXISTS "delivery_error" text;

ALTER TABLE "family_alert_log"
  ADD COLUMN IF NOT EXISTS "sent_at" timestamp NOT NULL DEFAULT now();
