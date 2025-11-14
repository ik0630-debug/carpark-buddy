-- Create function to automatically add master role on signup
CREATE OR REPLACE FUNCTION public.handle_new_master_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'master');
  RETURN NEW;
END;
$$;

-- Create trigger to add master role on user creation
CREATE TRIGGER on_auth_user_created_add_master
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_master_user();