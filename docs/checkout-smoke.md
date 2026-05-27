# Checkout F3.1 — Manual Smoke Test Script

## Prerequisites
- App running locally (`pnpm dev`)
- Demo seed applied (automatic on boot)
- At least one product with stock in the catalog

## Test Scenarios

### Scenario 1: Happy path — full checkout approved

1. Navigate to `/catalogo`
2. Add a product to the cart
3. Go to `/carrito`
4. Click "Ir al checkout"
5. Complete entrega form with a covered commune (e.g., Providencia)
6. Select a shipping method
7. Review the resumen page — verify totals
8. On the pago page, ensure "Aprobar pago" is selected
9. Click "Pagar con Webpay"
10. **Expected**: Redirected to `/checkout/confirmacion/PET-...`; order number shown; DTE reference shown; points earned badge visible
11. Navigate to `/demo/inbox` — verify order_confirmation email exists

### Scenario 2: Out-of-stock product at payment time

1. Add a product to cart; complete checkout up to pago step
2. Manually set variant stock to out_of_stock via admin/seed
3. Click "Pagar con Webpay"
4. **Expected**: `/checkout/resultado` shows "producto agotado" error with product name; no order created

### Scenario 3: Session expired

1. Start checkout, wait 30+ minutes (or simulate by updating expiresAt in DB)
2. Try to submit address
3. **Expected**: Action returns SESSION_EXPIRED; UI redirects to `/carrito`

### Scenario 4: Payment rejected by mock gateway

1. Complete checkout up to pago step
2. Select "Rechazar pago" in the mock UI
3. Click "Pagar con Webpay"
4. **Expected**: Resultado page shows payment failure screen with "Reintentar pago" CTA; no order created

### Scenario 5: Duplicate confirmOrder (idempotency)

1. Complete a full checkout to confirmation
2. Manually navigate back to `/checkout/resultado?paymentId=<sessionId>&token=approve`
3. **Expected**: Returns the existing order number without creating a duplicate

### Scenario 6: Unauthenticated access to checkout

1. Log out
2. Navigate to `/checkout/entrega`
3. **Expected**: Redirected to `/login?callbackUrl=/checkout/entrega`

### Scenario 7: Cart re-pricing server-side

1. Add a product to cart
2. Modify the localStorage cart price to a different value
3. Proceed through checkout
4. On the resumen page, verify prices match the DB server prices, not the manipulated client price

### Scenario 8: Commune not covered

1. Start checkout, reach entrega form
2. Enter a commune not in the coverage list (e.g., "Antártica Chilena")
3. Submit the form
4. **Expected**: COMMUNE_NOT_COVERED inline error shown on commune field; session address NOT saved
