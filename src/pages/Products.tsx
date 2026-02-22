import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  expiry_date: string | null;
  is_active: boolean;
  category_id: string | null;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "", barcode: "", purchase_price: "", sale_price: "", stock_quantity: "", min_stock: "5", expiry_date: "",
  });

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data as Product[]);
  };

  useEffect(() => { loadProducts(); }, []);

  const getTenantId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single();
    return profile?.tenant_id || null;
  };

  const handleSave = async () => {
    const tenantId = await getTenantId();
    if (!tenantId) return toast.error("Sessão inválida");
    if (!form.name.trim()) return toast.error("Nome obrigatório");

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode || null,
      purchase_price: parseFloat(form.purchase_price) || 0,
      sale_price: parseFloat(form.sale_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      min_stock: parseInt(form.min_stock) || 5,
      expiry_date: form.expiry_date || null,
      tenant_id: tenantId,
    };

    if (editingProduct) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
      if (error) return toast.error("Erro ao atualizar");
      toast.success("Produto atualizado!");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) return toast.error("Erro ao criar produto");
      toast.success("Produto criado!");
    }
    setDialogOpen(false);
    resetForm();
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Produto excluído");
    loadProducts();
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      barcode: p.barcode || "",
      purchase_price: p.purchase_price.toString(),
      sale_price: p.sale_price.toString(),
      stock_quantity: p.stock_quantity.toString(),
      min_stock: p.min_stock.toString(),
      expiry_date: p.expiry_date || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setForm({ name: "", barcode: "", purchase_price: "", sale_price: "", stock_quantity: "", min_stock: "5", expiry_date: "" });
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const margin = (buy: number, sell: number) => sell > 0 ? (((sell - buy) / sell) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar produtos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Código de Barras</Label>
                  <Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preço de Compra (R$)</Label>
                  <Input type="number" step="0.01" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} />
                </div>
                <div>
                  <Label>Preço de Venda (R$)</Label>
                  <Input type="number" step="0.01" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Qtd Estoque</Label>
                  <Input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} />
                </div>
                <div>
                  <Label>Estoque Mínimo</Label>
                  <Input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} />
                </div>
                <div>
                  <Label>Validade</Label>
                  <Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleSave}>{editingProduct ? "Atualizar" : "Criar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="hidden sm:table-cell">Compra</TableHead>
              <TableHead>Venda</TableHead>
              <TableHead className="hidden md:table-cell">Margem</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead className="hidden lg:table-cell">Validade</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {products.length === 0 ? "Nenhum produto cadastrado" : "Nenhum produto encontrado"}
                </TableCell>
              </TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="hidden sm:table-cell">R$ {Number(p.purchase_price).toFixed(2)}</TableCell>
                <TableCell>R$ {Number(p.sale_price).toFixed(2)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-success font-medium">{margin(Number(p.purchase_price), Number(p.sale_price))}%</span>
                </TableCell>
                <TableCell>
                  <span className={p.stock_quantity <= p.min_stock ? "text-destructive font-medium" : ""}>
                    {p.stock_quantity}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {p.expiry_date ? new Date(p.expiry_date).toLocaleDateString("pt-BR") : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Products;
