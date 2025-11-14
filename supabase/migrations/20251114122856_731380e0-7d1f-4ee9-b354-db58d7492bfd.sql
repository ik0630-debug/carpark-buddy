-- Update initialize_project_defaults function to include custom fields settings
CREATE OR REPLACE FUNCTION public.initialize_project_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default page settings including custom fields
  INSERT INTO public.page_settings (project_id, setting_key, setting_value)
  VALUES 
    (NEW.id, 'title_text', 'M&C Communications
주차 등록 시스템'),
    (NEW.id, 'title_font_size', '36'),
    (NEW.id, 'custom_fields_enabled', 'false'),
    (NEW.id, 'custom_fields_config', '[]');

  -- Insert default parking types
  INSERT INTO public.parking_types (project_id, name, hours, sort_order)
  VALUES 
    (NEW.id, '1시간', 1, 1),
    (NEW.id, '4시간', 4, 2),
    (NEW.id, '종일권', 24, 3),
    (NEW.id, '번호없음', 0, 4),
    (NEW.id, '거부', 0, 5);

  RETURN NEW;
END;
$function$;