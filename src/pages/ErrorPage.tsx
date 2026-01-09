import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError();

  let errorMessage: string;
  let errorStatus: number | undefined;

  if (isRouteErrorResponse(error)) {
    errorMessage =
      error.statusText || error.data?.message || 'An error occurred';
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = 'Unknown error occurred';
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
      <div className='max-w-md w-full text-center'>
        {/* Error Icon */}
        <div className='mb-6'>
          <div className='w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center'>
            <svg
              className='w-10 h-10 text-red-500'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>
          {errorStatus ? `Error ${errorStatus}` : 'Oops!'}
        </h1>

        <p className='text-lg text-gray-600 mb-8'>{errorMessage}</p>

        {/* Actions */}
        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
          <Link
            to='/'
            className='px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
          >
            Go Home
          </Link>

          <button
            onClick={() => window.location.reload()}
            className='px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors'
          >
            Reload Page
          </button>
        </div>

        {/* Additional Info in Development */}
        {import.meta.env.DEV && error instanceof Error && (
          <details className='mt-8 text-left'>
            <summary className='cursor-pointer text-sm text-gray-500 hover:text-gray-700'>
              Error Details (Development Only)
            </summary>
            <pre className='mt-4 p-4 bg-gray-100 rounded-lg text-xs overflow-auto'>
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
