import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// blog constants
// ---------------------------------------------------------------------------
export const BLOG_CATEGORY = ["cuidados", "alimentacion", "salud", "novedades"] as const;
export type BlogCategory = (typeof BLOG_CATEGORY)[number];

export const BLOG_STATUS = ["draft", "published", "archived"] as const;
export type BlogStatus = (typeof BLOG_STATUS)[number];

// ---------------------------------------------------------------------------
// pets constants
// ---------------------------------------------------------------------------
export const SPECIES = ["dog", "cat", "exotic"] as const;
export type Species = (typeof SPECIES)[number];

// ---------------------------------------------------------------------------
// points constants
// ---------------------------------------------------------------------------
export const POINTS_KIND = [
  "purchase",
  "first_purchase_bonus",
  "pet_birthday_bonus",
  "manual_adjustment",
  "redemption",
  "refund",
  "expiration",
] as const;
export type PointsKind = (typeof POINTS_KIND)[number];

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const USER_ROLES = {
  CUSTOMER: "customer",
  ADMIN: "admin",
  STAFF: "staff",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  rut: text("rut"),
  phone: text("phone"),
  role: text("role").notNull().default(USER_ROLES.CUSTOMER),
  storeId: text("store_id").references(() => stores.id),
  isDemoSeed: boolean("is_demo_seed").notNull().default(false),
  createdAt: text("created_at").notNull(),
});

// ---------------------------------------------------------------------------
// brands
// ---------------------------------------------------------------------------
export const brands = pgTable("brands", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  logoAlt: text("logo_alt"),
  originCountry: text("origin_country"),
  website: text("website"),
  description: text("description"),
});

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------
export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  parentId: text("parent_id").references((): AnyPgColumn => categories.id),
  species: text("species"),
  order: integer("order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// products
// ---------------------------------------------------------------------------
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  brandId: text("brand_id")
    .notNull()
    .references(() => brands.id),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  species: text("species").array().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  targetSize: text("target_size").array(),
  lifeStage: text("life_stage"),
  ingredients: text("ingredients"),
  nutritionalAnalysis: jsonb("nutritional_analysis"),
  featured: boolean("featured").notNull().default(false),
  // F3.5 — subscription config
  subscriptionEnabled: boolean("subscription_enabled").notNull().default(false),
  subscriptionFrequencies: integer("subscription_frequencies").array().notNull().default([]),
  subscriptionDiscountPercent: integer("subscription_discount_percent").notNull().default(0),
});

// ---------------------------------------------------------------------------
// product_categories  (junction: product ↔ category)
// ---------------------------------------------------------------------------
export const productCategories = pgTable(
  "product_categories",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.categoryId] }),
    index("idx_product_categories_category_id").on(t.categoryId),
  ],
);

// ---------------------------------------------------------------------------
// product_images
// ---------------------------------------------------------------------------
export const productImages = pgTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("idx_product_images_product_sort").on(t.productId, t.sortOrder)],
);

// ---------------------------------------------------------------------------
// product_variants
// ---------------------------------------------------------------------------
export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    quantityValue: numeric("quantity_value", { precision: 10, scale: 3 }).notNull(),
    quantityUnit: text("quantity_unit").notNull(),
    priceAmount: integer("price_amount").notNull(),
    priceCurrency: text("price_currency").notNull().default("CLP"),
    compareAtAmount: integer("compare_at_amount"),
    compareAtCurrency: text("compare_at_currency"),
    barcode: text("barcode"),
  },
  (t) => [index("idx_product_variants_product_id").on(t.productId)],
);

// ---------------------------------------------------------------------------
// stores
// ---------------------------------------------------------------------------
export const stores = pgTable("stores", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  commune: text("commune").notNull(),
  phone: text("phone").notNull(),
  lat: numeric("lat", { precision: 10, scale: 7 }).notNull(),
  lng: numeric("lng", { precision: 10, scale: 7 }).notNull(),
  schedule: jsonb("schedule").notNull(),
  services: text("services").array().notNull().default([]),
  reference: text("reference"),
  imageUrl: text("image_url"),
});

// ---------------------------------------------------------------------------
// stock_levels
// ---------------------------------------------------------------------------
export const stockLevels = pgTable(
  "stock_levels",
  {
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    status: text("status").notNull().default("in_stock"),
  },
  (t) => [
    primaryKey({ columns: [t.variantId, t.storeId] }),
    index("idx_stock_levels_store_id").on(t.storeId),
  ],
);

