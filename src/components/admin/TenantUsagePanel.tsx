import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Users, Flame, Snowflake, Thermometer, Sparkles, Eye, CheckCircle, XCircle } from "lucide-react";

type UsageRow = {
  tenant_id: string;
  last_login_at: string | null;
  login_count: number;
  last_activity_at: string | null;
  actions_count: number;
  is_trial: boolean;
  trial_started_at: string | null;
  is_activated: boolean;
  activated_at: string | null;
  tenant_name?: string;
};

const classify = (lastActivity: string | null): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any } => {
  if (!lastActivity) return { label: "Sem dados", variant: "outline", icon: Snowflake };
  const days = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 2) return { label: "Ativo", variant: "default", icon: Flame };
  if (days <= 7) return { label: "Morno", variant: "secondary", icon: Thermometer };
  return { label: "Frio", variant: "destructive", icon: Snowflake };
};

const classifyTrial = (r: UsageRow): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any } => {
  if (!r.last_login_at) return { label: "Novo", variant: "outline", icon: Sparkles };
  if (!r.is_activated) return { label: "Curioso", variant: "secondary", icon: Eye };
  const days = r.last_activity_at ? (Date.now() - new Date(r.last_activity_at).getTime()) / (1000 * 60 * 60 * 24) : 999;
  if (days > 7) return { label: "Abandonado", variant: "destructive", icon: XCircle };
  return { label: "Ativado", variant: "default", icon: CheckCircle };
};

const TenantUsagePanel = () => {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [usageRes, tenantsRes] = await Promise.all([
        (supabase.from("tenant_usage") as any).select("*").order("last_activity_at", { ascending: false, nullsFirst: false }),
        supabase.from("tenants").select("id, name").is("deleted_at", null),
      ]);
      const tenantMap = new Map((tenantsRes.data || []).map((t: any) => [t.id, t.name]));
      const merged: UsageRow[] = (usageRes.data || []).map((u: any) => ({
        ...u,
        tenant_name: tenantMap.get(u.tenant_id) || "—",
      }));
      setRows(merged);
      setLoading(false);
    };
    load();
  }, []);

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const stats = {
    activeToday: rows.filter(r => r.last_activity_at && new Date(r.last_activity_at).getTime() >= startOfToday).length,
    activeMonth: rows.filter(r => r.last_activity_at && new Date(r.last_activity_at).getTime() >= startOfMonth).length,
    inactive: rows.filter(r => !r.last_activity_at || new Date(r.last_activity_at).getTime() < sevenDaysAgo).length,
  };

  const trials = rows.filter(r => r.is_trial);
  const trialStats = {
    created: trials.length,
    active: trials.filter(r => r.last_activity_at && new Date(r.last_activity_at).getTime() >= sevenDaysAgo).length,
    activated: trials.filter(r => r.is_activated).length,
    abandoned: trials.filter(r => !r.last_activity_at || new Date(r.last_activity_at).getTime() < sevenDaysAgo).length,
  };

  const renderTable = (data: UsageRow[], trial: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Estabelecimento</TableHead>
          <TableHead>Último acesso</TableHead>
          <TableHead>Logins</TableHead>
          <TableHead>Ações</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((r) => {
          const cls = trial ? classifyTrial(r) : classify(r.last_activity_at);
          const Icon = cls.icon;
          return (
            <TableRow key={r.tenant_id}>
              <TableCell className="font-medium">{r.tenant_name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {r.last_activity_at ? new Date(r.last_activity_at).toLocaleString("pt-BR") : "—"}
              </TableCell>
              <TableCell>{r.login_count}</TableCell>
              <TableCell>{r.actions_count}</TableCell>
              <TableCell>
                <Badge variant={cls.variant} className="gap-1">
                  <Icon className="h-3 w-3" />
                  {cls.label}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
        {data.length === 0 && (
          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">Nenhum dado</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <Tabs defaultValue="usage" className="space-y-4">
      <TabsList>
        <TabsTrigger value="usage">Uso geral</TabsTrigger>
        <TabsTrigger value="trials">Trials</TabsTrigger>
      </TabsList>

      <TabsContent value="usage" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ativos hoje</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" /><span className="text-2xl font-bold">{stats.activeToday}</span></div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ativos no mês</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-green-500" /><span className="text-2xl font-bold">{stats.activeMonth}</span></div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Inativos (7+ dias)</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Snowflake className="h-5 w-5 text-blue-400" /><span className="text-2xl font-bold">{stats.inactive}</span></div></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5" /> Uso por estabelecimento</CardTitle></CardHeader>
          <CardContent>{loading ? <p className="text-muted-foreground text-center py-6 text-sm">Carregando...</p> : renderTable(rows, false)}</CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trials" className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Trials criados</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-500" /><span className="text-2xl font-bold">{trialStats.created}</span></div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ativos (7d)</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" /><span className="text-2xl font-bold">{trialStats.active}</span></div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ativados</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span className="text-2xl font-bold">{trialStats.activated}</span></div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Abandonados</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" /><span className="text-2xl font-bold">{trialStats.abandoned}</span></div></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-5 w-5" /> Comportamento dos trials</CardTitle></CardHeader>
          <CardContent>{loading ? <p className="text-muted-foreground text-center py-6 text-sm">Carregando...</p> : renderTable(trials, true)}</CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default TenantUsagePanel;
