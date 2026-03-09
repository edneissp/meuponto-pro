import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Optional {
  id: string;
  name: string;
  price: number;
  group_id: string;
}

interface OptionalGroup {
  id: string;
  name: string;
}

interface SelectedOptional {
  id: string;
  name: string;
  price: number;
}

interface Props {
  open: boolean;
  productId: string;
  productName: string;
  productPrice: number;
  onClose: () => void;
  onConfirm: (selectedOptionals: SelectedOptional[]) => void;
}

const OptionalSelectDialog = ({ open, productId, productName, productPrice, onClose, onConfirm }: Props) => {
  const [groups, setGroups] = useState<OptionalGroup[]>([]);
  const [optionals, setOptionals] = useState<Optional[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setLoading(true);

    const load = async () => {
      // Get groups linked to this product
      const { data: links } = await supabase
        .from("product_option_groups")
        .select("group_id")
        .eq("product_id", productId);

      if (!links || links.length === 0) {
        setGroups([]);
        setOptionals([]);
        setLoading(false);
        return;
      }

      const groupIds = links.map(l => (l as any).group_id as string);

      const [{ data: g }, { data: o }] = await Promise.all([
        supabase.from("optional_groups").select("id, name").in("id", groupIds),
        supabase.from("optionals").select("id, name, price, group_id").in("group_id", groupIds).order("name"),
      ]);

      setGroups((g || []) as OptionalGroup[]);
      setOptionals((o || []) as Optional[]);
      setLoading(false);
    };
    load();
  }, [open, productId]);

  const toggleOptional = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedOptionals = optionals.filter(o => selected.has(o.id));
  const optionalsTotal = selectedOptionals.reduce((sum, o) => sum + Number(o.price), 0);
  const totalWithOptionals = productPrice + optionalsTotal;

  const handleConfirm = () => {
    onConfirm(selectedOptionals.map(o => ({ id: o.id, name: o.name, price: Number(o.price) })));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Opcionais - {productName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-2">
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Carregando...</p>
          ) : groups.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum grupo de opcionais vinculado</p>
          ) : (
            groups.map(g => {
              const groupOptionals = optionals.filter(o => o.group_id === g.id);
              if (groupOptionals.length === 0) return null;
              return (
                <div key={g.id}>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">{g.name}</p>
                  <div className="space-y-2">
                    {groupOptionals.map(o => (
                      <label
                        key={o.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selected.has(o.id)}
                          onCheckedChange={() => toggleOptional(o.id)}
                        />
                        <span className="flex-1 text-sm font-medium">{o.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {Number(o.price) > 0 ? `+R$ ${Number(o.price).toFixed(2)}` : "Grátis"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Produto</span>
            <span>R$ {productPrice.toFixed(2)}</span>
          </div>
          {optionalsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Opcionais ({selected.size})</span>
              <span>+R$ {optionalsTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Total do item</span>
            <span>R$ {totalWithOptionals.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>
            Adicionar ao Carrinho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OptionalSelectDialog;
