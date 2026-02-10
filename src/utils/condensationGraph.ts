//! Deprecated

// import type {
//   Recipe,
//   Product,
//   CondensationGraph,
//   CondensationNode,
//   CondensationEdge,
// } from '@/types';

// // Core Algorithm Imports
// import { findSCCs } from './core/sccDetection';
// import { decomposeRecursively } from './core/sccDecomposition';

// // Styling Utility Imports
// import {
//   generateFamilyColor,
//   generateSubFamilyColor,
// } from '@/utils/graphStyling';

// /**
//  * Main Orchestrator: buildCondensationGraph
//  * Processes raw data through a pipeline: Filter -> Analyze -> Decompose -> Map
//  */
// export function buildCondensationGraph(
//   allRecipes: { [className: string]: Recipe[] },
//   allProducts: Product[],
//   options: {
//     targetProduct?: string;
//     decomposeMinSize?: number;
//     collapsePackaging?: boolean;
//     filterBaseResources?: boolean;
//   },
// ): CondensationGraph {
//   // 1. PRE-PROCESS: Clean the graph before analysis
//   let graph = options.filterBaseResources
//     ? filterBaseResources(allRecipes, allProducts)
//     : allRecipes;

//   if (options.collapsePackaging) {
//     graph = applyPackagingCollapse(graph, allProducts);
//   }

//   // 2. ANALYZE: Detect SCCs
//   const { sccs } = findSCCs(graph);

//   const finalSCCs: string[][] = [];
//   const familyMeta: { scc: string[]; color: string; familyId: number }[] = [];

//   // 3. DECOMPOSE: Recursively split large components
//   sccs.forEach((scc, index) => {
//     const isCircular = scc.length > 1 || hasSelfLoop(scc[0], graph);

//     if (
//       options.decomposeMinSize &&
//       isCircular &&
//       scc.length >= options.decomposeMinSize
//     ) {
//       const result = decomposeRecursively(scc, graph, options.decomposeMinSize);

//       // Visual grouping logic
//       const baseColor = generateFamilyColor(index);

//       result.subSCCs.forEach((sub, subIdx) => {
//         const subColor = generateSubFamilyColor(
//           baseColor,
//           subIdx,
//           result.subSCCs.length,
//         );
//         finalSCCs.push(sub);
//         familyMeta.push({ scc: sub, color: subColor, familyId: index });
//       });
//     } else {
//       finalSCCs.push(scc);
//     }
//   });

//   // 4. MAP: Convert to UI-ready structure
//   return mapToGraphStructure(
//     finalSCCs,
//     familyMeta,
//     graph,
//     allProducts,
//     options.targetProduct,
//   );
// }

// // --- PRE-PROCESSORS ---

// function filterBaseResources(
//   recipes: { [key: string]: Recipe[] },
//   products: Product[],
// ) {
//   const baseResources = new Set(
//     products.filter((p) => p.category === 'Resources').map((p) => p.className),
//   );
//   const filtered: { [key: string]: Recipe[] } = {};
//   Object.entries(recipes).forEach(([prod, rs]) => {
//     const valid = rs.filter(
//       (r) => !r.ingredients.some((i) => baseResources.has(i.className)),
//     );
//     if (valid.length > 0) filtered[prod] = valid;
//   });
//   return filtered;
// }

// function applyPackagingCollapse(
//   recipes: { [key: string]: Recipe[] },
//   products: Product[],
// ) {
//   const map = new Map<string, string>();
//   products.forEach((p) => {
//     if (p.className.includes('Packaged')) {
//       const baseName = p.name.replace(/^Packaged\s+/i, '');
//       const base = products.find((bp) => bp.name === baseName);
//       if (base) map.set(p.className, base.className);
//     }
//   });

