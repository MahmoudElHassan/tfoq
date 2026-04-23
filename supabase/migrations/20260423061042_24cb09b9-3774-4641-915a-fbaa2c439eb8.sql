CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  v_active boolean;
BEGIN
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student');
  v_active := CASE WHEN user_role = 'teacher' THEN false ELSE true END;

  INSERT INTO public.profiles (id, full_name, email, phone, grade, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'grade',
    v_active
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, user_role);
  RETURN NEW;
END;
$function$;