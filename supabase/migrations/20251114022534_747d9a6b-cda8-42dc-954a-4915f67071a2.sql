-- Create profiles table for user additional information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  position TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add approved column to user_roles
ALTER TABLE public.user_roles ADD COLUMN approved BOOLEAN DEFAULT false;
ALTER TABLE public.user_roles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Masters can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can insert profiles on signup"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update the trigger to NOT automatically add master role
DROP TRIGGER IF EXISTS on_auth_user_created_add_master ON auth.users;

-- Create new trigger function that creates profile and pending role
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user role as pending (not approved)
  INSERT INTO public.user_roles (user_id, role, approved)
  VALUES (NEW.id, 'master', false);
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();

-- Create default master account
-- Note: This will create the auth user entry, but password needs to be set through Supabase Auth
DO $$
DECLARE
  master_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO master_user_id FROM auth.users WHERE email = 'ik0630@mnccom.com';
  
  IF master_user_id IS NULL THEN
    -- Insert into auth.users is not allowed directly
    -- We'll need to handle this through the signup process
    RAISE NOTICE 'Default master account needs to be created through signup';
  ELSE
    -- If user exists, make sure they have master role and are approved
    INSERT INTO public.user_roles (user_id, role, approved)
    VALUES (master_user_id, 'master', true)
    ON CONFLICT (user_id, role) 
    DO UPDATE SET approved = true;
    
    RAISE NOTICE 'Default master account role updated';
  END IF;
END $$;