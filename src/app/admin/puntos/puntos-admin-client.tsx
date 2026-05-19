"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  addPointsTransaction,
  recordPresentialPurchase,
  triggerPetBirthdayBonuses,
} from "@/app/actions/admin/points";
import { useRouter } from "next/navigation";
import type { PointsTransactionRow } from "@/lib/admin/points";
import { useAppForm } from "@/components/ui/tanstack-form";

// ---------------------------------------------------------------------------
// Kind labels
// ---------------------------------------------------------------------------
const KIND_LABELS: Record<string, string> = {
  purchase: "Compra",
  first_purchase_bonus: "Bono primera compra",
  pet_birthday_bonus: "Bono cumpleaños",
  manual_adjustment: "Ajuste manual",
  redemption: "Canje",
  refund: "Devolución",
  expiration: "Vencimiento",
};

// ---------------------------------------------------------------------------
// AdjustPointsDialog
// ---------------------------------------------------------------------------
function AdjustPointsDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useAppForm({
    defaultValues: { deltaPoints: 0, description: "" },
    onSubmit: async ({ value }) => {
      const result = await addPointsTransaction({
        userId,
        deltaPoints: Number(value.deltaPoints),
        description: value.description,
        kind: "manual_adjustment",
      });
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Ajustar puntos
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuste manual de puntos</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.AppField name="deltaPoints">
            {(field) => (
              <field.NumberField
                label="Delta (positivo=suma, negativo=resta)"
                placeholder="Ej: 100 o -50"
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.TextField label="Razón *" placeholder="Ej: Compensación por error" />
            )}
          </form.AppField>
          <form.AppForm>
            <form.SubmitButton>Confirmar ajuste</form.SubmitButton>
          </form.AppForm>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// RecordPurchaseDialog
// ---------------------------------------------------------------------------
function RecordPurchaseDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useAppForm({
    defaultValues: { amountCLP: 0, description: "" },
    onSubmit: async ({ value }) => {
      const result = await recordPresentialPurchase({
        userId,
        amountCLP: Number(value.amountCLP),
        description: value.description,
      });
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Registrar compra presencial
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar compra presencial</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.AppField name="amountCLP">
            {(field) => (
              <field.NumberField
                label="Monto (CLP) *"
                placeholder="Ej: 35000"
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.TextField label="Descripción" placeholder="Descripción de la compra" />
            )}
          </form.AppField>
          <form.AppForm>
            <form.SubmitButton>Registrar</form.SubmitButton>
          </form.AppForm>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// BirthdayBonusButton
// ---------------------------------------------------------------------------
function BirthdayBonusButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    granted: string[];
    skipped: string[];
  } | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setResult(null);
    const res = await triggerPetBirthdayBonuses();
    if (res.ok) {
      setResult({ granted: res.granted, skipped: res.skipped });
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={loading} variant="outline" size="sm">
        {loading ? "Procesando..." : "Otorgar bonos cumpleaños del mes"}
      </Button>
      {result && (
        <p className="text-xs text-muted-foreground">
          Otorgados: {result.granted.length} · Omitidos: {result.skipped.length}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PuntosAdminPanel — shown when a user is selected
// ---------------------------------------------------------------------------
export function PuntosAdminPanel({
  userId,
  userName,
  balance,
  history,
}: {
  userId: string;
  userName: string;
  balance: number;
  history: PointsTransactionRow[];
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">{userName}</h2>
        <div className="text-4xl font-bold mt-2">{balance}</div>
        <p className="text-sm text-muted-foreground">puntos disponibles</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <AdjustPointsDialog userId={userId} />
        <RecordPurchaseDialog userId={userId} />
        <BirthdayBonusButton />
      </div>

      <div>
        <h3 className="text-base font-medium mb-3">Historial de transacciones</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin transacciones.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{KIND_LABELS[tx.kind] ?? tx.kind}</p>
                  <p className="text-xs text-muted-foreground">{tx.description}</p>
                </div>
                <div className="text-right">
                  <p
                    className={
                      tx.deltaPoints >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"
                    }
                  >
                    {tx.deltaPoints >= 0 ? "+" : ""}
                    {tx.deltaPoints}
                  </p>
                  <p className="text-xs text-muted-foreground">Saldo: {tx.balanceAfter}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
