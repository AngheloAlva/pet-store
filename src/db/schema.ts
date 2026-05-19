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
    // petId nullable until F2.4 adds pets table
    petId: text("pet_id"),
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
}));
