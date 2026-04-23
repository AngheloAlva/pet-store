import type { StockLevel, StockStatus } from "@/types";

type StockException = {
  variantId: string;
  storeId: string;
  status: Exclude<StockStatus, "in_stock">;
};

const exceptions: StockException[] = [
  { variantId: "rc-ma-15", storeId: "maipu", status: "out_of_stock" },
  { variantId: "rc-ma-15", storeId: "nunoa", status: "low_stock" },
  { variantId: "rc-ma-8", storeId: "providencia", status: "low_stock" },

  { variantId: "pp-ac-15", storeId: "nunoa", status: "out_of_stock" },
  { variantId: "pp-ac-75", storeId: "maipu", status: "low_stock" },

  { variantId: "hl-ad-15", storeId: "maipu", status: "out_of_stock" },
  { variantId: "hl-ad-15", storeId: "nunoa", status: "out_of_stock" },
  { variantId: "hl-ad-75", storeId: "providencia", status: "low_stock" },

  { variantId: "md-ad-25", storeId: "providencia", status: "out_of_stock" },
  { variantId: "md-ad-25", storeId: "las-condes", status: "out_of_stock" },

  { variantId: "rc-mp-4", storeId: "maipu", status: "low_stock" },
  { variantId: "rc-mp-15", storeId: "nunoa", status: "out_of_stock" },

  { variantId: "kg-cl-l", storeId: "nunoa", status: "out_of_stock" },
  { variantId: "kg-cl-m", storeId: "maipu", status: "low_stock" },

  { variantId: "rc-in-10", storeId: "maipu", status: "out_of_stock" },
  { variantId: "rc-in-4", storeId: "nunoa", status: "low_stock" },

  { variantId: "hl-ca-35", storeId: "maipu", status: "out_of_stock" },

  { variantId: "wk-ad-10", storeId: "providencia", status: "low_stock" },

  { variantId: "tc-ag-10", storeId: "nunoa", status: "low_stock" },

  { variantId: "cn-1", storeId: "las-condes", status: "out_of_stock" },
  { variantId: "cn-1", storeId: "providencia", status: "low_stock" },

  { variantId: "hm-1", storeId: "maipu", status: "out_of_stock" },

  { variantId: "lr-1", storeId: "maipu", status: "out_of_stock" },
  { variantId: "lr-1", storeId: "nunoa", status: "low_stock" },

  { variantId: "cj-3", storeId: "maipu", status: "out_of_stock" },
  { variantId: "cj-3", storeId: "nunoa", status: "out_of_stock" },

  { variantId: "cb-1", storeId: "maipu", status: "out_of_stock" },
  { variantId: "cb-1", storeId: "providencia", status: "low_stock" },

  { variantId: "hn-1", storeId: "nunoa", status: "low_stock" },

  { variantId: "pz-tr-200", storeId: "maipu", status: "out_of_stock" },

  { variantId: "fl-60", storeId: "nunoa", status: "out_of_stock" },
  { variantId: "fl-60", storeId: "maipu", status: "out_of_stock" },

  { variantId: "uv-26w", storeId: "providencia", status: "low_stock" },
  { variantId: "uv-26w", storeId: "nunoa", status: "out_of_stock" },
  { variantId: "uv-26w", storeId: "maipu", status: "out_of_stock" },

  { variantId: "tr-250", storeId: "maipu", status: "low_stock" },
];

export function getStockLevel(variantId: string, storeId: string): StockLevel {
  const exception = exceptions.find((e) => e.variantId === variantId && e.storeId === storeId);
  return {
    variantId,
    storeId,
    status: exception?.status ?? "in_stock",
  };
}

export const stockExceptions = exceptions;
