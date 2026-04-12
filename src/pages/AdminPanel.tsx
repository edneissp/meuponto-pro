import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, ArrowLeft, Users, Building2, CheckCircle, Clock, XCircle, Gift, Tag, Trash2, CalendarDays, CalendarRange, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import DeleteTenantDialog from "@/components/admin/DeleteTenantDialog";
import AdminHealthPanel from "@/components/admin/AdminHealthPanel";

type Tenant = {
  id: string;
  name: string;
  subscription_status: string;
  created_at: string;
  primary_color: string | null;
  logo_url: string | null;
  deleted_at: string | null;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "active", label: "Ativo" },
  { value: "free", label: "Gratuito" },
  { value: "suspended", label: "Suspenso" },
];

const statusConfig: Record<string, { icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { icon: Clock, variant: "outline" },
  active: { icon: CheckCircle, variant: "default" },
  free: { icon: Gift, variant: "secondary" },
  suspended: { icon: XCircle, variant: "destructive" },
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin");

      if (!data || data.length === 0) {
        toast.error("Acesso negado");
        navigate("/app");
        return;
      }

      setIsAdmin(true);
      loadTenants();
    };
    check();
  }, [navigate]);

  const loadTenants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar tenants");
    } else {
      setTenants((data || []) as Tenant[]);
    }
    setLoading(false);
  };

  const updateStatus = async (tenantId: string, status: string) => {
    const { error } = await supabase
      .from("tenants")
      .update({ subscription_status: status })
      .eq("id", tenantId);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success("Status atualizado!");
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, subscription_status: status } : t));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from("tenants")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: session?.user?.id || null,
        subscription_status: "suspended",
        ativo: false,
      })
      .eq("id", deleteTarget.id);

    if (error) {
      toast.error("Erro ao excluir cadastro");
    } else {
      toast.success(`"${deleteTarget.name}" excluído com sucesso`);
      setTenants(prev => prev.filter(t => t.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.subscription_status === "active").length,
    pending: tenants.filter(t => t.subscription_status === "pending").length,
    free: tenants.filter(t => t.subscription_status === "free").length,
    newToday: tenants.filter(t => t.created_at >= startOfToday).length,
    newThisMonth: tenants.filter(t => t.created_at >= startOfMonth).length,
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Painel Administrativo</h1>
          <div className="ml-auto flex items-center gap-2">
            <AdminNotificationBell />
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/promotions")}>
              <Tag className="h-4 w-4 mr-1" /> Promoções
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Health Check */}
        <AdminHealthPanel />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.active}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">{stats.pending}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gratuitos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats.free}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Novos hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-500" />
                <span className="text-2xl font-bold">{stats.newToday}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">No mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-violet-500" />
                <span className="text-2xl font-bold">{stats.newThisMonth}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Estabelecimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estabelecimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead>Ações</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => {
                    const cfg = statusConfig[tenant.subscription_status] || statusConfig.pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {tenant.logo_url ? (
                              <img src={tenant.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium">{tenant.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_OPTIONS.find(s => s.value === tenant.subscription_status)?.label || tenant.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={tenant.subscription_status}
                            onValueChange={(val) => updateStatus(tenant.id, val)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(tenant)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {tenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum estabelecimento cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <DeleteTenantDialog
        open={!!deleteTarget}
        tenantName={deleteTarget?.name || ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default AdminPanel;
