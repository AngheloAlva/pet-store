/**
 * /admin/pedidos/[id] — F3.2b
 * RSC page: shows order detail + receipt image + confirm button (if pending_verification).
 */
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/app/actions/admin/orders";
import { ConfirmTransferButton } from "./confirm-transfer-button";

interface AdminPedidoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPedidoDetailPage({ params }: AdminPedidoDetailPageProps) {
  const { id } = await params;
  const data = await getOrderDetail(id);

  if (!data) notFound();

  const { order, items, receipt } = data;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Order Detail</h1>
        <p className="text-sm text-gray-500 font-mono mt-1">{order.orderNumber}</p>
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Payment status</span>
          <span
            className={`font-medium ${
              order.paymentStatus === "paid"
                ? "text-green-700"
                : order.paymentStatus === "pending_verification"
                ? "text-yellow-700"
                : "text-gray-700"
            }`}
          >
            {order.paymentStatus}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Payment method</span>
          <span className="font-medium text-gray-900">{order.paymentGateway}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-gray-700">Total</span>
          <span className="text-gray-900">${order.total.toLocaleString("es-CL")}</span>
        </div>
      </div>

      {/* Order items */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Items</h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">
                {item.name} × {item.quantity}
              </span>
              <span className="text-gray-900">${item.lineTotal.toLocaleString("es-CL")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer receipt (only for pending_verification) */}
      {order.paymentStatus === "pending_verification" && receipt && (
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Transfer Receipt</h2>
          <div className="text-sm text-gray-600">
            Bank reference: <span className="font-mono font-medium">{receipt.bankReference}</span>
          </div>
          {/* Receipt image */}
          <div className="rounded-lg overflow-hidden border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receipt.dataUrl}
              alt="Transfer receipt"
              className="w-full max-h-96 object-contain bg-gray-50"
            />
          </div>
          <ConfirmTransferButton orderId={order.id} />
        </div>
      )}
    </div>
  );
}