// ---------------------------------------------------------------------------
// APPOINTMENT_STATUS
// ---------------------------------------------------------------------------
export const APPOINTMENT_STATUS = {
  SCHEDULED: "scheduled",
  ATTENDED: "attended",
  CANCELED: "canceled",
  NO_SHOW: "no_show",
} as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

// ---------------------------------------------------------------------------
// services
// ---------------------------------------------------------------------------
export const services = pgTable("services", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  durationMin: integer("duration_min").notNull(),
  priceCents: integer("price_cents").notNull(),
  requiresPet: boolean("requires_pet").notNull().default(false),
  species: text("species").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// schedule_configs
// ---------------------------------------------------------------------------
export const scheduleConfigs = pgTable(
  "schedule_configs",
  {
    id: text("id").primaryKey(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    // null = store-wide default; non-null = service-specific override
    serviceId: text("service_id").references(() => services.id),
    weekday: integer("weekday").notNull(), // 0=Sunday, 6=Saturday
    startHHMM: integer("start_hhmm").notNull(), // e.g. 900 = 09:00
    endHHMM: integer("end_hhmm").notNull(), // must be > startHHMM
    slotMinutes: integer("slot_minutes").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    index("idx_schedule_configs_store_service_weekday").on(
      t.storeId,
      t.serviceId,
      t.weekday,
    ),
  ],
);

// ---------------------------------------------------------------------------
// blocked_slots
// Note: endsAt must be > startsAt (enforced at application level)
// ---------------------------------------------------------------------------
export const blockedSlots = pgTable("blocked_slots", {
  id: text("id").primaryKey(),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  // null = blocks all services at this store during the window
  serviceId: text("service_id").references(() => services.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// appointments
// ---------------------------------------------------------------------------
export const appointments = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    petId: text("pet_id").references(() => pets.id, { onDelete: "set null" }),
    petNameSnapshot: text("pet_name_snapshot"),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default(APPOINTMENT_STATUS.SCHEDULED),
    notes: text("notes"),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_appointments_store_starts_at").on(t.storeId, t.startsAt),
    index("idx_appointments_user_starts_at").on(t.userId, t.startsAt),
  ],
);

// ---------------------------------------------------------------------------
// pets
// ---------------------------------------------------------------------------
export const pets = pgTable("pets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  species: text("species").notNull(),
  breed: text("breed"),
  birthDate: text("birth_date"),
  weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// points_transactions
// ---------------------------------------------------------------------------
export const pointsTransactions = pgTable(
  "points_transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    deltaPoints: integer("delta_points").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    kind: text("kind").notNull(),
    referenceId: text("reference_id"),
    description: text("description").notNull(),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_points_transactions_user_created_at").on(t.userId, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// points_config (singleton — id always "singleton")
// ---------------------------------------------------------------------------
export const pointsConfig = pgTable("points_config", {
  id: text("id").primaryKey(),
  earnRatePerCLP: integer("earn_rate_per_clp").notNull().default(100),
  redeemValuePerPoint: integer("redeem_value_per_point").notNull().default(1),
  minRedeemPoints: integer("min_redeem_points").notNull().default(500),
  firstPurchaseBonus: integer("first_purchase_bonus").notNull().default(500),
  petBirthdayBonus: integer("pet_birthday_bonus").notNull().default(200),
  expirationMonths: integer("expiration_months"),
  active: boolean("active").notNull().default(true),
});

// ---------------------------------------------------------------------------
// restock_alerts
// ---------------------------------------------------------------------------
export const RESTOCK_ALERT_STATUS = ["pending", "fired", "canceled"] as const;
export type RestockAlertStatus = (typeof RESTOCK_ALERT_STATUS)[number];

export const restockAlerts = pgTable(
  "restock_alerts",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, {
      onDelete: "cascade",
    }),
    storeIds: text("store_ids").array(),
    status: text("status")
      .$type<RestockAlertStatus>()
      .notNull()
      .default("pending"),
    cancelToken: text("cancel_token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    firedAt: timestamp("fired_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_restock_product_status").on(t.productId, t.status),
    index("idx_restock_variant_status").on(t.variantId, t.status),
    index("idx_restock_user").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// demo_emails
// ---------------------------------------------------------------------------
export const DEMO_EMAIL_TYPE = [
  "appointment_confirmation",
  "appointment_reminder_24h",
  "appointment_reminder_2h",
  "appointment_canceled",
  "appointment_rescheduled",
  "restock_alert",
  "welcome",
  "points_adjustment",
  "order_confirmation",
  "shipment_dispatched",
  "shipment_delivered",
  "pickup_ready",
  // F3.5 — subscription notifications
  "subscription_reminder",
  "subscription_payment_failed",
  "other",
] as const;

export type DemoEmailType = (typeof DEMO_EMAIL_TYPE)[number];

export const demoEmails = pgTable(
  "demo_emails",
  {
    id: text("id").primaryKey(),
    toEmail: text("to_email").notNull(),
    toUserId: text("to_user_id").references(() => users.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    type: text("type").notNull(),
    bodyHtml: text("body_html").notNull(),
    bodyText: text("body_text").notNull(),
    data: jsonb("data"),
    triggeredBy: text("triggered_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_demo_emails_created_at").on(t.createdAt),
    index("idx_demo_emails_type_created_at").on(t.type, t.createdAt),
    index("idx_demo_emails_to_user_created_at").on(t.toUserId, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// checkout_sessions
// ---------------------------------------------------------------------------
export const CHECKOUT_SESSION_STATUS = ["active", "payment_pending", "completed", "expired"] as const;
export type CheckoutSessionStatus = (typeof CHECKOUT_SESSION_STATUS)[number];

export const DELIVERY_TYPE = ["despacho", "pickup", "courier"] as const;
export type DeliveryType = (typeof DELIVERY_TYPE)[number];

export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    cartSnapshot: jsonb("cart_snapshot").notNull(),
    address: jsonb("address"),
    shippingOptionId: text("shipping_option_id"),
    shippingCost: integer("shipping_cost"),
    status: text("status").notNull().default("active"),
    paymentGateway: text("payment_gateway"),
    paymentMetadata: jsonb("payment_metadata"),
    // F3.3 — shipping fields
    deliveryType: text("delivery_type"),
    pickupStoreId: text("pickup_store_id").references(() => stores.id),
    dispatchSlot: text("dispatch_slot"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_checkout_sessions_user_expires_at").on(t.userId, t.expiresAt),
  ],
);

// ---------------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------------
export const ORDER_STATUS = ["pending", "confirmed", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const ORDER_PAYMENT_STATUS = ["unpaid", "paid", "failed", "refunded", "pending_verification"] as const;
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUS)[number];

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    checkoutSessionId: text("checkout_session_id")
      .notNull()
      .references(() => checkoutSessions.id),
    status: text("status").notNull().default("pending"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    paymentGateway: text("payment_gateway").notNull(),
    paymentMetadata: jsonb("payment_metadata"),
    gatewayToken: text("gateway_token"),
    address: jsonb("address").notNull(),
    shippingOptionId: text("shipping_option_id").notNull(),
    shippingCost: integer("shipping_cost").notNull(),
    subtotal: integer("subtotal").notNull(),
    discountTotal: integer("discount_total").notNull().default(0),
    walletDiscount: integer("wallet_discount").notNull().default(0),
    total: integer("total").notNull(),
    couponCode: text("coupon_code"),
    pointsRedeemed: integer("points_redeemed").notNull().default(0),
    pointsEarned: integer("points_earned").notNull().default(0),
    salespersonId: text("salesperson_id"),
    priceListId: text("price_list_id"),
    dteId: text("dte_id"),
    creditDueDate: text("credit_due_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_orders_user_created_at").on(t.userId, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// order_items
// ---------------------------------------------------------------------------
export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    productId: text("product_id").notNull(),
    variantId: text("variant_id"),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (t) => [
    index("idx_order_items_order_id").on(t.orderId),
  ],
);

// ---------------------------------------------------------------------------
// order_sequences
// ---------------------------------------------------------------------------
export const orderSequences = pgTable("order_sequences", {
  date: text("date").primaryKey(),
  lastSeq: integer("last_seq").notNull().default(0),
});

// ---------------------------------------------------------------------------
// dte_documents
// ---------------------------------------------------------------------------
export const DTE_STATUS = ["por_emitir", "emitido", "anulado", "rechazado"] as const;
export type DteStatus = (typeof DTE_STATUS)[number];

export const dteDocuments = pgTable(
  "dte_documents",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    dteId: text("dte_id").notNull(),
    status: text("status").notNull().default("por_emitir"),
    folio: text("folio"),
    type: text("type"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    pdfUrl: text("pdf_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_dte_documents_order_id").on(t.orderId),
  ],
);

// ---------------------------------------------------------------------------
// blog_posts
// ---------------------------------------------------------------------------
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    heroImageUrl: text("hero_image_url"),
    category: text("category").notNull(),
    species: text("species").array().notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    authorName: text("author_name").notNull(),
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_blog_posts_status_published_at").on(t.status, t.publishedAt),
    index("idx_blog_posts_category").on(t.category),
  ],
);

// ---------------------------------------------------------------------------
// blog_post_products (junction: blog_post ↔ product)
// ---------------------------------------------------------------------------
export const blogPostProducts = pgTable(
  "blog_post_products",
  {
    postId: text("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.productId] }),
    index("idx_blog_post_products_product_id").on(t.productId),
  ],
);

// ---------------------------------------------------------------------------
// app_settings (F3.2b — singleton for admin-configurable flags)
// ---------------------------------------------------------------------------
export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("singleton"),
  paymentFailureMode: boolean("payment_failure_mode").notNull().default(false),
  // F3.3 — shipping settings
  coveredCommunes: text("covered_communes").array(),
  freeShippingThreshold: integer("free_shipping_threshold"),
  dispatchSlots: text("dispatch_slots").array(),
  // F3.5 — subscription reminder window (days before nextChargeAt)
  subscriptionReminderDays: integer("subscription_reminder_days").notNull().default(3),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// shipments (F3.3)
// ---------------------------------------------------------------------------
export const CARRIER_ID = ["propio", "mock_chilexpress", "mock_starken", "pickup"] as const;
export type CarrierId = (typeof CARRIER_ID)[number];

export const SHIPMENT_STATUS = ["preparando", "en_ruta", "entregado", "fallido", "listo"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUS)[number];

export const shipments = pgTable(
  "shipments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .unique()
      .references(() => orders.id),
    carrier: text("carrier").notNull(),
    status: text("status").notNull().default("preparando"),
    trackingNumber: text("tracking_number"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_shipments_order_id").on(t.orderId),
    index("idx_shipments_tracking_number").on(t.trackingNumber),
  ],
);

// ---------------------------------------------------------------------------
// tracking_events (F3.3)
// ---------------------------------------------------------------------------
export const trackingEvents = pgTable(
  "tracking_events",
  {
    id: text("id").primaryKey(),
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => shipments.id),
    status: text("status").notNull(),
    description: text("description").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_tracking_events_shipment_id").on(t.shipmentId),
  ],
);

// ---------------------------------------------------------------------------
// transfer_receipts (F3.2b — stores base64 receipt images for bank transfers)
// ---------------------------------------------------------------------------
export const transferReceipts = pgTable(
  "transfer_receipts",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    dataUrl: text("data_url").notNull(),
    bankReference: text("bank_reference").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_transfer_receipts_order_id").on(t.orderId),
  ],
);

// ---------------------------------------------------------------------------
// F3.5 — subscriptions
// ---------------------------------------------------------------------------
export const SUBSCRIPTION_STATUS = ["active", "paused", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number];

export const CYCLE_STATUS = ["charged", "failed", "reminder_sent"] as const;
export type CycleStatus = (typeof CYCLE_STATUS)[number];

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id),
    frequencyDays: integer("frequency_days").notNull(),
    discountPercent: integer("discount_percent").notNull().default(0),
    quantity: integer("quantity").notNull().default(1),
    status: text("status").notNull().default("active"),
    nextChargeAt: timestamp("next_charge_at", { withTimezone: true }).notNull(),
    pausedUntil: timestamp("paused_until", { withTimezone: true }),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lastChargedAt: timestamp("last_charged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_subscriptions_status_next_charge").on(t.status, t.nextChargeAt),
    index("idx_subscriptions_user_id").on(t.userId),
  ],
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export const subscriptionCycles = pgTable(
  "subscription_cycles",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => orders.id),
    status: text("status").notNull(),
    chargedAt: timestamp("charged_at", { withTimezone: true }),
    attemptNumber: integer("attempt_number").notNull().default(1),
    failureReason: text("failure_reason"),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_subscription_cycles_sub_created").on(t.subscriptionId, t.createdAt),
  ],
);

export type SubscriptionCycle = typeof subscriptionCycles.$inferSelect;
export type NewSubscriptionCycle = typeof subscriptionCycles.$inferInsert;

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, { relationName: "category_parent" }),
  productCategories: many(productCategories),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  productCategories: many(productCategories),
  images: many(productImages),
  variants: many(productVariants),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  stockLevels: many(stockLevels),
}));

