import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
// import Calculator from './pages/Calculator';
// import Factories from './pages/Factories';
// import FactoryDetail from './pages/FactoryDetail';
// import Blueprints from './pages/Blueprints';
// import BlueprintDetail from './pages/BlueprintDetail';
// import Profile from './pages/Profile';
// import ErrorPage from './pages/ErrorPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
    ],
  },
]);

// export const router = createBrowserRouter([
//   {
//     path: '/',
//     element: <Layout />,
//     errorElement: <ErrorPage />,
//     children: [
//       {
//         index: true,
//         element: <Home />,
//       },
//       {
//         path: 'calculator',
//         element: <Calculator />,
//       },
//       {
//         path: 'factories',
//         element: <Factories />,
//         // Future: Add loader to fetch user's factories
//         // loader: async () => {
//         //   const factories = await fetchFactories();
//         //   return { factories };
//         // },
//       },
//       {
//         path: 'factories/:id',
//         element: <FactoryDetail />,
//         // Future: Load specific factory data
//         // loader: async ({ params }) => {
//         //   const factory = await fetchFactory(params.id);
//         //   return { factory };
//         // },
//       },
//       {
//         path: 'blueprints',
//         element: <Blueprints />,
//         // Future: Load community blueprints
//         // loader: async () => {
//         //   const blueprints = await fetchBlueprints();
//         //   return { blueprints };
//         // },
//       },
//       {
//         path: 'blueprints/:id',
//         element: <BlueprintDetail />,
//         // Future: Load specific blueprint
//         // loader: async ({ params }) => {
//         //   const blueprint = await fetchBlueprint(params.id);
//         //   return { blueprint };
//         // },
//       },
//       {
//         path: 'profile',
//         element: <Profile />,
//         // Future: Load user profile data
//         // loader: async () => {
//         //   const user = await fetchUserProfile();
//         //   return { user };
//         // },
//       },
//     ],
//   },
// ]);
