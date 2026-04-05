import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  RefreshCw,
  UtensilsCrossed,
  ClipboardList,
  X,
} from "lucide-react";
import { toast } from "sonner";
import TableOrderPanel from "@/components/tables/TableOrderPanel";

interface Table {
  id: string;
  tenant_id: string;
  table_number: number;
  table_name: string | null;
  capacity: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ActiveOrder {
  id: string;
  order_number: number;
  total: number;
  status: string;
  created_at: string;
  order_items: { id: string; product_name: string; quantity: number; total: number; notes: string | null }[];
}

const statusConfig: Record<string, { label: string; color: string; emoji: string }> = {
  available: { label: "Livre", color: "bg-green-500/20 text-green-400 border-green-500/30", emoji: "🟢" },
  occupied: { label: "Ocupada", color: "bg-red-500/20 text-red-400 border-red-500/30", emoji: "🔴" },
  reserved: { label: "Reservada", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", emoji: "🟡" },
  closed: { label: "Encerrada", color: "bg-muted text-muted-foreground border-border", emoji: "⚫" },
};

const Tables = () => {
  const { tenantId } = useTenant();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formCapacity, setFormCapacity] = useState("4");
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeOrders, setActiveOrders] = useState<Record<string, ActiveOrder>>({});
  const [saving, setSaving] = useState(false);

  const loadTables = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("table_number");

    if (data) setTables(data as Table[]);
    if (error) toast.error("Erro ao carregar mesas");
    setLoading(false);
  }, [tenantId]);

  const loadActiveOrders = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("tenant_id", tenantId)
      .not("table_id", "is", null)
      .in("status", ["received", "preparing", "ready"])
      .order("created_at", { ascending: false });

    if (data) {
      const map: Record<string, ActiveOrder> = {};
      data.forEach((order: any) => {
        if (order.table_id && !map[order.table_id]) {
          map[order.table_id] = order;
        }
      });
      setActiveOrders(map);
    }
  }, [tenantId]);

  useEffect(() => {
    loadTables();
    loadActiveOrders();
  }, [loadTables, loadActiveOrders]);

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("tables-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => {
        loadTables();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadActiveOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, loadTables, loadActiveOrders]);

  const openCreate = () => {
    setEditingTable(null);
    const nextNumber = tables.length > 0 ? Math.max(...tables.map(t => t.table_number)) + 1 : 1;
    setFormNumber(String(nextNumber));
    setFormName("");
    setFormCapacity("4");
    setDialogOpen(true);
  };

  const openEdit = (table: Table) => {
    setEditingTable(table);
    setFormNumber(String(table.table_number));
    setFormName(table.table_name || "");
    setFormCapacity(String(table.capacity));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenantId || !formNumber) return;
    setSaving(true);

    const payload = {
      tenant_id: tenantId,
      table_number: parseInt(formNumber),
      table_name: formName || null,
      capacity: parseInt(formCapacity) || 4,
    };

    if (editingTable) {
      const { error } = await supabase
        .from("tables")
        .update(payload)
        .eq("id", editingTable.id);
      if (error) toast.error("Erro ao atualizar mesa: " + error.message);
      else toast.success("Mesa atualizada!");
    } else {
      const { error } = await supabase.from("tables").insert(payload);
      if (error) {
        if (error.message.includes("duplicate")) toast.error("Já existe uma mesa com esse número.");
        else toast.error("Erro ao criar mesa: " + error.message);
      } else toast.success("Mesa criada!");
    }

    setSaving(false);
    setDialogOpen(false);
    loadTables();
  };

  const handleDelete = async (table: Table) => {
    if (table.status === "occupied") {
      toast.error("Não é possível excluir uma mesa ocupada.");
      return;
    }
    const { error } = await supabase.from("tables").delete().eq("id", table.id);
    if (error) toast.error("Erro ao excluir mesa");
    else { toast.success("Mesa excluída"); loadTables(); }
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
  };

  const handleCloseTable = async (tableId: string) => {
    await supabase.from("tables").update({ status: "available" }).eq("id", tableId);
    setSelectedTable(null);
    loadTables();
    loadActiveOrders();
    toast.success("Mesa liberada!");
  };

  const filtered = tables.filter(t => !filter || t.status === filter);

  const statusCounts = Object.keys(statusConfig).reduce((acc, s) => {
    acc[s] = tables.filter(t => t.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  if (selectedTable) {
    return (
      <TableOrderPanel
        table={selectedTable}
        activeOrder={activeOrders[selectedTable.id] || null}
        onBack={() => { setSelectedTable(null); loadTables(); loadActiveOrders(); }}
        onCloseTable={() => handleCloseTable(selectedTable.id)}
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFilter(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Todas ({tables.length})
        </button>
        {Object.entries(statusConfig).filter(([k]) => k !== "closed").map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? null : key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cfg.emoji} {cfg.label} ({statusCounts[key] || 0})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { loadTables(); loadActiveOrders(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nova Mesa
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando mesas...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {tables.length === 0 ? "Nenhuma mesa cadastrada. Clique em 'Nova Mesa' para começar." : "Nenhuma mesa encontrada com esse filtro."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(table => {
            const cfg = statusConfig[table.status] || statusConfig.available;
            const order = activeOrders[table.id];
            return (
              <Card
                key={table.id}
                className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all overflow-hidden"
                onClick={() => handleTableClick(table)}
              >
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{cfg.emoji}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); openEdit(table); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(table); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-base">Mesa {table.table_number}</p>
                    {table.table_name && (
                      <p className="text-xs text-muted-foreground truncate">{table.table_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${cfg.color} border text-xs`}>{cfg.label}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Users className="h-3 w-3" /> {table.capacity}
                    </span>
                  </div>
                  {order && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-xs text-muted-foreground">Pedido #{order.order_number}</p>
                      <p className="text-sm font-bold">R$ {Number(order.total).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? "Editar Mesa" : "Nova Mesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Número da Mesa *</Label>
              <Input
                type="number"
                value={formNumber}
                onChange={e => setFormNumber(e.target.value)}
                placeholder="1"
              />
            </div>
            <div>
              <Label>Nome (opcional)</Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Ex: Área externa 01"
              />
            </div>
            <div>
              <Label>Capacidade</Label>
              <Input
                type="number"
                value={formCapacity}
                onChange={e => setFormCapacity(e.target.value)}
                placeholder="4"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formNumber}>
              {saving ? "Salvando..." : editingTable ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tables;
