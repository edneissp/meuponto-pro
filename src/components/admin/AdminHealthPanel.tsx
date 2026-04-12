import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, ShieldAlert, CreditCard } from "lucide-react";

interface HealthStats {
  errorsLast24h: number;
  criticalErrors: number;
  loginFailures: number;
  paymentFailures: number;
}

const AdminHealthPanel = () => {
  const [stats, setStats] = useState<HealthStats>({
    errorsLast24h: 0,
    criticalErrors: 0,
    loginFailures: 0,
    paymentFailures: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [errorsRes, criticalRes, loginRes, paymentRes] = await Promise.all([
        (supabase.from("system_errors") as any).select("id", { count: "exact", head: true }).gte("created_at", since),
        (supabase.from("system_errors") as any).select("id", { count: "exact", head: true }).gte("created_at", since).eq("severity", "critical"),
        (supabase.from("system_errors") as any).select("id", { count: "exact", head: true }).gte("created_at", since).eq("module", "auth"),
        (supabase.from("system_errors") as any).select("id", { count: "exact", head: true }).gte("created_at", since).eq("module", "payment"),
      ]);

      setStats({
        errorsLast24h: errorsRes.count ?? 0,
        criticalErrors: criticalRes.count ?? 0,
        loginFailures: loginRes.count ?? 0,
        paymentFailures: paymentRes.count ?? 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;

  const items = [
    { label: "Erros 24h", value: stats.errorsLast24h, icon: Activity, color: stats.errorsLast24h > 0 ? "text-yellow-500" : "text-green-500" },
    { label: "Críticos", value: stats.criticalErrors, icon: AlertTriangle, color: stats.criticalErrors > 0 ? "text-destructive" : "text-green-500" },
    { label: "Falhas login", value: stats.loginFailures, icon: ShieldAlert, color: stats.loginFailures > 0 ? "text-yellow-500" : "text-green-500" },
    { label: "Falhas pagamento", value: stats.paymentFailures, icon: CreditCard, color: stats.paymentFailures > 0 ? "text-destructive" : "text-green-500" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Saúde do Sistema (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <item.icon className={`h-5 w-5 ${item.color}`} />
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminHealthPanel;
