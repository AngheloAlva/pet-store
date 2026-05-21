/**
 * Blog posts seed data — 10 deterministic posts.
 * Distribution: cuidados(3), alimentacion(3), salud(2), novedades(2)
 * Species: dog(4), cat(3), exotic(2), multi(1)
 * Status: 8 published (deterministic dates), 2 drafts
 * Each published post has 2-3 related products.
 */

import { loremflickr, blogHeroTags } from "@/lib/demo-images";

// Deterministic base date: 2026-05-19
const BASE_DATE = new Date("2026-05-19T00:00:00Z");

function daysAgo(days: number): Date {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() - days);
  return d;
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------
export const seedBlogPosts = [
  // ── CUIDADOS ─────────────────────────────────────────────────────────────
  {
    id: "blog-post-01",
    slug: "cuidados-basicos-para-perros",
    title: "Cuidados básicos para tu perro",
    excerpt:
      "Guía completa sobre los cuidados esenciales que necesita tu perro para vivir feliz y saludable.",
    bodyMarkdown: `# Cuidados básicos para tu perro

Tener un perro en casa es una de las experiencias más gratificantes que existen. Sin embargo, también implica una gran responsabilidad. Aquí te contamos los cuidados fundamentales que no pueden faltar.

## Alimentación equilibrada

La base de una vida sana es una buena nutrición. Elige un alimento balanceado apropiado para la edad, tamaño y nivel de actividad de tu perro. Consulta siempre con tu veterinario antes de cambiar la dieta.

- Perritos y razas pequeñas requieren porciones más frecuentes.
- Los perros adultos se alimentan 2 veces al día.
- El agua fresca debe estar disponible en todo momento.

## Ejercicio diario

El ejercicio es fundamental para la salud física y mental de tu perro. Al menos 30 minutos de caminata o juego activo son necesarios.

## Higiene y grooming

El baño regular, el cepillado del pelaje y el corte de uñas son parte del cuidado básico. La frecuencia depende de la raza y el tipo de pelaje.

## Visitas al veterinario

Las revisiones anuales y las vacunas al día son indispensables para prevenir enfermedades y detectar problemas a tiempo.`,
    heroImageUrl: loremflickr({ tags: blogHeroTags({ category: "cuidados", species: ["dog"] }), seed: "cuidados-basicos-para-perros", width: 800, height: 450 }),
    category: "cuidados",
    species: ["dog"],
    tags: ["perros", "cuidados", "salud"],
    authorName: "Dr. Alejandro García",
    status: "published",
    publishedAt: daysAgo(3),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(3),
  },
  {
    id: "blog-post-02",
    slug: "cuidados-esenciales-para-gatos",
    title: "Cuidados esenciales para gatos en departamento",
    excerpt:
      "Cómo mantener a tu gato feliz y estimulado viviendo en un espacio pequeño.",
    bodyMarkdown: `# Cuidados para gatos en departamento

Los gatos son animales perfectos para vivir en departamentos, siempre que tengamos en cuenta sus necesidades especiales.

## Enriquecimiento ambiental

Un gato en departamento necesita estímulos para mantenerse activo y feliz:

- **Rascadores verticales**: esenciales para sus garras y como punto de referencia territorial.
- **Ventanas accesibles**: el entretenimiento de ver el mundo exterior es invaluable.
- **Juguetes interactivos**: al menos 15-20 minutos de juego activo por día.

## Arenero y limpieza

El arenero debe limpiarse a diario y cambiarse completamente una vez por semana. Un gato con arenero sucio buscará otros lugares para hacer sus necesidades.

## Alimentación adecuada

Los gatos son carnívoros estrictos. Su alimento debe tener un alto contenido proteico de origen animal. El agua es fundamental — muchos gatos prefieren las fuentes de agua en movimiento.

## Socialización

Aunque independientes, los gatos necesitan interacción y afecto diario para mantener su equilibrio emocional.`,
    heroImageUrl: loremflickr({ tags: blogHeroTags({ category: "cuidados", species: ["cat"] }), seed: "cuidados-esenciales-para-gatos", width: 800, height: 450 }),
    category: "cuidados",
    species: ["cat"],
    tags: ["gatos", "cuidados", "departamento"],
    authorName: "Dra. Valentina Torres",
    status: "published",
    publishedAt: daysAgo(7),
    createdAt: daysAgo(9),
    updatedAt: daysAgo(7),
  },
  {
    id: "blog-post-03",
    slug: "cuidados-mascotas-exoticas",
    title: "Guía de cuidados para mascotas exóticas",
    excerpt:
      "Conejos, hámsters, aves y reptiles requieren cuidados específicos muy distintos a los de perros y gatos.",
    bodyMarkdown: `# Mascotas exóticas: guía de cuidados

Las mascotas exóticas son cada vez más populares en los hogares chilenos. Cada especie tiene requerimientos únicos que es fundamental conocer antes de adoptarlas.

## Pequeños mamíferos

Los conejos, hámsters y cobayas son sociales y necesitan:

- **Jaulas amplias** con suficiente espacio para moverse.
- **Dieta herbívora** basada en heno, pellets y verduras frescas.
- **Enriquecimiento**: túneles, ruedas y objetos para roer.

## Aves

Los loros y canarios son inteligentes y necesitan estimulación constante:

- Interacción diaria y juguetes que desafíen su inteligencia.
- Una dieta variada con semillas, frutas y verduras.
- Espacio para volar dentro del hogar o una jaula grande.

## Reptiles

Las tortugas y lagartijas requieren cuidados especiales:

- **Temperatura regulada**: necesitan gradientes térmicos.
- **Luz UV**: esencial para sintetizar vitamina D3.
- **Humedad adecuada**: varía según la especie.

Siempre consulta con un veterinario especializado en fauna exótica.`,
    heroImageUrl: loremflickr({ tags: blogHeroTags({ category: "cuidados", species: ["exotic"] }), seed: "cuidados-mascotas-exoticas", width: 800, height: 450 }),
    category: "cuidados",
    species: ["exotic"],
    tags: ["exóticos", "cuidados", "conejo", "loro"],
    authorName: "Dr. Cristóbal Muñoz",
    status: "published",
    publishedAt: daysAgo(14),
    createdAt: daysAgo(16),
    updatedAt: daysAgo(14),
  },

  // ── ALIMENTACIÓN ─────────────────────────────────────────────────────────
  {
    id: "blog-post-04",
    slug: "nutricion-perro-por-etapa",
    title: "Nutrición del perro según etapa de vida",
    excerpt:
      "Cachorros, adultos y senior tienen necesidades nutricionales muy distintas. Aprende a elegir el alimento correcto.",
    bodyMarkdown: `# Nutrición del perro según su etapa de vida

La alimentación es el pilar más importante de la salud canina. Un alimento inapropiado para la etapa de vida puede causar déficits nutricionales o excesos perjudiciales.

## Cachorros (0-12 meses)

Los cachorros necesitan más proteínas y calorías que los adultos para soportar su rápido crecimiento:

- **Proteína alta**: al menos 25-30% en base seca.
- **DHA**: ácido graso esencial para el desarrollo cerebral.
- **Calcio y fósforo equilibrados**: críticos para huesos y dientes.
- Alimentar 3-4 veces al día hasta los 6 meses.

## Adultos (1-7 años)

Los requerimientos se estabilizan. La clave es el mantenimiento del peso ideal:

- Calcular la ración según el peso y nivel de actividad.
- Alimentar 2 veces al día.
- Evitar los premios excesivos (no más del 10% del total calórico).

## Senior (7+ años)

Los perros mayores tienen un metabolismo más lento y pueden desarrollar problemas articulares o renales:

- Alimento con menos calorías pero alta biodisponibilidad proteica.
- Suplementación con glucosamina y condroitina para las articulaciones.
- Mayor contenido de fibra para la salud digestiva.`,
    heroImageUrl: loremflickr({ tags: blogHeroTags({ category: "alimentacion", species: ["dog"] }), seed: "nutricion-perro-por-etapa", width: 800, height: 450 }),
    category: "alimentacion",
    species: ["dog"],
    tags: ["nutrición", "perros", "alimentación"],
    authorName: "Dra. Isidora Fuentes",
    status: "published",
    publishedAt: daysAgo(21),
    createdAt: daysAgo(23),
    updatedAt: daysAgo(21),
  },
  {
    id: "blog-post-05",
    slug: "alimentacion-gato-carnivoro-estricto",
    title: "¿Por qué tu gato necesita proteína animal?",
    excerpt:
      "Los gatos son carnívoros estrictos. Entender su biología te ayudará a elegir el mejor alimento.",
    bodyMarkdown: `# El gato como carnívoro estricto

A diferencia de los perros, los gatos no pueden adaptarse a dietas vegetarianas o con alto contenido de carbohidratos. Su metabolismo está diseñado exclusivamente para procesar proteína animal.

## Necesidades metabólicas únicas

Los gatos no pueden sintetizar taurina, arginina ni ácido araquidónico en cantidades suficientes:

- **Taurina**: esencial para la salud cardíaca y la visión. Su deficiencia causa cardiomiopatía dilatada.
- **Arginina**: indispensable para el ciclo de la urea. Sin ella, el amoniaco se acumula rápidamente.
- **Vitamina A preformada**: no pueden convertir beta-caroteno en vitamina A como hacen otros mamíferos.

## ¿Húmedo o seco?

Ambos tienen ventajas:

- **Húmedo**: hidratación extra, más palatabilidad, ideal para gatos con problemas renales.
- **Seco**: más conveniente, mejor para la salud dental, económicamente más eficiente.

## Lo que debes evitar

- Alimentos con maíz, trigo o soja como primer ingrediente.
- Productos con colorantes, saborizantes artificiales y conservantes BHT/BHA.
- Dietas caseras sin supervisión veterinaria.`,
    heroImageUrl: loremflickr({ tags: blogHeroTags({ category: "alimentacion", species: ["cat"] }), seed: "alimentacion-gato-carnivoro-estricto", width: 800, height: 450 }),
    category: "alimentacion",
    species: ["cat"],
    tags: ["gatos", "nutrición", "proteína"],
    authorName: "Dra. Valentina Torres",
    status: "published",
    publishedAt: daysAgo(30),
    createdAt: daysAgo(32),
    updatedAt: daysAgo(30),
  },
  {
    id: "blog-post-06",
    slug: "alimentos-prohibidos-mascotas",
    title: "10 alimentos que nunca debes darle a tu mascota",
    excerpt:
      "Algunos alimentos cotidianos para nosotros pueden ser tóxicos o incluso letales para perros y gatos.",
    bodyMarkdown: `# 10 alimentos que nunca debes darle a tu mascota

La curiosidad de nuestras mascotas y nuestra costumbre de compartir la comida puede ponerlas en riesgo. Conoce los alimentos más peligrosos.

## Los más peligrosos

1. **Chocolate**: contiene teobromina, tóxica para perros y gatos. Puede causar vómitos, convulsiones e incluso la muerte.
2. **Uvas y pasas**: provocan insuficiencia renal aguda en perros.
3. **Cebolla y ajo**: destruyen los glóbulos rojos, causando anemia hemolítica.
4. **Xilitol**: edulcorante presente en chicles y productos light. Causa hipoglicemia severa y falla hepática.
5. **Aguacate**: la persona (componente activo) es tóxica para muchas especies.

## Moderadamente peligrosos

6. **Lácteos**: muchas mascotas son intolerantes a la lactosa.
7. **Huesos cocidos**: pueden astillarse y perforar el tracto digestivo.
8. **Cafeína**: presente en café, té y bebidas energéticas.
9. **Alcohol**: el hígado de las mascotas no puede procesarlo.
10. **Nueces de macadamia**: causa debilidad muscular y fiebre en perros.

**Ante cualquier ingesta accidental, contacta inmediatamente a tu veterinario.**`,
    heroImageUrl: loremflickr({ tags: blogHeroTags({ category: "alimentacion", species: ["dog", "cat"] }), seed: "alimentos-prohibidos-mascotas", width: 800, height: 450 }),
    category: "alimentacion",
    species: ["dog", "cat"],
    tags: ["nutrición", "toxicidad", "alimentos prohibidos"],
    authorName: "Dr. Alejandro García",
    status: "published",
    publishedAt: daysAgo(45),
    createdAt: daysAgo(47),
    updatedAt: daysAgo(45),
  },

  // ── SALUD ─────────────────────────────────────────────────────────────────
  {
    id: "blog-post-07",
    slug: "calendario-vacunacion-perros-chile",
    title: "Calendario de vacunación para perros en Chile",
    excerpt:
      "Guía completa con las vacunas obligatorias y recomendadas según la edad de tu perro.",
    bodyMarkdown: `# Calendario de vacunación para perros en Chile

Las vacunas son la herramienta más efectiva para prevenir enfermedades graves. Aquí te presentamos el calendario recomendado por la Asociación Veterinaria de Chile.

## Vacunas esenciales en cachorros

| Edad | Vacuna |
|------|--------|
| 6-8 semanas | Polivalente (distemper, parvovirus, adenovirus) |
| 10-12 semanas | Refuerzo polivalente + Leptospirosis |
| 14-16 semanas | Refuerzo polivalente + Rabia |

## Adultos — mantenimiento anual

- Refuerzo polivalente (DA2PP o DHPPi)
- Rabia: obligatoria en Chile
- Leptospirosis: especialmente en zonas rurales o con acceso a agua estancada
- Bordetella: recomendada si el perro asiste a guarderías o parques caninos

## Consideraciones especiales

- No vacunar a perros enfermos o con fiebre.
- Esperar 2 semanas después de una desparasitación.
- Registrar todas las vacunas en el carnet sanitario.`,
    heroImageUrl: loremflickr({ tags: blogHeroTags({ category: "salud", species: ["dog"] }), seed: "calendario-vacunacion-perros-chile", width: 800, height: 450 }),
    category: "salud",
    species: ["dog"],
    tags: ["salud", "vacunas", "prevención"],
    authorName: "Dr. Alejandro García",
    status: "published",
    publishedAt: daysAgo(60),
    createdAt: daysAgo(62),
    updatedAt: daysAgo(60),
  },
  {
    id: "blog-post-08",
    slug: "senales-enfermedad-gato",
    title: "Señales de alerta: ¿cuándo llevar al gato al veterinario?",
    excerpt:
      "Los gatos son maestros ocultando el dolor. Aprende a detectar los signos que indican que necesitan atención médica.",
    bodyMarkdown: `# ¿Cuándo llevar al gato al veterinario?

Los gatos instintivamente ocultan el dolor y la enfermedad, lo que dificulta detectar cuándo necesitan atención médica. Estos son los signos más importantes que no debes ignorar.

## Señales urgentes (emergencia inmediata)

- **Dificultad respiratoria**: boca abierta, jadeos, postura anormal.
- **Incapacidad para orinar**: especialmente en machos — puede ser obstrucción urinaria fatal.
- **Sangrado abundante** o herida profunda.
- **Convulsiones o pérdida de consciencia**.
- **Abdomen distendido y doloroso**.

## Señales que requieren visita pronto (24-48 horas)

- Pérdida súbita de apetito por más de 24 horas.
- Vómitos repetidos (más de 3 en un día).
- Diarrea con sangre o mucosidad.
- Cojera o resistencia a moverse.
- Estornudos frecuentes con secreción nasal.

## Cambios de comportamiento a vigilar

- Aislamiento inusual o esconderse más de lo habitual.
- Agresividad repentina o cambio de carácter.
- Pérdida de peso visible en pocas semanas.
- Beber o orinar mucho más de lo normal.

La detección temprana marca la diferencia en el tratamiento y recuperación.`,
    heroImageUrl: loremflickr({ tags: blogHeroTags({ category: "salud", species: ["cat"] }), seed: "senales-enfermedad-gato", width: 800, height: 450 }),
    category: "salud",
    species: ["cat"],
    tags: ["salud", "gatos", "veterinario"],
    authorName: "Dra. Valentina Torres",
    status: "published",
    publishedAt: daysAgo(90),
    createdAt: daysAgo(92),
    updatedAt: daysAgo(90),
  },

  // ── NOVEDADES ─────────────────────────────────────────────────────────────
  {
    id: "blog-post-09",
    slug: "nuevas-lineas-royal-canin-2026",
    title: "Royal Canin lanza nuevas líneas de nutrición para razas pequeñas",
    excerpt:
      "La marca líder en nutrición de precisión presenta formulaciones mejoradas para razas pequeñas y miniaturas.",
    bodyMarkdown: `# Royal Canin 2026: novedades en nutrición de precisión

Royal Canin, referente mundial en nutrición veterinaria, presenta sus nuevas formulaciones para el mercado chileno.

## Mini Adult Optimum

La nueva fórmula incluye:

- **Prebióticos mejorados** para mejor digestión.
- **EPA y DHA** en mayor concentración para una piel y pelaje óptimos.
- **L-carnitina** para mantener el peso ideal en razas pequeñas propensas a la obesidad.

## Health Nutrition para gatos senior

La línea Senior Consult ahora incluye:

- Fósforo controlado para proteger la función renal.
- Antioxidantes para reducir el estrés oxidativo del envejecimiento.
- Proteína de alta digestibilidad para mantener masa muscular.

## Disponibilidad

Estas nuevas formulaciones ya están disponibles en nuestras sucursales y a través de nuestro catálogo online. Consulta disponibilidad en tu sucursal más cercana.`,
    heroImageUrl: loremflickr({ tags: blogHeroTags({ category: "novedades", species: ["dog"] }), seed: "nuevas-lineas-royal-canin-2026", width: 800, height: 450 }),
    category: "novedades",
    species: ["dog"],
    tags: ["novedades", "Royal Canin", "nutrición"],
    authorName: "SimplePet Editorial",
    status: "draft",
    publishedAt: null,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: "blog-post-10",
    slug: "nueva-sucursal-maipu",
    title: "¡Abrimos en Maipú! Nueva sucursal en el sector poniente",
    excerpt:
      "SimplePet expande su presencia en Santiago con una nueva tienda en Maipú, disponible para retiro en tienda y servicios veterinarios.",
    bodyMarkdown: `# Nueva sucursal SimplePet en Maipú

Estamos muy felices de anunciar la apertura de nuestra nueva sucursal en Maipú, trayendo la experiencia SimplePet al sector poniente de Santiago.

## Dónde encontrarnos

Nuestra nueva tienda está ubicada en el corazón de Maipú, con fácil acceso en transporte público y estacionamiento disponible.

## Servicios disponibles

Desde el primer día tendremos disponibles:

- **Tienda completa**: todo el catálogo de alimentos, accesorios y productos de higiene.
- **Peluquería canina y felina**: con hora previa online.
- **Veterinaria de urgencia**: lunes a sábado.
- **Retiro en tienda**: pedidos online listos en 2 horas.

## Inauguración especial

Durante la primera semana de apertura ofreceremos:

- 20% de descuento en toda la línea de alimentos.
- Consulta veterinaria gratuita para la primera mascota.
- Gift bags para las primeras 50 visitas del día.

¡Seguimos creciendo para estar más cerca de vos y tu mascota!`,
    heroImageUrl: loremflickr({ tags: blogHeroTags({ category: "novedades", species: ["dog", "cat"] }), seed: "nueva-sucursal-maipu", width: 800, height: 450 }),
    category: "novedades",
    species: ["dog", "cat"],
    tags: ["novedades", "sucursal", "Maipú"],
    authorName: "SimplePet Editorial",
    status: "draft",
    publishedAt: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

// ---------------------------------------------------------------------------
// Blog post products (related products for published posts)
// Published posts: 01-08 (8 posts), each gets 2-3 related products
// ---------------------------------------------------------------------------
export const seedBlogPostProducts: Array<{ postId: string; productId: string }> = [
  // Post 01 — cuidados perros → dog food + accessories
  { postId: "blog-post-01", productId: "rc-medium-adult" },
  { postId: "blog-post-01", productId: "masterdog-adulto" },
  { postId: "blog-post-01", productId: "shampoo-perros" },

  // Post 02 — cuidados gatos → cat food + accessories
  { postId: "blog-post-02", productId: "rc-indoor-27" },
  { postId: "blog-post-02", productId: "raton-felpa" },
  { postId: "blog-post-02", productId: "rascador-carton" },

  // Post 03 — exotic care → exotic products
  { postId: "blog-post-03", productId: "alimento-conejos" },
  { postId: "blog-post-03", productId: "heno-timothy" },

  // Post 04 — dog nutrition → dog food
  { postId: "blog-post-04", productId: "proplan-adult-complete" },
  { postId: "blog-post-04", productId: "hills-adult" },
  { postId: "blog-post-04", productId: "rc-puppy-mini" },

  // Post 05 — cat nutrition → cat food
  { postId: "blog-post-05", productId: "proplan-adult-cat" },
  { postId: "blog-post-05", productId: "hills-cat-adult" },

  // Post 06 — toxic foods (no direct product recommendation needed, but reference dental care)
  { postId: "blog-post-06", productId: "pedigree-dentastix" },
  { postId: "blog-post-06", productId: "champion-premios" },

  // Post 07 — dog vaccination → general dog wellness
  { postId: "blog-post-07", productId: "collar-ajustable-perro" },
  { postId: "blog-post-07", productId: "correa-retractil" },

  // Post 08 — cat health signs → cat products
  { postId: "blog-post-08", productId: "arenero-cubierto" },
  { postId: "blog-post-08", productId: "rc-indoor-27" },
];
