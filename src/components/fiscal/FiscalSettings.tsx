import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const REGIMES = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
  { value: "mei", label: "MEI" },
];

const FiscalSettings = () => {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    inscricao_estadual: "",
    regime_tributario: "simples_nacional",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
  });

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      const { data } = await supabase
        .from("fiscal_settings" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setForm({
          razao_social: d.razao_social || "",
          nome_fantasia: d.nome_fantasia || "",
          cnpj: d.cnpj || "",
          inscricao_estadual: d.inscricao_estadual || "",
          regime_tributario: d.regime_tributario || "simples_nacional",
          endereco: d.endereco || "",
          cidade: d.cidade || "",
          estado: d.estado || "",
          cep: d.cep || "",
        });
      }
      setLoading(false);
    };
    load();
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    const { data: existing } = await supabase
      .from("fiscal_settings" as any)
      .select("id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("fiscal_settings" as any)
        .update({ ...form } as any)
        .eq("tenant_id", tenantId));
    } else {
      ({ error } = await supabase
        .from("fiscal_settings" as any)
        .insert({ ...form, tenant_id: tenantId } as any));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações fiscais salvas" });
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações Fiscais da Empresa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Razão Social</Label>
            <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nome Fantasia</Label>
            <Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-2">
            <Label>Inscrição Estadual</Label>
            <Input value={form.inscricao_estadual} onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Regime Tributário</Label>
            <Select value={form.regime_tributario} onValueChange={(v) => setForm({ ...form, regime_tributario: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGIMES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>CEP</Label>
            <Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} placeholder="00000-000" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Estado (UF)</Label>
            <Input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} maxLength={2} placeholder="SP" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FiscalSettings;
