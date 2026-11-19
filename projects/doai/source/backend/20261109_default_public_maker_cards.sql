-- New DOAI profiles are visible by default; existing privacy choices are preserved.
ALTER TABLE `doai_profiles` ALTER COLUMN `is_public` SET DEFAULT 1;