//   const collapsed: { [key: string]: Recipe[] } = {};
//   Object.entries(recipes).forEach(([cls, rs]) => {
//     const canon = map.get(cls) || cls;
//     if (!collapsed[canon]) collapsed[canon] = [];
//     collapsed[canon].push(
//       ...rs.map((r) => ({
//         ...r,
//         ingredients: r.ingredients.map((i) => ({
//           ...i,
//           className: map.get(i.className) || i.className,
//         })),
//         products: r.products.map((p) => ({
//           ...p,
//           className: map.get(p.className) || p.className,
//         })),
//       })),
//     );
//   });
//   return collapsed;
// }

// // --- MAPPING LOGIC ---

// function mapToGraphStructure(
//   sccs: string[][],
//   familyMeta: any[],
//   graph: { [key: string]: Recipe[] },
//   allProducts: Product[],
//   targetProduct?: string,
// ): CondensationGraph {
//   const nodes: CondensationNode[] = [];
//   const edges: CondensationEdge[] = [];
//   const productToNodeId = new Map<string, string>();
//   const edgeSet = new Set<string>();

//   const relevant = targetProduct
//     ? findReachable(targetProduct, graph)
//     : new Set(Object.keys(graph));

//   // Node Generation
//   sccs.forEach((scc, idx) => {
//     const filtered = scc.filter((p) => relevant.has(p));
//     if (filtered.length === 0) return;

//     const circular = filtered.length > 1 || hasSelfLoop(filtered[0], graph);
//     const meta = familyMeta.find((f) => f.scc === scc);
//     const nodeId = circular ? `scc-${idx}` : filtered[0];

//     nodes.push({
//       id: nodeId,
//       type: circular ? 'scc' : 'product',
//       className: circular ? undefined : nodeId,
//       name: circular ? undefined : getProductName(nodeId, allProducts),
//       products: circular ? filtered : undefined,
//       productNames: circular
//         ? filtered.map((p) => getProductName(p, allProducts))
//         : undefined,
//       recipeCount: filtered.reduce(
//         (sum, p) => sum + (graph[p]?.length || 0),
//         0,
//       ),
//       isCircular: circular,
//       familyColor: meta?.color,
//       familyId: meta?.familyId,
//     });

//     filtered.forEach((p) => productToNodeId.set(p, nodeId));
//   });

//   // Edge Generation
//   relevant.forEach((pCls) => {
//     const source = productToNodeId.get(pCls);
//     if (!source) return;

//     (graph[pCls] || []).forEach((recipe) => {
//       recipe.ingredients.forEach((ing) => {
//         const target = productToNodeId.get(ing.className);
//         if (!target || source === target) return;

//         const key = `${source}->${target}`;
//         if (!edgeSet.has(key)) {
//           edges.push({ source, target, recipes: [recipe.id], isMulti: false });
//           edgeSet.add(key);
//         }
//       });
//     });
//   });

//   return {
//     nodes,
//     edges,
//     stats: {
//       totalNodes: nodes.length,
//       productNodes: nodes.filter((n) => n.type === 'product').length,
//       sccNodes: nodes.filter((n) => n.type === 'scc').length,
//       totalEdges: edges.length,
//     },
//     layout: { type: 'dag', condensed: true },
//   };
// }

// // --- UTILS ---

// function hasSelfLoop(p: string, g: { [key: string]: Recipe[] }) {
//   return (g[p] || []).some((r) => r.ingredients.some((i) => i.className === p));
// }

// function getProductName(cls: string, ps: Product[]) {
//   return ps.find((p) => p.className === cls)?.name || cls;
// }

// function findReachable(target: string, graph: { [key: string]: Recipe[] }) {
//   const reachable = new Set<string>();
//   const stack = [target];
//   while (stack.length) {
//     const curr = stack.pop()!;
//     if (reachable.has(curr)) continue;
//     reachable.add(curr);
//     (graph[curr] || []).forEach((r) =>
//       r.ingredients.forEach((i) => stack.push(i.className)),
//     );
//   }
//   return reachable;
// }
