# Scraper — TusMascotas.cl (Estructura para Claude Code)

> Objetivo: extraer catálogo completo de tusmascotas.cl para usarlo como seed data del demo.
> Incluye: productos, categorías, marcas, precios, variantes, stock por sucursal, e imágenes.

---

## Stack del Scraper

| Herramienta | Uso |
|------------|-----|
| Node.js + TypeScript | Runtime principal |
| Playwright o Puppeteer | Navegación (el sitio es WooCommerce con contenido dinámico) |
| Cheerio | Parseo de HTML (si algunas páginas se pueden obtener con fetch directo) |
| Sharp | Redimensionar imágenes antes de subir (opcional) |
| AWS SDK (Cloudflare R2) | Subir imágenes al bucket |

**¿Por qué Playwright y no solo fetch + cheerio?**
WooCommerce con muchos plugins suele cargar contenido dinámicamente (precios, stock, variantes). Playwright asegura que todo el JS se ejecute y el DOM esté completo antes de parsear.

---

## Arquitectura del Scraper

```
scraper/
├── src/
│   ├── index.ts                 # Entry point — orquesta todo el flujo
│   ├── crawlers/
│   │   ├── categories.ts        # Extrae el árbol de categorías del menú
│   │   ├── productList.ts       # Navega páginas de categoría y extrae URLs de productos
│   │   └── productDetail.ts     # Entra a cada producto y extrae la ficha completa
│   ├── uploaders/
│   │   └── images.ts            # Descarga imágenes y sube a bucket S3/R2
│   ├── utils/
│   │   ├── browser.ts           # Setup de Playwright (headless, user-agent, delays)
│   │   ├── parser.ts            # Helpers de parseo (limpiar precios, slugify, etc.)
│   │   ├── rateLimiter.ts       # Delay entre requests para no saturar el servidor
│   │   └── logger.ts            # Logging con progreso
│   └── types.ts                 # Tipos compartidos
├── output/
│   ├── categories.json          # Resultado: árbol de categorías
│   ├── products.json            # Resultado: array de productos completos
│   ├── brands.json              # Resultado: marcas extraídas
│   ├── stores.json              # Resultado: sucursales
│   └── images/                  # Imágenes descargadas (antes de subir al bucket)
├── package.json
└── tsconfig.json
```

---

## Flujo de Ejecución

```
1. Extraer categorías
   └── Parsear el mega-menú de tusmascotas.cl
   └── Guardar árbol de categorías con slugs y URLs

2. Extraer listado de productos por categoría
   └── Para cada categoría, navegar todas las páginas de paginación
   └── Extraer URL de cada producto
   └── Deduplicar (un producto puede estar en varias categorías)

3. Extraer detalle de cada producto
   └── Para cada URL de producto, visitar la página
   └── Extraer: nombre, precio, marca, descripción, imágenes, variantes, stock
   └── Guardar en products.json

4. Descargar imágenes
   └── Para cada producto, descargar imágenes a output/images/
   └── Renombrar como {product-slug}-{index}.webp
   └── (Opcional) Redimensionar con Sharp

5. Subir imágenes a bucket
   └── Subir cada imagen a R2
   └── Guardar la URL pública en el JSON del producto
```

---

## Paso 1: Extraer Categorías

**Fuente:** el mega-menú del header en tusmascotas.cl

**Estructura del menú detectada:**
```
Perros (nivel 1)
├── Alimentos (nivel 2)
├── Alimentos Húmedos
├── Antiparasitario
├── Juguetes
├── ... (~27 subcategorías)
Gatos (nivel 1)
├── Alimentos
├── Arenas
├── ... (~22 subcategorías)
Exóticos (nivel 1)
├── Aves (nivel 2)
│   ├── Jaulas (nivel 3)
│   ├── Alimentos y Snacks
│   └── ...
├── Chinchillas
│   ├── Alimentos
│   └── ...
├── Conejos
├── Erizos
├── Hamsters
└── ...
Farmacia (nivel 1)
```

**Selectores CSS probables (verificar en el sitio):**
```typescript
// El menú de WooCommerce típicamente usa estas clases:
// nav.main-navigation, ul.menu, li.menu-item, ul.sub-menu

// Pseudocódigo del crawler
const menuItems = await page.$$('nav ul.menu > li.menu-item');
for (const item of menuItems) {
  const name = await item.$eval('> a', el => el.textContent.trim());
  const url = await item.$eval('> a', el => el.href);
  const subItems = await item.$$(':scope > ul.sub-menu > li');
  // recursivo para sub-subcategorías
}
```

**Output esperado (categories.json):**
```json
[
  {
    "id": "perros",
    "slug": "perros",
    "name": "Perros",
    "url": "https://www.tusmascotas.cl/categoria-producto/perros/",
    "species": "perro",
    "children": [
      {
        "id": "alimentos-perros",
        "slug": "alimentos-perros",
        "name": "Alimentos",
        "url": "https://www.tusmascotas.cl/categoria-producto/perros/alimentos-perros/",
        "parentId": "perros",
        "children": []
      }
    ]
  }
]
```

