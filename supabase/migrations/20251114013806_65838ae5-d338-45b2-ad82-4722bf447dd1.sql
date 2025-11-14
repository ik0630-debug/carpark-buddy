-- Remove applicant_name and applicant_phone columns from parking_applications table
ALTER TABLE public.parking_applications 
DROP COLUMN IF EXISTS applicant_name,
DROP COLUMN IF EXISTS applicant_phone;