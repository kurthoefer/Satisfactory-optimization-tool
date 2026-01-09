import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorPage from './pages/ErrorPage';
import Calculator from './pages/Calculator';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Calculator />,
      },
      {
        path: 'calculate',
        children: [
          {
            index: true,
            element: <Calculator />, // /calculate (empty state)
          },
          {
            path: ':productId',
            element: <Calculator />, // /calculate/ironplate (with results)
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
