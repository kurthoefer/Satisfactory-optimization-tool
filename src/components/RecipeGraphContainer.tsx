// /**
//  * RecipeGraphContainer Component
//  * Manages graph building with user-configurable settings
//  */

//! Deprecated

// import { useMemo, useState } from 'react';
// import recipesOrganizedData from '@/data/recipes-organized.json';
// import productsData from '@/data/products-flat.json';
// import { buildCondensationGraph } from '@/utils/condensationGraph';
// import { RecipeGraphVisualization } from './RecipeGraphVisualization';
// import { SugiyamaGraphVisualization } from './Sugiyamagraphvisualization';
// import { GraphControls } from './GraphControls';
// import type { RecipesOrganized, Product } from '@/types';

// // TODO :: Is this a weird place for this to happen? -- yes orchestration should be in "Pages/"
// const recipesOrganized = recipesOrganizedData as RecipesOrganized;
// const products = productsData as Product[];

// interface RecipeGraphContainerProps {
//   targetProduct?: string;
// }

// export function RecipeGraphContainer({
//   targetProduct,
// }: RecipeGraphContainerProps) {
//   // State for graph settings
//   const [decomposeMinSize, setDecomposeMinSize] = useState<number | undefined>(
//     3,
//   );
//   const [filterBaseResources, setFilterBaseResources] = useState(true);
//   const [layoutType, setLayoutType] = useState<'force' | 'sugiyama'>('force');
//   const [collapsePackaging, setCollapsePackaging] = useState(false);

//   // Build graph with lean logic
//   const graph = useMemo(() => {
//     return buildCondensationGraph(recipesOrganized.byProduct, products, {
//       targetProduct,
//       decomposeMinSize,
//       filterBaseResources,
//       collapsePackaging,
//     });
//   }, [targetProduct, decomposeMinSize, filterBaseResources, collapsePackaging]);

//   return (
//     <div className='flex gap-4 h-[600px]'>
//       <div className='flex-shrink-0 w-64 space-y-4'>
//         {/* Layout Type Selection */}
//         <div className='bg-white p-4 rounded-lg shadow-md border border-gray-300'>
//           <h3 className='font-bold text-sm text-gray-900 mb-3'>Layout Type</h3>
//           <div className='space-y-2'>
//             <label className='flex items-center gap-2'>
//               <input
//                 type='radio'
//                 value='force'
//                 checked={layoutType === 'force'}
//                 onChange={(e) => setLayoutType(e.target.value as any)}
//                 className='accent-blue-600'
//               />
//               <span className='text-sm'>Force Directed</span>
//             </label>
//             <label className='flex items-center gap-2'>
//               <input
//                 type='radio'
//                 value='sugiyama'
//                 checked={layoutType === 'sugiyama'}
//                 onChange={(e) => setLayoutType(e.target.value as any)}
//                 className='accent-blue-600'
//               />
//               <span className='text-sm'>Sugiyama (Hierarchical)</span>
//             </label>
//           </div>
//         </div>

//         <GraphControls
//           decomposeMinSize={decomposeMinSize}
//           onDecomposeMinSizeChange={setDecomposeMinSize}
//           filterBaseResources={filterBaseResources}
//           onFilterBaseResourcesChange={setFilterBaseResources}
//           collapsePackaging={collapsePackaging}
//           onCollapsePackagingChange={setCollapsePackaging}
//         />
//       </div>

//       <div className='flex-1 min-w-0'>
//         {layoutType === 'force' ? (
//           <RecipeGraphVisualization graph={graph} />
//         ) : (
//           <SugiyamaGraphVisualization graph={graph} />
//         )}
//       </div>
//     </div>
//   );
// }

// // --- UTILITIES (In a separate /utils file) ---

// function applyFilters(data, filters) { ... }
// function contractSCCs(data) { ... } // Collapses nodes into a DAG
// function calculateLayout(dag) { ... } // D3 math lives here

// // --- REACT COMPONENT ---

// function VisualizationPage() {
//   const [rawData, setRawData] = useState([]);
//   const [filters, setFilters] = useState([]);

//   // STEP 1: Filter the data
//   const filteredData = useMemo(() => {
//     return applyFilters(rawData, filters);
//   }, [rawData, filters]);

//   // STEP 2: Process the DAG (SCC Collapse)
//   // DRY: This only reruns if the filtered output changes
//   const dagData = useMemo(() => {
//     return contractSCCs(filteredData);
//   }, [filteredData]);

//   // STEP 3: Final D3 Layout
//   const chartData = useMemo(() => {
//     return calculateLayout(dagData);
//   }, [dagData]);

//   return (
//     <div>
//       <Toolbox onFilterChange={setFilters} />
//       <D3Canvas data={chartData} />
//     </div>
//   );
// }
