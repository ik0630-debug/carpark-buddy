-- Create settings table
CREATE TABLE public.page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view settings"
  ON public.page_settings
  FOR SELECT
  USING (true);

-- Allow insert and update for all (in production, restrict to admin only)
CREATE POLICY "Anyone can modify settings"
  ON public.page_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default settings
INSERT INTO public.page_settings (setting_key, setting_value) VALUES
  ('title_text', E'M&C Communications\n주차 등록 시스템'),
  ('title_font_size', '36');