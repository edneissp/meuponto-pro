import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Pencil, Trash2, Pause, Play, Tag, Ticket, BarChart3,
  Users, DollarSign, TrendingUp, Copy, Shield
} from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  discount_price: number;
  normal_price: number;
  currency: string;
  duration_days: number;
  max_users: number;
  current_users: number;
  status: string;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
};

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  currency: string;
  campaign_id: string | null;
  usage_limit: number;
  used_count: number;
  expires_at: string | null;
  status: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  expired: "Expirado",
  paused: "Pausado",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  expired: "destructive",
  paused: "outline",
};

const couponTypeLabels: Record<string, string> = {
  percentage: "Porcentagem",
  fixed_amount: "Valor fixo",
  special_offer: "Oferta especial",
};

const AdminPromotions = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Campaign form
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "", description: "", discount_price: "9.90", normal_price: "39.90",
    currency: "USD", duration_days: "90", max_users: "100",
    starts_at: new Date().toISOString().split("T")[0], ends_at: "",
  });

  // Coupon form
  const [couponDialog, setCouponDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: "", type: "percentage", value: "10", currency: "USD",
    campaign_id: "", usage_limit: "100", expires_at: "",
  });

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin");
      if (!data || data.length === 0) { toast.error("Acesso negado"); navigate("/app"); return; }
      setIsAdmin(true);
      loadData();
    };
    check();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    const [campRes, coupRes] = await Promise.all([
      supabase.from("discount_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("discount_coupons").select("*").order("created_at", { ascending: false }),
    ]);
    if (campRes.data) setCampaigns(campRes.data as Campaign[]);
    if (coupRes.data) setCoupons(coupRes.data as Coupon[]);
    setLoading(false);
  };

  // Campaign CRUD
  const openCampaignForm = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setCampaignForm({
        name: campaign.name,
        description: campaign.description || "",
        discount_price: String(campaign.discount_price),
        normal_price: String(campaign.normal_price),
        currency: campaign.currency,
        duration_days: String(campaign.duration_days),
        max_users: String(campaign.max_users),
        starts_at: campaign.starts_at.split("T")[0],
        ends_at: campaign.ends_at ? campaign.ends_at.split("T")[0] : "",
      });
    } else {
      setEditingCampaign(null);
      setCampaignForm({
        name: "", description: "", discount_price: "9.90", normal_price: "39.90",
        currency: "USD", duration_days: "90", max_users: "100",
        starts_at: new Date().toISOString().split("T")[0], ends_at: "",
      });
    }
    setCampaignDialog(true);
  };

  const saveCampaign = async () => {
    const payload = {
      name: campaignForm.name,
      description: campaignForm.description || null,
      discount_price: parseFloat(campaignForm.discount_price),
      normal_price: parseFloat(campaignForm.normal_price),
      currency: campaignForm.currency,
      duration_days: parseInt(campaignForm.duration_days),
      max_users: parseInt(campaignForm.max_users),
      starts_at: new Date(campaignForm.starts_at).toISOString(),
      ends_at: campaignForm.ends_at ? new Date(campaignForm.ends_at).toISOString() : null,
    };

    if (editingCampaign) {
      const { error } = await supabase.from("discount_campaigns").update(payload).eq("id", editingCampaign.id);
      if (error) { toast.error("Erro ao atualizar campanha"); return; }
      toast.success("Campanha atualizada!");
    } else {
      const { error } = await supabase.from("discount_campaigns").insert(payload);
      if (error) { toast.error("Erro ao criar campanha"); return; }
      toast.success("Campanha criada!");
    }
    setCampaignDialog(false);
    loadData();
  };

  const toggleCampaignStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    const { error } = await supabase.from("discount_campaigns").update({ status: newStatus }).eq("id", campaign.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(`Campanha ${newStatus === "active" ? "ativada" : "pausada"}!`);
    loadData();
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Excluir esta campanha?")) return;
    const { error } = await supabase.from("discount_campaigns").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Campanha excluída!");
    loadData();
  };

  // Coupon CRUD
  const openCouponForm = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm({
        code: coupon.code,
        type: coupon.type,
        value: String(coupon.value),
        currency: coupon.currency,
        campaign_id: coupon.campaign_id || "",
        usage_limit: String(coupon.usage_limit),
        expires_at: coupon.expires_at ? coupon.expires_at.split("T")[0] : "",
      });
    } else {
      setEditingCoupon(null);
      setCouponForm({
        code: "", type: "percentage", value: "10", currency: "USD",
        campaign_id: "", usage_limit: "100", expires_at: "",
      });
    }
    setCouponDialog(true);
  };

  const saveCoupon = async () => {
    const payload = {
      code: couponForm.code.toUpperCase().trim(),
      type: couponForm.type,
      value: parseFloat(couponForm.value),
      currency: couponForm.currency,
      campaign_id: couponForm.campaign_id || null,
      usage_limit: parseInt(couponForm.usage_limit),
      expires_at: couponForm.expires_at ? new Date(couponForm.expires_at).toISOString() : null,
    };

    if (editingCoupon) {
      const { error } = await supabase.from("discount_coupons").update(payload).eq("id", editingCoupon.id);
      if (error) { toast.error("Erro ao atualizar cupom"); return; }
      toast.success("Cupom atualizado!");
    } else {
      const { error } = await supabase.from("discount_coupons").insert(payload);
      if (error) { toast.error("Erro ao criar cupom"); return; }
      toast.success("Cupom criado!");
    }
    setCouponDialog(false);
    loadData();
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    const { error } = await supabase.from("discount_coupons").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Cupom excluído!");
    loadData();
  };

  // Stats
  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const totalCouponsUsed = coupons.reduce((sum, c) => sum + c.used_count, 0);
  const totalSlotsRemaining = activeCampaigns.reduce((sum, c) => sum + (c.max_users - c.current_users), 0);
  const projectedRevenue = activeCampaigns.reduce((sum, c) => sum + c.discount_price * (c.max_users - c.current_users), 0);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Tag className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Promoções & Cupons</h1>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Campanhas Ativas</CardTitle></CardHeader>
            <CardContent><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{activeCampaigns.length}</span></div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cupons Utilizados</CardTitle></CardHeader>
            <CardContent><div className="flex items-center gap-2"><Ticket className="h-5 w-5 text-green-500" /><span className="text-2xl font-bold">{totalCouponsUsed}</span></div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vagas Restantes</CardTitle></CardHeader>
            <CardContent><div className="flex items-center gap-2"><Users className="h-5 w-5 text-yellow-500" /><span className="text-2xl font-bold">{totalSlotsRemaining}</span></div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Receita Prevista</CardTitle></CardHeader>
            <CardContent><div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-blue-500" /><span className="text-2xl font-bold">${projectedRevenue.toFixed(2)}</span></div></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns"><Tag className="h-4 w-4 mr-1" /> Campanhas</TabsTrigger>
            <TabsTrigger value="coupons"><Ticket className="h-4 w-4 mr-1" /> Cupons</TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openCampaignForm()}><Plus className="h-4 w-4 mr-1" /> Nova Campanha</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Carregando...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Preço Promo</TableHead>
                        <TableHead>Preço Normal</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Uso</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.currency} {c.discount_price}</TableCell>
                          <TableCell>{c.currency} {c.normal_price}</TableCell>
                          <TableCell>{c.duration_days} dias</TableCell>
                          <TableCell>
                            <span className="font-semibold">{c.current_users}</span>/{c.max_users}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariants[c.status] || "outline"}>
                              {statusLabels[c.status] || c.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openCampaignForm(c)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => toggleCampaignStatus(c)}>
                                {c.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteCampaign(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {campaigns.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma campanha criada</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openCouponForm()}><Plus className="h-4 w-4 mr-1" /> Novo Cupom</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Carregando...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Uso</TableHead>
                        <TableHead>Expira em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coupons.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="font-mono font-bold text-primary">{c.code}</code>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copiado!"); }}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{couponTypeLabels[c.type] || c.type}</TableCell>
                          <TableCell>{c.type === "percentage" ? `${c.value}%` : `${c.currency} ${c.value}`}</TableCell>
                          <TableCell><span className="font-semibold">{c.used_count}</span>/{c.usage_limit}</TableCell>
                          <TableCell>{c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariants[c.status] || "outline"}>{statusLabels[c.status] || c.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openCouponForm(c)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteCoupon(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {coupons.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum cupom criado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Campaign Dialog */}
        <Dialog open={campaignDialog} onOpenChange={setCampaignDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={campaignForm.name} onChange={e => setCampaignForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Primeiros 100" /></div>
              <div><Label>Descrição</Label><Textarea value={campaignForm.description} onChange={e => setCampaignForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição da campanha" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Preço Promocional</Label><Input type="number" step="0.01" value={campaignForm.discount_price} onChange={e => setCampaignForm(f => ({ ...f, discount_price: e.target.value }))} /></div>
                <div><Label>Preço Normal</Label><Input type="number" step="0.01" value={campaignForm.normal_price} onChange={e => setCampaignForm(f => ({ ...f, normal_price: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Moeda</Label>
                  <Select value={campaignForm.currency} onValueChange={v => setCampaignForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="BRL">BRL</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Duração (dias)</Label><Input type="number" value={campaignForm.duration_days} onChange={e => setCampaignForm(f => ({ ...f, duration_days: e.target.value }))} /></div>
                <div><Label>Máx. Usuários</Label><Input type="number" value={campaignForm.max_users} onChange={e => setCampaignForm(f => ({ ...f, max_users: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Início</Label><Input type="date" value={campaignForm.starts_at} onChange={e => setCampaignForm(f => ({ ...f, starts_at: e.target.value }))} /></div>
                <div><Label>Fim (opcional)</Label><Input type="date" value={campaignForm.ends_at} onChange={e => setCampaignForm(f => ({ ...f, ends_at: e.target.value }))} /></div>
              </div>
              <Button onClick={saveCampaign} className="w-full">{editingCampaign ? "Salvar" : "Criar Campanha"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Coupon Dialog */}
        <Dialog open={couponDialog} onOpenChange={setCouponDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Código</Label><Input value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="Ex: WELCOME10" className="font-mono" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={couponForm.type} onValueChange={v => setCouponForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed_amount">Valor fixo</SelectItem>
                      <SelectItem value="special_offer">Oferta especial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Valor</Label><Input type="number" step="0.01" value={couponForm.value} onChange={e => setCouponForm(f => ({ ...f, value: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Moeda</Label>
                  <Select value={couponForm.currency} onValueChange={v => setCouponForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="BRL">BRL</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Limite de uso</Label><Input type="number" value={couponForm.usage_limit} onChange={e => setCouponForm(f => ({ ...f, usage_limit: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Campanha vinculada (opcional)</Label>
                <Select value={couponForm.campaign_id} onValueChange={v => setCouponForm(f => ({ ...f, campaign_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Expira em (opcional)</Label><Input type="date" value={couponForm.expires_at} onChange={e => setCouponForm(f => ({ ...f, expires_at: e.target.value }))} /></div>
              <Button onClick={saveCoupon} className="w-full">{editingCoupon ? "Salvar" : "Criar Cupom"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminPromotions;
