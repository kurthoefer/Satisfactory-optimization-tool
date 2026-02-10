/**
 * GraphControls Component
 * UI controls for condensation graph visualization settings
 */

interface GraphControlsProps {
  decomposeMinSize: number | undefined;
  onDecomposeMinSizeChange: (value: number) => void;
  filterBaseResources: boolean;
  onFilterBaseResourcesChange: (value: boolean) => void;
  collapsePackaging: boolean;
  onCollapsePackagingChange: (value: boolean) => void;
}

export function GraphControls({
  decomposeMinSize,
  onDecomposeMinSizeChange,
  filterBaseResources,
  onFilterBaseResourcesChange,
  collapsePackaging,
  onCollapsePackagingChange,
}: GraphControlsProps) {
  return (
    <div className='bg-white p-4 rounded-lg shadow-md border border-gray-300 space-y-4'>
      <h3 className='font-bold text-sm text-gray-900 mb-3'>Graph Settings</h3>

      {/* Decompose Min Size Slider */}
      <div>
        <label className='block text-xs font-medium text-gray-700 mb-2'>
          Decompose SCCs (min size: {decomposeMinSize ?? 'Off'})
        </label>
        <input
          type='range'
          min='2'
          max='15'
          value={decomposeMinSize ?? 15}
          onChange={(e) => onDecomposeMinSizeChange(Number(e.target.value))}
          className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600'
        />
        <div className='flex justify-between text-xs text-gray-500 mt-1'>
          <span>More splits</span>
          <span>Fewer splits</span>
        </div>
      </div>

      {/* Filter Base Resources Toggle */}
      <div className='flex items-center justify-between'>
        <label className='text-xs font-medium text-gray-700'>
          Filter base resources
        </label>
        <button
          onClick={() => onFilterBaseResourcesChange(!filterBaseResources)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            filterBaseResources ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              filterBaseResources ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Collapse Packaging Toggle */}
      <div className='flex items-center justify-between'>
        <label className='text-xs font-medium text-gray-700'>
          Merge packaged/unpackaged
        </label>
        <button
          onClick={() => onCollapsePackagingChange(!collapsePackaging)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            collapsePackaging ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              collapsePackaging ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
