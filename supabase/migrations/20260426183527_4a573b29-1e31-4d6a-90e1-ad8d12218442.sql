CREATE OR REPLACE FUNCTION public.reserve_coupon_usage(_code text)
RETURNS TABLE(allowed boolean, usage_count integer, max_uses integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_code text := upper(trim(_code));
  current_count integer;
  current_max integer;
BEGIN
  INSERT INTO public.coupon_usage_counts (code, usage_count, max_uses)
  VALUES (normalized_code, 0, 100)
  ON CONFLICT (code) DO NOTHING;

  SELECT c.usage_count, c.max_uses
  INTO current_count, current_max
  FROM public.coupon_usage_counts c
  WHERE c.code = normalized_code
  FOR UPDATE;

  IF current_count >= current_max THEN
    allowed := false;
    usage_count := current_count;
    max_uses := current_max;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.coupon_usage_counts
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE code = normalized_code
  RETURNING coupon_usage_counts.usage_count, coupon_usage_counts.max_uses
  INTO usage_count, max_uses;

  allowed := true;
  RETURN NEXT;
END;
$$;