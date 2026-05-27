import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getUserPointsBalance, getUserPointsHistory } from "@/lib/admin/points";
import { db, dbReady } from "@/db";
import { pointsConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Transaction kind display
// ---------------------------------------------------------------------------
const KIND_LABELS: Record<string, string> = {
  purchase: "Compra",
  first_purchase_bonus: "Bono primera compra",
  pet_birthday_bonus: "Bono cumpleaños mascota",
  manual_adjustment: "Ajuste manual",
  redemption: "Canje",
  refund: "Devolución",
  expiration: "Vencimiento",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function PuntosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [balance, history] = await Promise.all([
    getUserPointsBalance(user.id),
    getUserPointsHistory(user.id, 10),
  ]);

  // Get config for "how it works" section
  await dbReady;
  const [config] = await db
    .select()
    .from(pointsConfig)
    .where(eq(pointsConfig.id, "singleton"));

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Balance Hero */}
      <div className="rounded-xl border bg-card p-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Puntos disponibles</p>
        <div className="text-6xl font-bold">{balance}</div>
        {config && (
          <p className="text-sm text-muted-foreground">
            Equivalen a{" "}
            {new Intl.NumberFormat("es-CL").format(balance * config.redeemValuePerPoint)} CLP
          </p>
        )}
      </div>

      {/* Transaction History */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Actividad reciente</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no tenés transacciones registradas.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {KIND_LABELS[tx.kind] ?? tx.kind}
                  </p>
                  <p className="text-xs text-muted-foreground">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(tx.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={
                      tx.deltaPoints >= 0
                        ? "text-sm font-semibold text-green-600"
                        : "text-sm font-semibold text-red-600"
                    }
                  >
                    {tx.deltaPoints >= 0 ? "+" : ""}
                    {tx.deltaPoints} pts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Saldo: {tx.balanceAfter}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* How it works */}
      {config && (
        <section>
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Cómo funciona el programa de puntos
            </summary>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>
                • Ganás <strong>1 punto</strong> por cada{" "}
                {config.earnRatePerCLP} CLP en compras presenciales.
              </p>
              <p>
                • Cada punto equivale a{" "}
                <strong>{config.redeemValuePerPoint} CLP</strong>.
              </p>
              <p>
                • Podés canjear desde{" "}
                <strong>{config.minRedeemPoints} puntos</strong>.
              </p>
              <p>
                • Tu primera compra te da un bono de{" "}
                <strong>{config.firstPurchaseBonus} puntos</strong>.
              </p>
              <p>
                • El cumpleaños de tu mascota te da{" "}
                <strong>{config.petBirthdayBonus} puntos</strong>.
              </p>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
