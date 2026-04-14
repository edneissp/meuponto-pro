import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Plug, CheckCircle2, XCircle, Eye, EyeOff, Copy } from "lucide-react";

const PROVIDERS = [
  { value: "focus_nfe", label: "Focus NFe" },
  { value: "nuvem_fiscal", label: "Nuvem Fiscal" },
];

const ENVIRONMENTS = [
  { value: "homologacao", label: "Homologação (Testes)" },
  { value: "producao", label: "Produção" },
];

const maskKey = (key: string | null) => {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
};

const FiscalApiConfig = () => {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [savedKeyMask, setSavedKeyMask] = useState("");
  const [savedSecretMask, setSavedSecretMask] = useState("");

  const [form, setForm] = useState({
    provider: "focus_nfe",
    environment: "homologacao",
    api_key: "",
    api_secret: "",
    status: "inactive",
    last_test_at: null as string | null,
    last_test_result: null as string | null,
  });

  const webhookUrl = tenantId
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fiscal-webhook/${tenantId}`
    : "";

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      const { data } = await supabase
        .from("fiscal_api_config" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setExistingId(d.id);
        setSavedKeyMask(maskKey(d.api_key_encrypted));
        setSavedSecretMask(maskKey(d.api_secret_encrypted));
        setForm({
          provider: d.provider || "focus_nfe",
          environment: d.environment || "homologacao",
          api_key: "",
          api_secret: "",
          status: d.status || "inactive",
          last_test_at: d.last_test_at,
          last_test_result: d.last_test_result,
        });
      }
      setLoading(false);
    };
    load();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const payload: any = {
        provider: form.provider,
        environment: form.environment,
      };
      if (form.api_key) payload.api_key_encrypted = form.api_key;
      if (form.api_secret) payload.api_secret_encrypted = form.api_secret;

      let error;
      if (existingId) {
        ({ error } = await supabase
          .from("fiscal_api_config" as any)
          .update(payload)
          .eq("tenant_id", tenantId));
      } else {
        ({ error } = await supabase
          .from("fiscal_api_config" as any)
          .insert({ ...payload, tenant_id: tenantId } as any));
      }

      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Configuração da API salva" });
        if (form.api_key) setSavedKeyMask(maskKey(form.api_key));
        if (form.api_secret) setSavedSecretMask(maskKey(form.api_secret));
        setForm(prev => ({ ...prev, api_key: "", api_secret: "" }));
        if (!existingId) {
          const { data: newData } = await supabase
            .from("fiscal_api_config" as any)
            .select("id")
            .eq("tenant_id", tenantId)
            .maybeSingle();
          if (newData) setExistingId((newData as any).id);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!tenantId) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("fiscal-webhook", {
        body: { action: "test_connection", tenant_id: tenantId },
      });

      const success = !error && data?.success;
      const resultText = success ? "success" : (data?.error || error?.message || "Falha na conexão");

      await supabase
        .from("fiscal_api_config" as any)
        .update({
          status: success ? "active" : "error",
          last_test_at: new Date().toISOString(),
          last_test_result: resultText,
        } as any)
        .eq("tenant_id", tenantId);

      setForm(prev => ({
        ...prev,
        status: success ? "active" : "error",
        last_test_at: new Date().toISOString(),
        last_test_result: resultText,
      }));

      toast({
        title: success ? "Integração ativa!" : "Falha na conexão",
        description: success ? "Conexão com o provedor fiscal verificada." : resultText,
        variant: success ? "default" : "destructive",
      });
    } catch {
      toast({ title: "Erro ao testar", description: "Não foi possível testar a conexão.", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "URL copiada!" });
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Integração API Fiscal
              </CardTitle>
              <CardDescription>Configure a conexão com seu provedor de notas fiscais</CardDescription>
            </div>
            {form.status === "active" && (
              <Badge variant="default" className="bg-primary text-primary-foreground">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Ativa
              </Badge>
            )}
            {form.status === "error" && (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" /> Erro
              </Badge>
            )}
            {form.status === "inactive" && (
              <Badge variant="secondary">Inativa</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provedor Fiscal</Label>
              <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ambiente</Label>
              <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  placeholder={savedKeyMask || "Insira sua API Key"}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {savedKeyMask && !form.api_key && (
                <p className="text-xs text-muted-foreground">Chave salva: {savedKeyMask}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>API Secret <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <div className="relative">
                <Input
                  type={showApiSecret ? "text" : "password"}
                  value={form.api_secret}
                  onChange={(e) => setForm({ ...form, api_secret: e.target.value })}
                  placeholder={savedSecretMask || "Insira seu API Secret"}
                />
                <button
                  type="button"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {savedSecretMask && !form.api_secret && (
                <p className="text-xs text-muted-foreground">Secret salvo: {savedSecretMask}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing || !existingId}>
              <Plug className="h-4 w-4 mr-2" />
              {testing ? "Testando..." : "Testar Conexão"}
            </Button>
          </div>

          {form.last_test_at && (
            <p className="text-xs text-muted-foreground">
              Último teste: {new Date(form.last_test_at).toLocaleString("pt-BR")} — {form.last_test_result === "success" ? "✅ Sucesso" : `❌ ${form.last_test_result}`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook URL</CardTitle>
          <CardDescription>Configure esta URL no painel do seu provedor fiscal para receber notificações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FiscalApiConfig;
