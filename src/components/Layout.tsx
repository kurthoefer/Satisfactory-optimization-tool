import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

export default function Layout() {
  return (
    <div className='h-dvh flex flex-col bg-gray-900 text-white'>
      <Navigation />
      <main className='flex-1 min-h-0'>
        <Outlet />
      </main>
    </div>
  );
}
