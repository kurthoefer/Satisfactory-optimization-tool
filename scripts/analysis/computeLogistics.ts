import type {
  Recipe,
  TopologicalEdge,
  CircularRelationships,
  TopologicalManifest,
  Product,
} from '../../src/types';

// Constants
const MAX_BELT_RATE = 1200;
const MAX_PIPE_RATE = 600;

// Helper Logic
function getLogisticsMetrics(amount: number, time: number, form: string) {
  const isFluid = form === 'RF_LIQUID' || form === 'RF_GAS';
  const quantity = isFluid ? amount / 1000 : amount;

  const throughput = (quantity / time) * 60;

  const maxCapacity = isFluid ? MAX_PIPE_RATE : MAX_BELT_RATE;
  const saturation = throughput / maxCapacity;

  // Weight = Inverse Saturation (Higher saturation = Lower weight/friction)
  const weight = 1 / (saturation + 0.01);

  return { throughput, weight };
}

// Main Export
export function generateTopology(
  recipes: Recipe[],
  circularRelationships: CircularRelationships,
  allProducts: Product[],
): TopologicalManifest {
  const productForms = new Map<string, string>();
  allProducts.forEach((p) => productForms.set(p.className, p.form));

  const edges: TopologicalEdge[] = [];

  recipes.forEach((recipe) => {
    // Inbound
    recipe.ingredients.forEach((ing) => {
      const form = productForms.get(ing.className) || 'RF_SOLID';
      const { throughput, weight } = getLogisticsMetrics(
        ing.amount,
        recipe.time,
        form,
      );

      edges.push({
        sourceId: ing.className,
        targetId: recipe.className,
        throughput,
        weight,
        persistence: 0,
      });
    });

    // Outbound
    recipe.products.forEach((prod) => {
      const form = productForms.get(prod.className) || 'RF_SOLID';
      const { throughput, weight } = getLogisticsMetrics(
        prod.amount,
        recipe.time,
        form,
      );

      edges.push({
        sourceId: recipe.className,
        targetId: prod.className,
        throughput,
        weight,
        persistence: 0,
      });
    });
  });

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      edgeCount: edges.length,
      sccCount: circularRelationships.stronglyConnectedComponents.length,
    },
    edges,
    sccs: circularRelationships.stronglyConnectedComponents,
    circularItems: circularRelationships.circularItems,
  };
}
