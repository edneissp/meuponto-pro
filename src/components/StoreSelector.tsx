import { Store as StoreIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/contexts/StoreContext";

const StoreSelector = () => {
  const { stores, currentStoreId, setCurrentStoreId, loading } = useStore();

  if (loading || stores.length === 0) return null;

  const ALL = "__all__";
  const value = currentStoreId ?? ALL;

  return (
    <div className="flex items-center gap-2">
      <StoreIcon className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={(v) => setCurrentStoreId(v === ALL ? null : v)}>
        <SelectTrigger className="h-9 w-[200px]">
          <SelectValue placeholder="Selecionar loja" />
        </SelectTrigger>
        <SelectContent>
          {stores.length > 1 && (
            <SelectItem value={ALL}>📊 Todas as lojas (consolidado)</SelectItem>
          )}
          {stores.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StoreSelector;
