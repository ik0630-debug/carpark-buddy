-- Function to initialize default settings for a new project
CREATE OR REPLACE FUNCTION public.initialize_project_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default page settings
  INSERT INTO public.page_settings (project_id, setting_key, setting_value)
  VALUES 
    (NEW.id, 'title_text', 'M&C Communications
주차 등록 시스템'),
    (NEW.id, 'title_font_size', '36');

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
$$;

-- Trigger to call the function when a new project is created
DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_project_defaults();