export const storesRelations = relations(stores, ({ many }) => ({
  stockLevels: many(stockLevels),
  users: many(users),
  scheduleConfigs: many(scheduleConfigs),
  blockedSlots: many(blockedSlots),
  appointments: many(appointments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  store: one(stores, { fields: [users.storeId], references: [stores.id] }),
  appointments: many(appointments),
  pets: many(pets),
  pointsTransactions: many(pointsTransactions),
  addresses: many(userAddresses),
}));

export const petsRelations = relations(pets, ({ one }) => ({
  user: one(users, { fields: [pets.userId], references: [users.id] }),
}));

export const pointsTransactionsRelations = relations(pointsTransactions, ({ one }) => ({
  user: one(users, {
    fields: [pointsTransactions.userId],
    references: [users.id],
    relationName: "points_user",
  }),
  createdByUser: one(users, {
    fields: [pointsTransactions.createdBy],
    references: [users.id],
    relationName: "points_created_by",
  }),
}));

export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
  variant: one(productVariants, {
    fields: [stockLevels.variantId],
    references: [productVariants.id],
  }),
  store: one(stores, {
    fields: [stockLevels.storeId],
    references: [stores.id],
  }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  scheduleConfigs: many(scheduleConfigs),
  blockedSlots: many(blockedSlots),
  appointments: many(appointments),
}));

