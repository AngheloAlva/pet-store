# Proposal: Slice 4 — Carrito

## Intent

Cerrar el loop PDP → carrito → checkout hand-off. Hoy el botón "Agregar al carrito" mete ítems al store persistido pero el `CartIndicator` apunta a `/carrito` (404) y no hay forma de revisar/editar lo agregado. Sin esto el demo no es vendible.

## Scope

### In Scope
- Cart drawer global montado en el root layout; abre al agregar y al click del ícono.
- Página `/carrito` con la misma info editable (línea, qty, eliminar, totales).
- Componentes compartidos: `CartLineItem`, `CartSummary`, `EmptyCart`.
- Extensión del store Zustand con `isOpen` (excluida de persist).
- Clamp de cantidad: `min(requested, totalStock, 99)`. Nuevo `getVariantTotalStock` en `src/lib/stock.ts`.
- Helpers puros en `src/lib/cart.ts` (`clampItemQuantity`, `computeCartTotals`).
- Hydration-safe en todas las superficies (`useHydrated` guard).
- A11y completa (focus trap, ESC, SheetTitle/Description, aria-labels).

### Out of Scope
- Página `/checkout` (CTA "Ir al checkout" queda disabled + "Próximamente").
- Cupones, shipping calculado, impuestos.
- Multi-store stock picker (se usa stock total agregado).
- Guardar carrito en backend (es solo localStorage vía persist).

## Capabilities

### New Capabilities
- `cart`: Persistencia, mutaciones (add/update/remove/clear) con stock clamp, drawer controlado por store, página dedicada, totales CLP, a11y y hydration-safe rendering.

### Modified Capabilities
- None.

## Approach

RSC page + client island para `/carrito`. Drawer global: `CartRoot` cliente montado en `app/layout.tsx` renderiza `CartDrawer`, que lee `isOpen` del Zustand y maneja el Base UI `Dialog` en modo controlado (`open` + `onOpenChange`). Shared building blocks (`CartLineItem`, `CartSummary`, `EmptyCart`) consumidos desde ambas superficies. Stock clamp centralizado en `src/lib/cart.ts` + `src/lib/stock.ts` y probado con TDD.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/stores/cart.ts` | Modified | Agrega `isOpen`/`openCart`/`closeCart`/`setOpen`; `partialize` para persistir solo `items`. |
| `src/lib/cart.ts` | New | `clampItemQuantity`, `computeCartTotals`. |
| `src/lib/stock.ts` | Modified | `getVariantTotalStock(variantId)`. |
| `src/components/cart/*` | New | `cart-root`, `cart-drawer`, `cart-line-item`, `cart-summary`, `empty-cart`. |
| `src/app/carrito/page.tsx` + `cart-page-client.tsx` | New | Página `/carrito`. |
| `src/app/layout.tsx` | Modified | Monta `<CartRoot/>`. |
| `src/components/layout/cart-indicator.tsx` | Modified | Link → botón que llama `openCart()`. |
| `src/components/product/add-to-cart-button.tsx` | Modified | Llama `openCart()` tras `addItem`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `isOpen` se persiste y el drawer reabre al recargar | High | `partialize: (s) => ({ items: s.items })` + test. |
| Hydration mismatch en `/carrito` | Med | `useHydrated()` guard + skeleton neutral en SSR. |
| Falta fuente numérica de stock en `src/data/stock.ts` | Med | Verificar en design; fallback sintético (`in_stock→99`, `low_stock→3`, `out→0`). |
| Drawer + toast ruido UX | Low | Toast corto 1.5s; drawer primario. |
| Duplicación drawer/página | Med | Componentes compartidos; tests sobre componentes, no superficies. |

## Rollback Plan

`git revert` del commit del slice. `localStorage.removeItem("simplepet-cart")` en DevTools si algún usuario quedó con estado inválido. Sin migraciones de backend ni cambios de esquema externo, rollback es seguro.

## Dependencies

- Slice 3 (PDP) archivado ✅ — `AddToCartButton` ya en uso.
- `src/components/ui/sheet.tsx` disponible ✅.
- `useHydrated` hook existente ✅.

## Success Criteria

- [ ] Agregar desde PDP abre drawer con el ítem agregado.
- [ ] Click en ícono del header abre el drawer (no navega a `/carrito`).
- [ ] `/carrito` muestra los mismos ítems, permite editar qty y eliminar.
- [ ] Qty clamp respeta `totalStock` y el máximo 99.
- [ ] Recargar NO reabre el drawer; sí preserva los ítems.
- [ ] Totales en CLP; checkout CTA disabled con "Próximamente".
- [ ] `pnpm test` verde; `pnpm lint` 0 warnings; `pnpm exec tsc --noEmit` limpio.
- [ ] Base UI Dialog focus trap + ESC funcionan; screen reader anuncia "Tu carrito".
