/**
 * Fiscal validation helpers (CPF/CNPJ + tenant fiscal settings).
 */
import { supabase } from "@/integrations/supabase/client";

export const onlyDigits = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

/** Validate CPF using official check-digit algorithm. */
export const isValidCPF = (raw: string): boolean => {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
};

/** Validate CNPJ using official check-digit algorithm. */
export const isValidCNPJ = (raw: string): boolean => {
  const cnpj = onlyDigits(raw);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(cnpj.slice(0, 12), w1);
  if (d1 !== parseInt(cnpj[12])) return false;
  const d2 = calc(cnpj.slice(0, 13), w2);
  return d2 === parseInt(cnpj[13]);
};

/** Returns true for a valid CPF (11) or CNPJ (14). */
export const isValidCpfCnpj = (raw: string): boolean => {
  const d = onlyDigits(raw);
  if (d.length === 11) return isValidCPF(d);
  if (d.length === 14) return isValidCNPJ(d);
  return false;
};

export const isValidCEP = (raw: string) => onlyDigits(raw).length === 8;
export const isValidUF = (raw: string) => /^[A-Za-z]{2}$/.test((raw || "").trim());

export interface TenantFiscalCheck {
  ok: boolean;
  missing: string[];
  settings: any | null;
  apiConfigured: boolean;
  fiscalEnabled: boolean;
}

/** Loads tenant fiscal_settings + fiscal_api_config and reports missing required fields. */
export const checkTenantFiscalReady = async (tenantId: string): Promise<TenantFiscalCheck> => {
  const [{ data: settings }, { data: config }] = await Promise.all([
    supabase.from("fiscal_settings" as any).select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("fiscal_api_config" as any).select("api_key_encrypted,status,fiscal_enabled").eq("tenant_id", tenantId).maybeSingle(),
  ]);

  const s = (settings || {}) as any;
  const missing: string[] = [];

  if (!s.cnpj || !isValidCNPJ(s.cnpj)) missing.push("CNPJ válido");
  if (!s.razao_social) missing.push("Razão Social");
  if (!s.regime_tributario) missing.push("Regime Tributário");
  if (!s.endereco) missing.push("Endereço");
  if (!s.cidade) missing.push("Cidade");
  if (!s.estado || !isValidUF(s.estado)) missing.push("Estado (UF)");
  if (!s.cep || !isValidCEP(s.cep)) missing.push("CEP válido");

  const apiConfigured = !!(config as any)?.api_key_encrypted;
  if (!apiConfigured) missing.push("API Key da Focus NFe");
  const fiscalEnabled = !!(config as any)?.fiscal_enabled && (config as any)?.status === "active";
  if (!fiscalEnabled) missing.push("Módulo fiscal ativo");

  return { ok: missing.length === 0, missing, settings: s, apiConfigured, fiscalEnabled };
};
