import { useMemo, useState } from 'react';
import { buildCondensationGraph } from '@/utils/condensationGraph';
import { RecipeGraphVisualization } from './RecipeGraphVisualization';
import type {
  CondensationNode,
  CondensationEdge,
} from '@/utils/condensationGraph';

interface RecipeGraphContainerProps {
  targetProduct?: string; // Optional: focus on specific product
}

export function RecipeGraphContainer({
  targetProduct,
}: RecipeGraphContainerProps) {
  const [selectedNode, setSelectedNode] = useState<CondensationNode | null>(
    null
  );
  const [selectedEdge, setSelectedEdge] = useState<CondensationEdge | null>(
    null
  );

  // Build graph (memoized to prevent rebuilding on every render)
  const graph = useMemo(() => {
    console.log(
      `🔨 Building condensation graph${
        targetProduct ? ` for ${targetProduct}` : ' (full)'
      }`
    );
    return buildCondensationGraph(targetProduct);
  }, [targetProduct]);

  const handleNodeClick = (node: CondensationNode) => {
    console.log('Node clicked:', node);
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleEdgeClick = (edge: CondensationEdge) => {
    console.log('Edge clicked:', edge);
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  return (
    <div className='flex flex-col gap-4'>
      {/* Stats Header */}
      <div className='bg-white p-4 rounded shadow border border-gray-200'>
        <h2 className='text-xl font-bold mb-2'>
          {targetProduct
            ? 'Product Dependency Graph'
            : 'Complete Recipe Network'}
        </h2>
        <div className='flex gap-6 text-sm text-gray-600'>
          <span>
            <strong>{graph.stats.totalNodes}</strong> nodes
          </span>
          <span>
            <strong>{graph.stats.productNodes}</strong> products
          </span>
          <span>
            <strong>{graph.stats.sccNodes}</strong> circular groups
          </span>
          <span>
            <strong>{graph.stats.totalEdges}</strong> connections
          </span>
        </div>
      </div>

      {/* Visualization */}
      <div className='h-[800px] w-full'>
        <RecipeGraphVisualization
          graph={graph}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
        />
      </div>

      {/* Selection Panel */}
      {(selectedNode || selectedEdge) && (
        <div className='bg-white p-4 rounded shadow border border-gray-200'>
          {selectedNode && (
            <div>
              <h3 className='font-bold text-lg mb-2'>
                {selectedNode.type === 'scc'
                  ? 'Circular Dependency Group'
                  : selectedNode.name}
              </h3>

              {selectedNode.type === 'scc' ? (
                <>
                  <p className='text-sm text-gray-600 mb-2'>
                    These products form a circular dependency (they depend on
                    each other):
                  </p>
                  <ul className='list-disc list-inside space-y-1 text-sm'>
                    {selectedNode.productNames?.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                  <p className='text-sm text-gray-500 mt-2'>
                    Total: {selectedNode.recipeCount} recipes across all
                    products
                  </p>
                </>
              ) : (
                <>
                  <p className='text-sm text-gray-600'>
                    {selectedNode.recipeCount === 0
                      ? 'Raw resource (no recipe needed)'
                      : `${selectedNode.recipeCount} recipe${
                          selectedNode.recipeCount !== 1 ? 's' : ''
                        } available`}
                  </p>
                  <button
                    onClick={() => {
                      // TODO: Switch to tree view for deep dive **maybe**
                      console.log(
                        'Show tree view for:',
                        selectedNode.className
                      );
                    }}
                    className='mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600'
                  >
                    {`you have selected: ${selectedNode.className}, now what?`}
                  </button>
                </>
              )}
            </div>
          )}

          {selectedEdge && (
            <div>
              <h3 className='font-bold text-lg mb-2'>Connection</h3>
              <p className='text-sm text-gray-600'>
                {selectedEdge.recipes.length} recipe
                {selectedEdge.recipes.length !== 1 ? 's' : ''} connect these
                products
              </p>
              <ul className='list-disc list-inside space-y-1 text-sm mt-2'>
                {selectedEdge.recipes.map((recipeId) => (
                  <li
                    key={recipeId}
                    className='text-gray-700'
                  >
                    {recipeId}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => {
              setSelectedNode(null);
              setSelectedEdge(null);
            }}
            className='mt-3 text-sm text-gray-500 hover:text-gray-700'
          >
            Close ✕
          </button>
        </div>
      )}
    </div>
  );
}
