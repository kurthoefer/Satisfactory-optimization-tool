import { cn } from '@/utils/cn';

// Generic on/off switch — domain-blind (no filter knowledge). Living in filters/
// for now since it has no second consumer yet; promote to ui/ when something
// else wants it or once the control aesthetic settles.

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className='flex w-full items-center justify-between text-xs text-neutral-300 transition-colors hover:text-white'
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative h-4 w-8 shrink-0 rounded-full transition-colors',
          checked ? 'bg-neutral-400' : 'bg-neutral-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 bottom-0.5 aspect-square rounded-full bg-white transition-all',
            checked ? 'right-0.5 left-auto' : 'left-0.5 right-auto',
          )}
        />
      </span>
    </button>
  );
}
