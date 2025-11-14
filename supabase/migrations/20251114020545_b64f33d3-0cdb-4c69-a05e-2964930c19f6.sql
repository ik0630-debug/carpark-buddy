-- Add sort_order column to parking_types
ALTER TABLE public.parking_types 
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Update sort order for existing types
UPDATE public.parking_types 
SET sort_order = 999 
WHERE project_id = 'ea60ee65-2575-49b1-88ac-85e585fcc369';