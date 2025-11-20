import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

export default function Layout() {
  return (
    <div className='min-h-screen min-w-screen bg-gray-900 text-white'>
      <Navigation />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
