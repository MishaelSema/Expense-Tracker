import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-emerald-600 dark:text-emerald-400">404</h1>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
            Page Not Found
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Oops! The page you're looking for doesn't exist.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              What you can do:
            </h3>
            <ul className="text-left space-y-2 text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Go back to the <Link to="/dashboard" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium">Dashboard</Link></span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>View your <Link to="/transactions" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium">Transactions</Link></span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Return to <Link to="/login" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium">Login</Link></span>
              </li>
            </ul>
          </div>

          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
