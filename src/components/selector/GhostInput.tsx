import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

export interface GhostInputHandle {
  /** Focus the input and place the cursor at the end of the value. */
  focusEnd: () => void;
}

interface Ghost {
  matched: boolean;
  prefix: string;
  suffix: string;
}

interface GhostInputProps {
  query: string;
  ghost: Ghost;
  placeholder: string;
  onQueryChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Search field with a ghost-autocomplete overlay. The overlay sits inset-0
 * over the input with matching px/py + font:inherit so its text metrics line
 * up exactly; pointer-events pass through to the input except on the suffix,
 * which opts back in for click-to-accept.
 */
export const GhostInput = forwardRef<GhostInputHandle, GhostInputProps>(
  function GhostInput(
    { query, ghost, placeholder, onQueryChange, onFocus, onKeyDown },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const clickPendingRef = useRef(false);

    const focusEnd = useCallback(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }, []);

    useImperativeHandle(ref, () => ({ focusEnd }), [focusEnd]);

    const handleSuffixClick = useCallback(
      (e: MouseEvent<HTMLSpanElement>) => {
        const target = e.target as HTMLElement;
        const indexStr = target.dataset.suffixIndex;
        if (indexStr === undefined) return;
        const i = parseInt(indexStr, 10);
        if (Number.isNaN(i)) return;
        clickPendingRef.current = true;
        onQueryChange(query + ghost.suffix.slice(0, i + 1));
      },
      [query, ghost.suffix, onQueryChange],
    );

    // After a suffix click bumps the query (React state), restore focus + put
    // the cursor at the end. Done in a layout effect because the input value
    // reflects state that hasn't updated yet at click time.
    useLayoutEffect(() => {
      if (!clickPendingRef.current) return;
      clickPendingRef.current = false;
      focusEnd();
    }, [query, focusEnd]);

    return (
      <div className='relative w-full mt-2 text-sm'>
        <div
          aria-hidden='true'
          className='absolute inset-0 px-3 py-2 pointer-events-none flex items-center whitespace-pre'
        >
          <span className='invisible'>{query}</span>
          {ghost.matched && (
            <span
              className='text-neutral-500 pointer-events-auto cursor-text'
              onClick={handleSuffixClick}
            >
              {Array.from(ghost.suffix).map((ch, i) => (
                <span
                  key={i}
                  data-suffix-index={i}
                >
                  {ch}
                </span>
              ))}
            </span>
          )}
          {ghost.matched && ghost.prefix && (
            <span className='text-neutral-600'> ({ghost.prefix.trim()})</span>
          )}
        </div>
        <input
          ref={inputRef}
          type='text'
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          // font:inherit so the input matches the wrapper's font and the ghost
          // stays aligned, instead of the browser's default input font.
          style={{ font: 'inherit' }}
          className='block w-full px-3 py-2 rounded border border-neutral-600 bg-neutral-800 text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400'
        />
      </div>
    );
  },
);
