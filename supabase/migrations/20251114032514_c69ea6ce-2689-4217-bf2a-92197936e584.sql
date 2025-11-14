-- Add foreign key constraints with CASCADE delete for project-related tables

-- Add foreign key for parking_applications
ALTER TABLE public.parking_applications
DROP CONSTRAINT IF EXISTS parking_applications_project_id_fkey;

ALTER TABLE public.parking_applications
ADD CONSTRAINT parking_applications_project_id_fkey
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Add foreign key for parking_types
ALTER TABLE public.parking_types
DROP CONSTRAINT IF EXISTS parking_types_project_id_fkey;

ALTER TABLE public.parking_types
ADD CONSTRAINT parking_types_project_id_fkey
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Add foreign key for page_settings
ALTER TABLE public.page_settings
DROP CONSTRAINT IF EXISTS page_settings_project_id_fkey;

ALTER TABLE public.page_settings
ADD CONSTRAINT page_settings_project_id_fkey
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;