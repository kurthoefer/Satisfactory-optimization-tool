import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorPage from './pages/ErrorPage';
import Visualization from './pages/Visualization';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Visualization />,
      },
      {
        path: 'Visualize',
        children: [
          {
            index: true,
            element: <Visualization />, // /calculate (empty state)
          },
          {
            path: ':productId',
            element: <Visualization />, // /calculate/ironplate (with results)
          },
        ],
      },
      // Future routes
      // {
      //   path: 'account',
      //   element: <Account />,
      // },
      // {
      //   path: 'factories',
      //   element: <Factories />,
      // },
      // {
      //   path: 'factories/:id',
      //   element: <FactoryDetail />,
      // },
      // {
      //   path: 'blueprints',
      //   element: <Blueprints />,
      // },
      // {
      //   path: 'blueprints/:id',
      //   element: <BlueprintDetail />,
      // },
    ],
  },
]);
