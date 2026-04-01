/**
 * buildTopology.ts
 *
 * Transforms recipes and products into TopologicalEdge[].
 * Each recipe produces edges for its ingredients (inbound)
 * and its products (outbound), with throughput and weight metrics.
 *
 * Build-time only — the resulting edges are written to topology.json
 * and consumed at runtime as static data.
 *
 * Throughput: (amount / recipe.time) * 60 → items per minute at single-machine rate
 * Weight: inverse saturation of belt/pipe capacity → used for force layout spring length
 */

import type { Recipe, Product, TopologicalEdge } from '../../src/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_BELT_RATE = 1200;
const MAX_PIPE_RATE = 600;

// ============================================================================
// LOGISTICS METRICS
// ============================================================================

function getLogisticsMetrics(amount: number, time: number, form: string) {
  const isFluid = form === 'RF_LIQUID' || form === 'RF_GAS';
  // Fluid volume conversion: amounts in _docs are in mL-like units
  const quantity = isFluid ? amount / 1000 : amount;

  const throughput = (quantity / time) * 60;

  const maxCapacity = isFluid ? MAX_PIPE_RATE : MAX_BELT_RATE;
  const saturation = throughput / maxCapacity;

  // Weight = inverse saturation (higher saturation = lower weight)
  const weight = 1 / (saturation + 0.01);

  return { throughput, weight };
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Build TopologicalEdge[] from production recipes and products.
 *
 * For each recipe:
 *   - Each ingredient produces an inbound edge (product → recipe)
 *   - Each product produces an outbound edge (recipe → product)
 *
 * Product forms are looked up to determine belt vs pipe capacity
 * for the weight calculation.
 */
export function buildTopology(
  recipes: Recipe[],
  products: Product[],
): TopologicalEdge[] {
  // Build form lookup for belt/pipe distinction
  const productForms = new Map<string, string>();
  products.forEach((p) => productForms.set(p.className, p.form));

  const edges: TopologicalEdge[] = [];

  recipes.forEach((recipe) => {
    // Inbound edges: ingredients flow into the recipe
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
        persistence: 0, // Populated by computePersistence
      });
    });

    // Outbound edges: recipe produces products
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
        persistence: 0, // Populated by computePersistence
      });
    });
  });

  return edges;
}
