import { DESIGN_TOKENS } from '@/styles/designTokens';
import { cn } from '@/utils/cn';
import { Link } from 'react-router-dom';

export default function Navigation() {
  return (
    // Narrowed from p-4 to py-2 for a "sharp" slim profile
    <nav className='py-2 px-6 bg-gray-950 border-b border-orange-600/50 flex items-center justify-between shrink-0'>
      {/* Brand Section */}
      <Link
        to='/'
        className='text-sm font-black tracking-tighter text-orange-500 uppercase flex items-center gap-2'
      >
        <span className='w-2 h-2 bg-orange-500 rounded-full animate-pulse' />
        Satisfactory Planner
      </Link>

      {/* Nav Links - Deemphasized with text-slate-400 */}
      <div className='flex items-center gap-10'>
        <Link
          to='/'
          className='text-xs font-medium text-white hover:text-orange-400 transition-colors flex items-center'
        >
          Calculator
          <span
            className={cn(
              DESIGN_TOKENS.text.tinyEmbellished,
              DESIGN_TOKENS.animation.quirky,
              'text-cyan-400 ml-2', // Changed to Cyan and forced margin-left
            )}
          >
            Alpha!
          </span>
        </Link>

        {['My Factories', 'Blueprints', 'Profile'].map((item) => (
          <Link
            key={item}
            to={`/${item.toLowerCase().replace(' ', '-')}`}
            className='text-xs font-medium text-slate-400 hover:text-white transition-colors'
          >
            {item}
          </Link>
        ))}
      </div>

      {/* Action Area */}
      <div className='flex items-center gap-4'>
        <button className='text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors'>
          Support
        </button>
        <button className='px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider rounded-sm transition-all active:scale-95'>
          Login
        </button>
      </div>
    </nav>
  );
}
