-- Migration: Add visible column to categories table
-- Date: 2026-02-10
-- Description: Adds a boolean 'visible' field to categories to allow admins to hide/show categories

-- Add visible column with default value of true (all existing categories will be visible)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true;

-- Update any existing categories to be visible by default
UPDATE categories SET visible = true WHERE visible IS NULL;