---

## Paso 2: Extraer Listado de Productos

**Fuente:** páginas de categoría (ej: `/categoria-producto/perros/alimentos-perros/`)

**Lógica:**
- WooCommerce pagina típicamente con `?paged=2`, `/page/2/`, o carga infinita
- Necesitas detectar el esquema de paginación del sitio
- Extraer el `href` de cada card de producto
- Deduplicar URLs (un producto puede aparecer en múltiples categorías)

**Selectores CSS probables:**
```typescript
// Cards de producto WooCommerce:
// ul.products li.product a.woocommerce-LoopProduct-link
// o: div.product-grid .product-item a

const productLinks = await page.$$eval(
  'ul.products li.product a.woocommerce-LoopProduct-link',
  links => links.map(a => a.href)
);

// Paginación:
// nav.woocommerce-pagination a.next
const nextPage = await page.$('nav.woocommerce-pagination a.next');
```

**Rate limiting:**
```typescript
// IMPORTANTE: ser respetuoso con el servidor
// Esperar 1-2 segundos entre cada request
await sleep(1500 + Math.random() * 1000); // 1.5-2.5s random delay
```

---

## Paso 3: Extraer Detalle de Producto

**Fuente:** página individual de producto (ej: `/product/royal-canin-medium-adult-15kg/`)

**Datos a extraer:**

| Campo | Selector probable | Notas |
|-------|------------------|-------|
| Nombre | `h1.product_title` | - |
| Precio actual | `.price .woocommerce-Price-amount` | Parsear: "$12.990" → 12990 |
| Precio anterior | `.price del .woocommerce-Price-amount` | Solo si tiene descuento |
| Marca | Varía: puede ser un atributo, tag, o texto | Buscar en atributos o breadcrumb |
| Descripción | `.woocommerce-product-details__short-description` o `#tab-description` | Puede ser HTML |
| Imágenes | `.woocommerce-product-gallery img` | Extraer `src` de todas las imágenes |
| Categorías | `.posted_in a` | Links a categorías |
| SKU | `.sku` | Si existe |
| Variantes | `.variations select option` | Para productos variables (tamaños) |
| Stock por sucursal | Personalizado del theme | Ver nota abajo |

**Stock por sucursal — caso especial:**
En la ficha de producto de tusmascotas.cl se muestra stock por sucursal (Bilbao, Los Leones, Velasco, etc.). Esto probablemente sea un custom field o plugin. Hay que inspeccionar la página para encontrar el selector exacto.

```typescript
// Ejemplo de lo que podrías encontrar:
// <div class="stock-by-store">
//   <div class="store-stock">
//     <span class="store-name">Bilbao</span>
//     <span class="stock-status in-stock">Disponible</span>
//   </div>
// </div>

// O podría ser una tabla:
// table.stock-table tr td

// IMPORTANTE: inspeccionar el DOM real del sitio para determinar los selectores
```

**Output esperado (products.json):**
```json
[
  {
    "id": "royal-canin-medium-adult-15kg",
    "slug": "royal-canin-medium-adult-15kg",
    "name": "Royal Canin Medium Adult 15kg",
    "brand": "Royal Canin",
    "description": "Alimento seco para perros adultos de raza mediana...",
    "price": 52990,
    "originalPrice": 59990,
    "currency": "CLP",
    "images": [
      {
        "original": "https://www.tusmascotas.cl/wp-content/uploads/...",
        "local": "images/royal-canin-medium-adult-15kg-0.webp",
        "bucket": ""
      }
    ],
    "categories": ["perros", "alimentos-perros"],
    "species": ["perro"],
    "sku": "RC-MED-AD-15",
    "variants": [
      { "name": "3kg", "price": 15990, "sku": "RC-MED-AD-3" },
      { "name": "8kg", "price": 35990, "sku": "RC-MED-AD-8" },
      { "name": "15kg", "price": 52990, "sku": "RC-MED-AD-15" }
    ],
    "stockByStore": [
      { "store": "Bilbao", "status": "available" },
      { "store": "Los Leones", "status": "low" },
      { "store": "Velasco", "status": "out_of_stock" },
      { "store": "Apoquindo", "status": "available" },
      { "store": "Maipú", "status": "available" }
    ],
    "tags": ["oferta"],
    "url": "https://www.tusmascotas.cl/product/royal-canin-medium-adult-15kg/"
  }
]
```

---

## Paso 4: Extraer Sucursales

**Fuente:** página de sucursales (`/sucursales/`) y página de contacto (`/contacto/`)

**Datos a extraer:**
```json
[
  {
    "id": "bilbao",
    "name": "Bilbao",
    "fullName": "Francisco Bilbao 2049",
    "address": "Av. Francisco Bilbao 2049, Providencia",
    "commune": "Providencia",
    "reference": "Estación de Metro Inés de Suárez, a menos de una cuadra",
    "phone": "+56950008898",
    "coordinates": { "lat": -33.4280, "lng": -70.6180 },
    "schedule": {
      "weekdays": "11:30 - 19:30",
      "weekends": "11:30 - 19:30"
    },
    "services": ["tienda", "veterinaria", "peluqueria"]
  }
]
```

