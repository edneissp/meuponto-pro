import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteTenantDialogProps = {
  open: boolean;
  tenantName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

const DeleteTenantDialog = ({
  open,
  tenantName,
  onConfirm,
  onCancel,
  loading,
}: DeleteTenantDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir cadastro</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{tenantName}</strong>?
            <br />
            Esta ação não poderá ser desfeita. O acesso ao sistema será
            desativado, mas dados financeiros e históricos serão preservados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Excluindo..." : "Confirmar Exclusão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteTenantDialog;
