-- Add password field to projects table
ALTER TABLE public.projects ADD COLUMN password TEXT;

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('master', 'user');

-- Create user_roles table for master users
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Masters can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Masters can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Update projects RLS policies
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can create projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can update projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can delete projects" ON public.projects;

CREATE POLICY "Anyone can view projects"
ON public.projects
FOR SELECT
USING (true);

CREATE POLICY "Only masters can create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Only masters can update projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Only masters can delete projects"
ON public.projects
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

-- Update parking_types RLS policies
DROP POLICY IF EXISTS "Anyone can view parking types" ON public.parking_types;
DROP POLICY IF EXISTS "Anyone can insert parking types" ON public.parking_types;
DROP POLICY IF EXISTS "Anyone can update parking types" ON public.parking_types;
DROP POLICY IF EXISTS "Anyone can delete parking types" ON public.parking_types;

CREATE POLICY "Anyone can view parking types"
ON public.parking_types
FOR SELECT
USING (true);

CREATE POLICY "Only authenticated can manage parking types"
ON public.parking_types
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Update page_settings RLS policies
DROP POLICY IF EXISTS "Anyone can view settings" ON public.page_settings;
DROP POLICY IF EXISTS "Anyone can modify settings" ON public.page_settings;

CREATE POLICY "Anyone can view settings"
ON public.page_settings
FOR SELECT
USING (true);

CREATE POLICY "Only masters can modify settings"
ON public.page_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));