**Nota:** las coordenadas habrá que obtenerlas geocodificando las direcciones o extrayéndolas del mapa embebido si tiene Google Maps.

---

## Paso 5: Descarga y Subida de Imágenes

### Descargar

```typescript
// Pseudocódigo
import fs from 'fs';
import path from 'path';

async function downloadImage(url: string, filename: string) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(
    path.join('output/images', filename),
    Buffer.from(buffer)
  );
}

// Para cada producto:
for (const product of products) {
  for (let i = 0; i < product.images.length; i++) {
    const filename = `${product.slug}-${i}.webp`;
    await downloadImage(product.images[i].original, filename);
    product.images[i].local = `images/${filename}`;
    await sleep(500); // No bombardear el servidor
  }
}
```

### Redimensionar (opcional pero recomendado)

```typescript
import sharp from 'sharp';

// Crear múltiples tamaños para el sitio
async function processImage(inputPath: string, slug: string, index: number) {
  const sizes = [
    { name: 'thumb', width: 300, height: 300 },
    { name: 'medium', width: 600, height: 600 },
    { name: 'large', width: 1200, height: 1200 },
  ];

  for (const size of sizes) {
    await sharp(inputPath)
      .resize(size.width, size.height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .webp({ quality: 85 })
      .toFile(`output/images/${slug}-${index}-${size.name}.webp`);
  }
}
```

### Subir a Bucket

#### Opción A: Cloudflare R2 (compatible con S3, económico)

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

async function uploadToR2(filePath: string, key: string) {
  const fileBuffer = fs.readFileSync(filePath);
  await r2.send(new PutObjectCommand({
    Bucket: 'petcommerce-images',
    Key: `products/${key}`,
    Body: fileBuffer,
    ContentType: 'image/webp',
  }));
  // URL pública: https://images.tudominio.com/products/{key}
}
```

#### Opción B: Supabase Storage

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function uploadToSupabase(filePath: string, key: string) {
  const fileBuffer = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(`products/${key}`, fileBuffer, {
      contentType: 'image/webp',
      upsert: true,
    });
  // URL pública: ${SUPABASE_URL}/storage/v1/object/public/product-images/products/{key}
}
```

### Actualizar el JSON con URLs del bucket

```typescript
// Después de subir, actualizar products.json con las URLs finales
for (const product of products) {
  for (const image of product.images) {
    image.bucket = `https://images.tudominio.com/products/${image.local}`;
  }
}
fs.writeFileSync('output/products.json', JSON.stringify(products, null, 2));
```

---

## Consideraciones Importantes

### Rate Limiting y Respeto al Servidor
- **Delay mínimo:** 1.5-2.5 segundos entre requests
- **User-Agent:** usar uno real, no el default de Playwright
- **Horario:** correr el scraper en horario de bajo tráfico (madrugada)
- **No scrapear en paralelo:** una request a la vez
- **Cachear resultados:** si falla a mitad del proceso, poder retomar sin re-scrapear todo

### Manejo de Errores y Reintentos
```typescript
async function scrapeWithRetry(url: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // ... scraping logic
      return result;
    } catch (error) {
      console.error(`Intento ${attempt}/${maxRetries} falló para ${url}: ${error.message}`);
      if (attempt === maxRetries) throw error;
      await sleep(5000 * attempt); // Backoff exponencial
    }
  }
}
```

### Checkpointing (guardar progreso)
```typescript
// Guardar progreso después de cada producto
// Si el proceso se cae, retomar desde donde quedó
const CHECKPOINT_FILE = 'output/.checkpoint.json';

function saveCheckpoint(processedUrls: string[]) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(processedUrls));
}

function loadCheckpoint(): string[] {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
  }
  return [];
}
```

### Estimación de Volumen
Basándome en la estructura del menú de TusMascotas:
- ~70+ subcategorías activas
- Estimado: 500-2000 productos
- ~2-5 imágenes por producto
- Tiempo estimado total: 1-3 horas (con delays respetuosos)
- Espacio en imágenes: ~500MB-2GB (originales), ~200MB-800MB (optimizadas)

---

## Output Final para el Proyecto Next.js

Una vez scrapeado todo, el output se transforma al formato de tipos de la Fase 1:

```
output/
├── categories.json    → src/data/categories.ts
├── products.json      → src/data/products.ts
├── brands.json        → src/data/brands.ts (extraído de products)
├── stores.json        → src/data/stores.ts
└── images/            → subidas al bucket, URLs en los JSONs
```

Transformación simple:
```typescript
// Script para convertir JSON scrapeado a módulos TS para el proyecto
const products = JSON.parse(fs.readFileSync('output/products.json', 'utf-8'));

const tsContent = `import type { Product } from '@/types';

export const products: Product[] = ${JSON.stringify(products, null, 2)};
`;

fs.writeFileSync('../petcommerce/src/data/products.ts', tsContent);
```
