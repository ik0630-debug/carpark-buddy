-- Add unique constraint to page_settings table for project_id and setting_key
ALTER TABLE public.page_settings 
ADD CONSTRAINT page_settings_project_id_setting_key_unique 
UNIQUE (project_id, setting_key);