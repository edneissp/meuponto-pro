import { Store as StoreIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/contexts/StoreContext";

const StoreSelector = () => {
  const { stores, currentStoreId, setCurrentStoreId, loading } = useStore();

  if (loading || stores.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <StoreIcon className="h-4 w-4 text-muted-foreground" />
      <Select value={currentStoreId || undefined} onValueChange={setCurrentStoreId}>
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder="Selecionar loja" />
        </SelectTrigger>
        <SelectContent>
          {stores.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StoreSelector;
