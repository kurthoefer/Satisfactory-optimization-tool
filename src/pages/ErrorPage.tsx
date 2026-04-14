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
    <div className='min-h-screen bg-gray-900 flex items-center justify-center px-4'>
      <div className='max-w-md w-full text-center'>
        {/* Error icon */}
        <div className='mb-6'>
          <div className='w-20 h-20 mx-auto bg-neutral-800 rounded-full flex items-center justify-center border border-neutral-700'>
            <svg
              className='w-10 h-10 text-neutral-400'
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

        {/* Error message */}
        <h1 className='text-3xl font-bold text-white mb-2'>
          {errorStatus ? `Error ${errorStatus}` : 'Oops!'}
        </h1>

        <p className='text-neutral-400 mb-8'>{errorMessage}</p>

        {/* Actions */}
        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
          <Link
            to='/'
            className='px-6 py-3 bg-neutral-800 text-neutral-200 rounded-lg border border-neutral-700 hover:border-neutral-500 hover:text-white transition-colors'
          >
            Go Home
          </Link>

          <button
            onClick={() => window.location.reload()}
            className='px-6 py-3 bg-neutral-800 text-neutral-400 rounded-lg border border-neutral-700 hover:border-neutral-500 hover:text-neutral-200 transition-colors'
          >
            Reload Page
          </button>
        </div>

        {/* Stack trace — dev only */}
        {import.meta.env.DEV && error instanceof Error && (
          <details className='mt-8 text-left'>
            <summary className='cursor-pointer text-xs text-neutral-500 hover:text-neutral-300'>
              Error Details (Development Only)
            </summary>
            <pre className='mt-4 p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-400 overflow-auto'>
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
