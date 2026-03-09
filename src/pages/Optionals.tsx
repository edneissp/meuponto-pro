import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface OptionalGroup {
  id: string;
  name: string;
  tenant_id: string;
}

interface Optional {
  id: string;
  name: string;
  price: number;
  group_id: string;
  tenant_id: string;
}

const Optionals = () => {
  const [groups, setGroups] = useState<OptionalGroup[]>([]);
  const [optionals, setOptionals] = useState<Optional[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group dialog
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionalGroup | null>(null);
  const [groupName, setGroupName] = useState("");

  // Optional dialog
  const [optionalDialogOpen, setOptionalDialogOpen] = useState(false);
  const [editingOptional, setEditingOptional] = useState<Optional | null>(null);
  const [optionalForm, setOptionalForm] = useState({ name: "", price: "", group_id: "" });

  const getTenantId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single();
    return profile?.tenant_id || null;
  };

  const loadData = async () => {
    const [{ data: g }, { data: o }] = await Promise.all([
      supabase.from("optional_groups").select("*").order("name"),
      supabase.from("optionals").select("*").order("name"),
    ]);
    if (g) setGroups(g as OptionalGroup[]);
    if (o) setOptionals(o as Optional[]);
  };

  useEffect(() => { loadData(); }, []);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Group CRUD
  const saveGroup = async () => {
    const tenantId = await getTenantId();
    if (!tenantId) return toast.error("Sessão inválida");
    if (!groupName.trim()) return toast.error("Nome obrigatório");

    if (editingGroup) {
      const { error } = await supabase.from("optional_groups").update({ name: groupName.trim() }).eq("id", editingGroup.id);
      if (error) return toast.error("Erro ao atualizar");
      toast.success("Grupo atualizado!");
    } else {
      const { error } = await supabase.from("optional_groups").insert({ name: groupName.trim(), tenant_id: tenantId });
      if (error) return toast.error("Erro ao criar grupo");
      toast.success("Grupo criado!");
    }
    setGroupDialogOpen(false);
    setEditingGroup(null);
    setGroupName("");
    loadData();
  };

  const deleteGroup = async (id: string) => {
    const { error } = await supabase.from("optional_groups").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir grupo");
    toast.success("Grupo excluído");
    loadData();
  };

  // Optional CRUD
  const saveOptional = async () => {
    const tenantId = await getTenantId();
    if (!tenantId) return toast.error("Sessão inválida");
    if (!optionalForm.name.trim()) return toast.error("Nome obrigatório");
    if (!optionalForm.group_id) return toast.error("Selecione um grupo");

    const payload = {
      name: optionalForm.name.trim(),
      price: parseFloat(optionalForm.price) || 0,
      group_id: optionalForm.group_id,
      tenant_id: tenantId,
    };

    if (editingOptional) {
      const { error } = await supabase.from("optionals").update(payload).eq("id", editingOptional.id);
      if (error) return toast.error("Erro ao atualizar");
      toast.success("Opcional atualizado!");
    } else {
      const { error } = await supabase.from("optionals").insert(payload);
      if (error) return toast.error("Erro ao criar opcional");
      toast.success("Opcional criado!");
    }
    setOptionalDialogOpen(false);
    setEditingOptional(null);
    setOptionalForm({ name: "", price: "", group_id: "" });
    loadData();
  };

  const deleteOptional = async (id: string) => {
    const { error } = await supabase.from("optionals").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Opcional excluído");
    loadData();
  };

  const openEditGroup = (g: OptionalGroup) => {
    setEditingGroup(g);
    setGroupName(g.name);
    setGroupDialogOpen(true);
  };

  const openAddOptional = (groupId: string) => {
    setEditingOptional(null);
    setOptionalForm({ name: "", price: "", group_id: groupId });
    setOptionalDialogOpen(true);
  };

  const openEditOptional = (o: Optional) => {
    setEditingOptional(o);
    setOptionalForm({ name: o.name, price: o.price.toString(), group_id: o.group_id });
    setOptionalDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-xl font-bold">Grupos de Opcionais</h2>
          <p className="text-sm text-muted-foreground">Gerencie complementos e adicionais dos seus produtos</p>
        </div>
        <Button onClick={() => { setEditingGroup(null); setGroupName(""); setGroupDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Novo Grupo
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Nenhum grupo de opcionais cadastrado. Crie um grupo para começar.
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const groupOptionals = optionals.filter(o => o.group_id === g.id);
            const isExpanded = expandedGroups.has(g.id);
            return (
              <Card key={g.id} className="shadow-card overflow-hidden">
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleGroup(g.id)}>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-semibold flex-1">{g.name}</span>
                  <span className="text-sm text-muted-foreground">{groupOptionals.length} {groupOptionals.length === 1 ? "item" : "itens"}</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAddOptional(g.id)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditGroup(g)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteGroup(g.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-border">
                    {groupOptionals.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">Nenhum opcional neste grupo</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Preço</TableHead>
                            <TableHead className="w-20">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupOptionals.map(o => (
                            <TableRow key={o.id}>
                              <TableCell className="font-medium">{o.name}</TableCell>
                              <TableCell>R$ {Number(o.price).toFixed(2)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditOptional(o)}>
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteOptional(o.id)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do Grupo *</Label>
              <Input placeholder="Ex: Complementos do Açaí" value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
            <Button className="w-full" onClick={saveGroup}>{editingGroup ? "Atualizar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Optional Dialog */}
      <Dialog open={optionalDialogOpen} onOpenChange={setOptionalDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingOptional ? "Editar Opcional" : "Novo Opcional"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome *</Label>
              <Input placeholder="Ex: Granola" value={optionalForm.name} onChange={e => setOptionalForm({ ...optionalForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={optionalForm.price} onChange={e => setOptionalForm({ ...optionalForm, price: e.target.value })} />
            </div>
            <Button className="w-full" onClick={saveOptional}>{editingOptional ? "Atualizar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Optionals;
