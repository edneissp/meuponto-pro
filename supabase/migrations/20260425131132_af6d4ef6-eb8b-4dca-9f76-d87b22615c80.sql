ALTER TABLE public.fiscal_api_config
ADD COLUMN IF NOT EXISTS fiscal_enabled BOOLEAN NOT NULL DEFAULT false;

UPDATE public.fiscal_api_config
SET fiscal_enabled = true
WHERE status = 'active'
  AND api_key_encrypted IS NOT NULL
  AND api_key_encrypted <> '';

CREATE INDEX IF NOT EXISTS idx_fiscal_api_config_enabled
ON public.fiscal_api_config (tenant_id, fiscal_enabled);