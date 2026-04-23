"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { Product } from "@/types";

type Props = {
  product: Product;
};

export function ProductInfoTabs({ product }: Props) {
  const hasIngredients = Boolean(product.ingredients);
  const hasNutrition =
    product.nutritionalAnalysis &&
    Object.keys(product.nutritionalAnalysis).length > 0;

  return (
    <Tabs defaultValue="description" className="w-full">
      <TabsList>
        <TabsTrigger value="description">Descripción</TabsTrigger>
        {hasIngredients && (
          <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
        )}
        {hasNutrition && <TabsTrigger value="nutrition">Nutrición</TabsTrigger>}
      </TabsList>
      <TabsContent value="description" className="mt-4">
        <p className="leading-relaxed text-muted-foreground">
          {product.description}
        </p>
      </TabsContent>
      {hasIngredients && (
        <TabsContent value="ingredients" className="mt-4">
          <p className="leading-relaxed text-muted-foreground">
            {product.ingredients}
          </p>
        </TabsContent>
      )}
      {hasNutrition && (
        <TabsContent value="nutrition" className="mt-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {Object.entries(product.nutritionalAnalysis ?? {}).map(
              ([key, value]) => (
                <div key={key} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="font-medium tabular-nums">{value}</dd>
                </div>
              ),
            )}
          </dl>
        </TabsContent>
      )}
    </Tabs>
  );
}
