-- Migration 015: Simplify parent registration fields
-- Make emergency contact, occupation, and relationship nullable with sensible defaults

ALTER TABLE registration_requests ALTER COLUMN occupation DROP NOT NULL;
ALTER TABLE registration_requests ALTER COLUMN relationship_to_child DROP NOT NULL;
ALTER TABLE registration_requests ALTER COLUMN emergency_contact_name DROP NOT NULL;
ALTER TABLE registration_requests ALTER COLUMN emergency_contact_relationship DROP NOT NULL;
ALTER TABLE registration_requests ALTER COLUMN emergency_contact_phone DROP NOT NULL;

ALTER TABLE registration_requests ALTER COLUMN occupation SET DEFAULT 'Not Specified';
ALTER TABLE registration_requests ALTER COLUMN relationship_to_child SET DEFAULT 'Parent';
