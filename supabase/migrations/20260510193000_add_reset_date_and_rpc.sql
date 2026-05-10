ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION increment_generations_used(user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (id, generations_used, tier, last_reset_date, created_at, updated_at)
  VALUES (user_id, 1, 'beta_free', NOW(), NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET 
    generations_used = CASE 
      WHEN public.profiles.last_reset_date IS NULL OR date_trunc('month', public.profiles.last_reset_date) < date_trunc('month', NOW()) THEN 1
      ELSE public.profiles.generations_used + 1
    END,
    last_reset_date = CASE 
      WHEN public.profiles.last_reset_date IS NULL OR date_trunc('month', public.profiles.last_reset_date) < date_trunc('month', NOW()) THEN NOW()
      ELSE public.profiles.last_reset_date
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