export const scheduleConfigsRelations = relations(scheduleConfigs, ({ one }) => ({
  store: one(stores, {
    fields: [scheduleConfigs.storeId],
    references: [stores.id],
  }),
  service: one(services, {
    fields: [scheduleConfigs.serviceId],
    references: [services.id],
  }),
}));

export const blockedSlotsRelations = relations(blockedSlots, ({ one }) => ({
  store: one(stores, {
    fields: [blockedSlots.storeId],
    references: [stores.id],
  }),
  service: one(services, {
    fields: [blockedSlots.serviceId],
    references: [services.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(users, {
    fields: [appointments.userId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  store: one(stores, {
    fields: [appointments.storeId],
    references: [stores.id],
  }),
  pet: one(pets, {
    fields: [appointments.petId],
    references: [pets.id],
  }),
}));

export const demoEmailsRelations = relations(demoEmails, ({ one }) => ({
  toUser: one(users, {
    fields: [demoEmails.toUserId],
    references: [users.id],
    relationName: "demo_emails_to_user",
  }),
  triggeredByUser: one(users, {
    fields: [demoEmails.triggeredBy],
    references: [users.id],
    relationName: "demo_emails_triggered_by",
  }),
}));

export const restockAlertsRelations = relations(restockAlerts, ({ one }) => ({
  user: one(users, {
    fields: [restockAlerts.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [restockAlerts.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [restockAlerts.variantId],
    references: [productVariants.id],
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ many }) => ({
  blogPostProducts: many(blogPostProducts),
}));

export const blogPostProductsRelations = relations(blogPostProducts, ({ one }) => ({
  post: one(blogPosts, {
    fields: [blogPostProducts.postId],
    references: [blogPosts.id],
  }),
  product: one(products, {
    fields: [blogPostProducts.productId],
    references: [products.id],
  }),
}));

export const transferReceiptsRelations = relations(transferReceipts, ({ one }) => ({
  order: one(orders, {
    fields: [transferReceipts.orderId],
    references: [orders.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
  trackingEvents: many(trackingEvents),
}));

export const trackingEventsRelations = relations(trackingEvents, ({ one }) => ({
  shipment: one(shipments, {
    fields: [trackingEvents.shipmentId],
    references: [shipments.id],
  }),
}));

// ---------------------------------------------------------------------------
// user_addresses (F3.4)
// ---------------------------------------------------------------------------
export const userAddresses = pgTable(
  "user_addresses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    name: text("name").notNull(),
    street: text("street").notNull(),
    commune: text("commune").notNull(),
    region: text("region").notNull(),
    phone: text("phone").notNull(),
    notes: text("notes"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_user_addresses_user_id").on(t.userId)],
);

export type UserAddress = typeof userAddresses.$inferSelect;
export type NewUserAddress = typeof userAddresses.$inferInsert;

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, {
    fields: [userAddresses.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [subscriptions.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [subscriptions.variantId],
    references: [productVariants.id],
  }),
  cycles: many(subscriptionCycles),
}));

export const subscriptionCyclesRelations = relations(subscriptionCycles, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [subscriptionCycles.subscriptionId],
    references: [subscriptions.id],
  }),
  order: one(orders, {
    fields: [subscriptionCycles.orderId],
    references: [orders.id],
  }),
}));

