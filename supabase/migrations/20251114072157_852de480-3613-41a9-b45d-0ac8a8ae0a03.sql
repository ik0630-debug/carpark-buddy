-- Add dynamic fields support to parking applications
ALTER TABLE parking_applications 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Add index for better query performance on custom fields
CREATE INDEX IF NOT EXISTS idx_parking_applications_custom_fields 
ON parking_applications USING gin(custom_fields);

-- Insert default custom fields settings for existing projects
INSERT INTO page_settings (project_id, setting_key, setting_value)
SELECT DISTINCT id, 'custom_fields_enabled', 'false'
FROM projects
WHERE NOT EXISTS (
  SELECT 1 FROM page_settings 
  WHERE page_settings.project_id = projects.id 
  AND setting_key = 'custom_fields_enabled'
);

INSERT INTO page_settings (project_id, setting_key, setting_value)
SELECT DISTINCT id, 'custom_fields_config', '[]'
FROM projects
WHERE NOT EXISTS (
  SELECT 1 FROM page_settings 
  WHERE page_settings.project_id = projects.id 
  AND setting_key = 'custom_fields_config'
);