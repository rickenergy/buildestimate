"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLang } from "@/components/providers";
import { deleteEstimate } from "@/app/actions/estimates";
import { Loader2, Trash2 } from "lucide-react";

type Lang = "en" | "pt" | "es";

const L = {
  delete: { en: "Delete estimate", pt: "Excluir estimate", es: "Eliminar estimate" },
  confirmTitle: { en: "Delete this estimate?", pt: "Excluir este estimate?", es: "¿Eliminar este estimate?" },
  confirmBody: {
    en: "This permanently removes the estimate and its line items. This cannot be undone.",
    pt: "Isso remove o estimate e seus itens permanentemente. Não pode ser desfeito.",
    es: "Esto elimina el estimate y sus partidas de forma permanente. No se puede deshacer.",
  },
  cancel: { en: "Cancel", pt: "Cancelar", es: "Cancelar" },
  confirm: { en: "Delete", pt: "Excluir", es: "Eliminar" },
  deleted: { en: "Estimate deleted", pt: "Estimate excluído", es: "Estimate eliminado" },
  error: { en: "Could not delete", pt: "Não foi possível excluir", es: "No se pudo eliminar" },
} as const;

export function DeleteEstimateButton({ estimateId }: { estimateId: string }) {
  const lang = useLang() as Lang;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const tr = (m: Record<Lang, string>) => m[lang] ?? m.en;

  function confirmDelete() {
    startTransition(async () => {
      try {
        await deleteEstimate(estimateId);
        toast.success(tr(L.deleted));
        router.push("/estimates");
        router.refresh();
      } catch {
        toast.error(tr(L.error));
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-1 h-4 w-4" /> {tr(L.delete)}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tr(L.confirmTitle)}</DialogTitle>
            <DialogDescription>{tr(L.confirmBody)}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {tr(L.cancel)}
            </Button>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={pending}
            >
              {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              {tr(L.confirm)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
