// src/components/Navigation.tsx
import { Link } from 'react-router-dom';

export default function Navigation() {
  return (
    <nav className='p-4 bg-gray-950 border-b border-orange-500'>
      <div className='flex justify-between'>
        <Link
          to='/'
          className='text-xl text-orange-500'
        >
          Satisfactory Planner
        </Link>

        <div className='flex gap-8'>
          <Link
            to='/'
            className='text-white'
          >
            Calculator
          </Link>
          <Link
            to='/factories'
            className='text-white'
          >
            My Factories
          </Link>
          <Link
            to='/blueprints'
            className='text-white'
          >
            Blueprints
          </Link>
          <Link
            to='/profile'
            className='text-white'
          >
            Profile
          </Link>
        </div>

        <button className='px-6 py-2 bg-orange-500 text-white rounded'>
          Login
        </button>
      </div>
    </nav>
  );
}
