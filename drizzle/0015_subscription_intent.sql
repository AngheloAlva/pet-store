-- F3.5 Suscripciones — Migration 0015
-- Adds subscription_intent JSONB column to checkout_sessions.
-- Stores {variantId, productId, frequencyDays, discountPercent} when user
-- selected a subscription on the PDP. confirm-order reads this after order commit.

ALTER TABLE "checkout_sessions" ADD COLUMN "subscription_intent" jsonb;
