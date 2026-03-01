import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface CustomerSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
}

const CustomerSelectDialog = ({ open, onClose, onSelect }: CustomerSelectDialogProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("customers").select("*").order("name").then(({ data }) => {
        if (data) setCustomers(data);
      });
    }
  }, [open]);

  const addAndSelect = async () => {
    if (!newName.trim()) return toast.error("Nome é obrigatório");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single();
    if (!profile) { setLoading(false); return; }

    const { data, error } = await supabase.from("customers").insert({
      tenant_id: profile.tenant_id,
      name: newName.trim(),
      phone: newPhone.trim() || null,
    }).select().single();

    if (error || !data) { setLoading(false); return toast.error("Erro ao cadastrar"); }

    toast.success("Cliente cadastrado!");
    onSelect(data);
    setLoading(false);
    setNewName("");
    setNewPhone("");
    setShowAdd(false);
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Selecionar Cliente para Fiado</DialogTitle></DialogHeader>

        {!showAdd ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-60 overflow-auto space-y-1">
              {filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <p className="text-sm font-medium">{c.name}</p>
                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                </button>
              ))}
              {filtered.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum cliente encontrado</p>}
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowAdd(true)}>
              <UserPlus className="h-4 w-4" /> Novo Cliente
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={newPhone} onChange={e => setNewPhone(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Voltar</Button>
              <Button className="flex-1" onClick={addAndSelect} disabled={loading}>Cadastrar e Selecionar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerSelectDialog;
