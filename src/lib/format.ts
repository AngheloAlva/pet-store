const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatCLP(amount: number): string {
  return CLP.format(amount);
}

export function formatQuantity(value: number, unit: string): string {
  return `${value} ${unit}`;
}
