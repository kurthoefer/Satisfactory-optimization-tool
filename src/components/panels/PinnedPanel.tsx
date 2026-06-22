import { usePinned } from '@/lib/pinned';
import { Surface } from '@/components/ui/Surface';

// Temporary functional draft — proves the pinnedStore wiring and lets the app
// compile. The real version (entity names/images via the catalog, grey-out by
// current-graph inclusion, and the session timeline strip across the top) comes
// next; for now this just lists raw pinned ids with working remove + clear.

export function PinnedPanel() {
  const { ids, count, remove, clear } = usePinned();

  return (
    <Surface
      id='pinned'
      title='Pinned'
      anchor='top-right'
      className='w-72'
    >
      <div className='flex flex-col gap-3 p-3'>
        <div className='flex items-center justify-between'>
          <span className='text-sm text-neutral-400'>
            {count === 0 ? 'Nothing pinned' : `${count} pinned`}
          </span>
          {count > 0 && (
            <button
              type='button'
              onClick={clear}
              className='text-xs text-neutral-500 hover:text-neutral-300'
            >
              Clear all
            </button>
          )}
        </div>

        {count === 0 ? (
          <p className='text-xs text-neutral-500'>
            Pin entities from the graph to track them here.
          </p>
        ) : (
          <ul className='flex flex-col gap-1'>
            {ids.map((id) => (
              <li
                key={id}
                className='flex items-center gap-2 rounded px-1 py-1 hover:bg-neutral-800/50'
              >
                <span className='flex-1 truncate font-mono text-xs text-neutral-300'>
                  {id}
                </span>
                <button
                  type='button'
                  onClick={() => remove(id)}
                  aria-label={`Unpin ${id}`}
                  className='shrink-0 text-neutral-500 hover:text-neutral-200'
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Surface>
  );
}
