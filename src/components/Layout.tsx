import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className='app-container'>
      <nav className='main-nav'>
        <div className='nav-content'>
          <Link
            to='/'
            className='logo'
          >
            Satisfactory Planner
          </Link>

          <div className='nav-links'>
            <Link to='/'>Calculator</Link>
            <Link to='/factories'>My Factories</Link>
            <Link to='/blueprints'>Blueprints</Link>
            <Link to='/profile'>Profile</Link>
          </div>

          <button className='auth-button'>Login</button>
        </div>
      </nav>

      <main className='main-content'>
        <Outlet />
      </main>
    </div>
  );
}
