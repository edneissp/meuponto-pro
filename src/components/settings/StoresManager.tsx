import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Store as StoreIcon, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useStore, type Store } from "@/contexts/StoreContext";

const StoresManager = () => {
  const { tenantId } = useTenant();
  const { stores, refresh, currentStoreId } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(""); setAddress(""); setEditing(null); };

  const startEdit = (s: Store) => {
    setEditing(s); setName(s.name); setAddress(s.address || ""); setOpen(true);
  };

  const save = async () => {
    if (!tenantId || !name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("stores" as any)
          .update({ name: name.trim(), address: address.trim() || null })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Loja atualizada");
      } else {
        const { error } = await supabase.from("stores" as any)
          .insert({ tenant_id: tenantId, name: name.trim(), address: address.trim() || null });
        if (error) throw error;
        toast.success("Loja criada");
      }
      await refresh();
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar loja");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Store) => {
    if (s.is_default) { toast.error("Não é possível excluir a loja principal"); return; }
    if (!confirm(`Excluir loja "${s.name}"?`)) return;
    const { error } = await supabase.from("stores" as any)
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Loja excluída");
    refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><StoreIcon className="h-5 w-5" /> Lojas</CardTitle>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova loja</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar loja" : "Nova loja"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Filial Centro" />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={saving || !name.trim()}>{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {stores.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma loja cadastrada.</p>}
        {stores.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.name}</span>
                {s.is_default && <Badge variant="secondary">Principal</Badge>}
                {s.id === currentStoreId && <Badge>Ativa</Badge>}
              </div>
              {s.address && <p className="text-sm text-muted-foreground">{s.address}</p>}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
              {!s.is_default && (
                <Button variant="ghost" size="icon" onClick={() => remove(s)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default StoresManager;
