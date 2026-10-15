import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
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
import { toast } from "sonner";
import { useLeadDocsStatus, logGeneratedWithoutValidatedDocs, type Lead } from "@/hooks/useLeads";
import {
  REQUIRE_VALIDATED_DOCS_FOR_CONTRACT,
  UNVALIDATED_CONFIRM_TEXT,
  type GeneratedDocKind,
} from "@/lib/leadDocsValidation";

/**
 * Aviso + confirmação antes de gerar acordo/contrato sem documentos validados.
 * `guard(fn)` corre fn logo se validado; caso contrário pede confirmação (ou bloqueia,
 * se REQUIRE_VALIDATED_DOCS_FOR_CONTRACT = true).
 */
export const useUnvalidatedDocsGuard = (lead: Lead, open: boolean, docType: GeneratedDocKind) => {
  const qc = useQueryClient();
  const { data: docs } = useLeadDocsStatus(lead.id, open);
  const validated = docs?.status === "validated";
  const [pending, setPending] = useState<null | (() => void)>(null);

  const guard = (fn: () => void) => {
    if (validated) return fn();
    if (REQUIRE_VALIDATED_DOCS_FOR_CONTRACT) {
      toast.error("Valida primeiro os documentos desta pessoa.");
      return;
    }
    setPending(() => fn);
  };

  const warnings = [
    !lead.formSubmittedAt && "Formulário por submeter",
    docs && !validated && "Documentos por validar",
  ].filter(Boolean) as string[];

  const warning =
    warnings.length > 0 ? (
      <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-sm text-warning">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
        <span>{warnings.join(" · ")}</span>
      </div>
    ) : null;

  const dialog = (
    <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Documentos não validados</AlertDialogTitle>
          <AlertDialogDescription>{UNVALIDATED_CONFIRM_TEXT[docType]}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const fn = pending;
              setPending(null);
              logGeneratedWithoutValidatedDocs(lead.id, docType).then(() =>
                qc.invalidateQueries({ queryKey: ["lead_activity", lead.id] })
              );
              fn?.();
            }}
          >
            Gerar mesmo assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { guard, warning, dialog };
};
