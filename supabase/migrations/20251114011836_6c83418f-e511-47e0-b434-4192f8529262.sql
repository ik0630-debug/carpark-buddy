-- projects 테이블에 slug 컬럼 추가
ALTER TABLE public.projects 
  ADD COLUMN slug text UNIQUE;

-- 기존 프로젝트에 slug 생성 (id의 앞 8자리 사용)
UPDATE public.projects 
SET slug = SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL;

-- slug를 NOT NULL로 변경
ALTER TABLE public.projects 
  ALTER COLUMN slug SET NOT NULL;

-- slug 인덱스 생성
CREATE INDEX idx_projects_slug ON public.projects(slug);