import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Upload, ImageIcon, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  image_url: string | null;
}

interface OptionalGroup {
  id: string;
  name: string;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "", barcode: "", purchase_price: "", sale_price: "", stock_quantity: "", min_stock: "5", expiry_date: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [allGroups, setAllGroups] = useState<OptionalGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data as Product[]);
  };

  const loadGroups = async () => {
    const { data } = await supabase.from("optional_groups").select("id, name").order("name");
    if (data) setAllGroups(data as OptionalGroup[]);
  };

  useEffect(() => { loadProducts(); loadGroups(); }, []);

  const getTenantId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single();
    return profile?.tenant_id || null;
  };

  const uploadImage = async (file: File, tenantId: string): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${tenantId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
    return publicUrl;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    const tenantId = await getTenantId();
    if (!tenantId) return toast.error("Sessão inválida");
    if (!form.name.trim()) return toast.error("Nome obrigatório");

    setUploading(true);
    let imageUrl: string | null = editingProduct?.image_url || null;

    if (imageFile) {
      const url = await uploadImage(imageFile, tenantId);
      if (url) {
        imageUrl = url;
      } else {
        setUploading(false);
        return toast.error("Erro ao enviar imagem");
      }
    }

    // If user removed the image preview and there's no new file
    if (!imagePreview && !imageFile) {
      imageUrl = null;
    }

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode || null,
      purchase_price: parseFloat(form.purchase_price) || 0,
      sale_price: parseFloat(form.sale_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      min_stock: parseInt(form.min_stock) || 5,
      expiry_date: form.expiry_date || null,
      image_url: imageUrl,
      tenant_id: tenantId,
    };

    let productId: string;
    if (editingProduct) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
      setUploading(false);
      if (error) return toast.error("Erro ao atualizar");
      productId = editingProduct.id;
      toast.success("Produto atualizado!");
    } else {
      const { data: newProduct, error } = await supabase.from("products").insert(payload).select("id").single();
      setUploading(false);
      if (error || !newProduct) return toast.error("Erro ao criar produto");
      productId = newProduct.id;
      toast.success("Produto criado!");
    }

    // Save optional group links
    await supabase.from("product_option_groups").delete().eq("product_id", productId);
    if (selectedGroupIds.size > 0) {
      const links = Array.from(selectedGroupIds).map(gid => ({
        product_id: productId,
        group_id: gid,
        tenant_id: tenantId,
      }));
      await supabase.from("product_option_groups").insert(links);
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

  const openEdit = async (p: Product) => {
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
    setImagePreview(p.image_url || null);
    setImageFile(null);
    // Load linked optional groups
    const { data: links } = await supabase.from("product_option_groups").select("group_id").eq("product_id", p.id);
    if (links) {
      setSelectedGroupIds(new Set(links.map(l => (l as any).group_id as string)));
    } else {
      setSelectedGroupIds(new Set());
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setForm({ name: "", barcode: "", purchase_price: "", sale_price: "", stock_quantity: "", min_stock: "5", expiry_date: "" });
    setImageFile(null);
    setImagePreview(null);
    setSelectedGroupIds(new Set());
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Image upload */}
              <div>
                <Label>Foto do produto</Label>
                <div className="mt-2 flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-20 w-20 rounded-lg object-cover border border-border"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground mt-1">Adicionar</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  {imagePreview && (
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" /> Trocar
                    </Button>
                  )}
                </div>
              </div>

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
              {/* Optional groups */}
              {allGroups.length > 0 && (
                <div>
                  <Label className="mb-2 block">Grupos de Opcionais</Label>
                  <div className="space-y-2 max-h-32 overflow-auto border border-border rounded-lg p-3">
                    {allGroups.map(g => (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedGroupIds.has(g.id)}
                          onCheckedChange={() => {
                            setSelectedGroupIds(prev => {
                              const next = new Set(prev);
                              next.has(g.id) ? next.delete(g.id) : next.add(g.id);
                              return next;
                            });
                          }}
                        />
                        <span className="text-sm">{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={handleSave} disabled={uploading}>
                {uploading ? "Enviando..." : editingProduct ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Foto</TableHead>
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
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {products.length === 0 ? "Nenhum produto cadastrado" : "Nenhum produto encontrado"}
                </TableCell>
              </TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </TableCell>
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
