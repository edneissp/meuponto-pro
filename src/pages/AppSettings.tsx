import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload, Palette, Store, QrCode, Copy, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTenantTheme } from "@/hooks/use-tenant-theme";

const PRESET_COLORS = [
  "#F97316", "#EF4444", "#8B5CF6", "#3B82F6",
  "#10B981", "#F59E0B", "#EC4899", "#14B8A6",
];

const AppSettings = () => {
  const { toast } = useToast();
  const { applyColor } = useTenantTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#F97316");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState("0");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", session.user.id)
        .single();
      if (!profile) return;
      setTenantId(profile.tenant_id);
      const { data: tenant } = await supabase
        .from("tenants")
        .select("name, primary_color, logo_url")
        .eq("id", profile.tenant_id)
        .single();
      if (tenant) {
        setName(tenant.name);
        setPrimaryColor(tenant.primary_color || "#F97316");
        setLogoUrl(tenant.logo_url);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Apply color in real-time when selecting
  const handleColorChange = (color: string) => {
    setPrimaryColor(color);
    applyColor(color);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({ name, primary_color: primaryColor, logo_url: logoUrl })
      .eq("id", tenantId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      // Apply theme after save to ensure persistence
      applyColor(primaryColor);
      toast({ title: "Configurações salvas!" });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);
    setLogoUrl(publicUrl);
    setUploading(false);
    toast({ title: "Logo enviado!" });
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      {/* Store Name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5 text-primary" />
            Nome do Estabelecimento
          </CardTitle>
          <CardDescription>O nome exibido no sistema e para seus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Lanchonete do João" />
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5 text-primary" />
            Logo
          </CardTitle>
          <CardDescription>Faça upload do logo do seu estabelecimento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl && (
            <div className="flex items-center gap-4">
              <img src={logoUrl} alt="Logo" className="h-20 w-20 rounded-lg object-cover border border-border" />
              <Button variant="outline" size="sm" onClick={() => setLogoUrl(null)}>
                Remover
              </Button>
            </div>
          )}
          <div>
            <Label htmlFor="logo-upload" className="cursor-pointer">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? "Enviando..." : "Clique para enviar uma imagem"}
                </p>
              </div>
            </Label>
            <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
          </div>
        </CardContent>
      </Card>

      {/* Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            Cor Principal
          </CardTitle>
          <CardDescription>Escolha a cor que representa sua marca. A mudança é aplicada em tempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                className="h-10 w-10 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: primaryColor === c ? "hsl(var(--foreground))" : "transparent",
                  transform: primaryColor === c ? "scale(1.15)" : undefined,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Label>Personalizada:</Label>
            <input type="color" value={primaryColor} onChange={(e) => handleColorChange(e.target.value)} className="h-10 w-10 rounded cursor-pointer border-0" />
            <span className="text-sm text-muted-foreground font-mono">{primaryColor}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Preview:</span>
            <div className="h-10 px-6 rounded-lg flex items-center text-sm font-medium text-white" style={{ backgroundColor: primaryColor }}>
              Botão de exemplo
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Cardápio Digital */}
      {tenantId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="h-5 w-5 text-primary" />
              Cardápio Digital
            </CardTitle>
            <CardDescription>Compartilhe o QR Code para seus clientes acessarem o cardápio online.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG
                  value={`${window.location.origin}/menu/${tenantId}`}
                  size={180}
                  fgColor="#000"
                  level="H"
                />
              </div>
              <div className="space-y-3 text-center sm:text-left">
                <p className="text-sm text-muted-foreground">
                  Link do cardápio:
                </p>
                <code className="block text-xs bg-muted p-2 rounded break-all">
                  {window.location.origin}/menu/{tenantId}
                </code>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/menu/${tenantId}`);
                      toast({ title: "Link copiado!" });
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/menu/${tenantId}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" /> Abrir
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        <Save className="h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};

export default AppSettings;
