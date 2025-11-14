-- projects 테이블 생성
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view projects" 
  ON public.projects 
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create projects" 
  ON public.projects 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update projects" 
  ON public.projects 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Anyone can delete projects" 
  ON public.projects 
  FOR DELETE 
  USING (true);

-- 기본 프로젝트 생성
INSERT INTO public.projects (name, description) 
VALUES ('기본 프로젝트', '초기 생성된 기본 프로젝트입니다.');

-- parking_applications에 project_id 추가
ALTER TABLE public.parking_applications 
  ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- 기존 데이터를 기본 프로젝트에 연결
UPDATE public.parking_applications 
SET project_id = (SELECT id FROM public.projects LIMIT 1)
WHERE project_id IS NULL;

-- project_id를 NOT NULL로 변경
ALTER TABLE public.parking_applications 
  ALTER COLUMN project_id SET NOT NULL;

-- parking_types에 project_id 추가
ALTER TABLE public.parking_types 
  ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- 기존 데이터를 기본 프로젝트에 연결
UPDATE public.parking_types 
SET project_id = (SELECT id FROM public.projects LIMIT 1)
WHERE project_id IS NULL;

-- project_id를 NOT NULL로 변경
ALTER TABLE public.parking_types 
  ALTER COLUMN project_id SET NOT NULL;

-- page_settings에 project_id 추가
ALTER TABLE public.page_settings 
  ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- 기존 데이터를 기본 프로젝트에 연결
UPDATE public.page_settings 
SET project_id = (SELECT id FROM public.projects LIMIT 1)
WHERE project_id IS NULL;

-- project_id를 NOT NULL로 변경
ALTER TABLE public.page_settings 
  ALTER COLUMN project_id SET NOT NULL;

-- page_settings의 unique 제약 변경
ALTER TABLE public.page_settings 
  DROP CONSTRAINT IF EXISTS page_settings_setting_key_key;

ALTER TABLE public.page_settings 
  ADD CONSTRAINT page_settings_project_setting_key 
  UNIQUE (project_id, setting_key);