/*
Displayed when calculator has no product selected
Shows welcome message and quick access options
*/

import { useNavigate } from 'react-router-dom';

export default function EmptyState() {
  const navigate = useNavigate();

  return (
    <div className='max-w-6xl mx-auto px-4 py-16'>
      {/* Welcome Message */}
      <div className='text-center mb-12'>
        <div className='w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center'>
          <svg
            className='w-10 h-10 text-blue-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            />
          </svg>
        </div>

        <h2 className='text-2xl font-bold text-gray-900 mb-2'>
          Ready to Calculate Production
        </h2>
        <p className='text-gray-600 max-w-md mx-auto'>
          Search for any product above to calculate optimal production chains,
          resource requirements, and machine counts
        </p>
      </div>

      {/* Quick Access Buttons */}
      <section>
        <h3 className='text-lg font-semibold text-gray-600 mb-4 text-center'>
          Popular Items
        </h3>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto'>
          <QuickAccessButton
            onClick={() => navigate('/calculate/computer')}
            title='Computer'
            description='Complex electronics'
          />
          <QuickAccessButton
            onClick={() => navigate('/calculate/modularframe')}
            title='Modular Frame'
            description='Structural component'
          />
          <QuickAccessButton
            onClick={() => navigate('/calculate/ironplate')}
            title='Iron Plate'
            description='Basic building block'
          />
          <QuickAccessButton
            onClick={() => navigate('/calculate/cement')}
            title='Concrete'
            description='Foundation material'
          />
        </div>
      </section>

      {/* Optional: How to use */}
      <section className='mt-16 max-w-2xl mx-auto'>
        <div className='bg-gray-50 rounded-lg p-6 border border-gray-200'>
          <h3 className='font-semibold text-gray-900 mb-3'>How to Use</h3>
          <ol className='space-y-2 text-sm text-gray-600'>
            <li className='flex gap-3'>
              <span className='font-semibold text-blue-600'>1.</span>
              <span>Search for a product you want to produce</span>
            </li>
            <li className='flex gap-3'>
              <span className='font-semibold text-blue-600'>2.</span>
              <span>View all available recipes (standard and alternates)</span>
            </li>
            <li className='flex gap-3'>
              <span className='font-semibold text-blue-600'>3.</span>
              <span>Set your target production rate</span>
            </li>
            <li className='flex gap-3'>
              <span className='font-semibold text-blue-600'>4.</span>
              <span>See the complete production chain and requirements</span>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}

// Quick Access Button Component
interface QuickAccessButtonProps {
  onClick: () => void;
  title: string;
  description: string;
}

function QuickAccessButton({
  onClick,
  title,
  description,
}: QuickAccessButtonProps) {
  return (
    <button
      onClick={onClick}
      className='p-6 bg-white rounded-lg shadow hover:shadow-md transition-all text-left border-2 border-transparent hover:border-blue-200 group'
    >
      <div className='font-semibold text-gray-700 mb-1 group-hover:text-blue-600 transition-colors'>
        {title}
      </div>
      <div className='text-sm text-gray-600'>{description}</div>
    </button>
  );
}
