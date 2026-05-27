/**
 * /admin/configuracion — F3.2b + F3.3
 * RSC page: reads current appSettings, renders FailureModeToggle and CoberturaSettings.
 * Admin layout guard handles authentication.
 */
import { getAppSettings } from "@/app/actions/admin/settings";
import { FailureModeToggle } from "./failure-mode-toggle";
import { CoberturaSettings } from "@/components/admin/cobertura-settings";

const DEFAULT_COMMUNES = ["Providencia", "Las Condes", "Ñuñoa", "Santiago", "Vitacura"];
const DEFAULT_SLOTS = ["manana", "tarde"];
const DEFAULT_THRESHOLD = 20000;

export default async function AdminConfiguracionPage() {
  const settings = await getAppSettings();

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Demo configuration for the pet store.
        </p>
      </div>

      {/* Payment failure mode */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Payment Failure Simulation</h2>
          <p className="text-sm text-gray-500 mt-1">
            When enabled, approximately 10% of payment gateway verifications will randomly
            return a rejection. Useful for testing the payment failure UX.
          </p>
        </div>

        <FailureModeToggle initial={settings.paymentFailureMode} />
      </div>

      {/* Cobertura settings (F3.3) */}
      <CoberturaSettings
        initialCommunes={settings.coveredCommunes ?? DEFAULT_COMMUNES}
        initialThreshold={settings.freeShippingThreshold ?? DEFAULT_THRESHOLD}
        initialSlots={settings.dispatchSlots ?? DEFAULT_SLOTS}
      />
    </div>
  );
}
