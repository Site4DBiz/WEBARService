import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between text-sm">
        <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          WebAR Service
        </h1>
        <p className="text-center text-lg text-gray-600 dark:text-gray-300 mb-12">
          Experience augmented reality directly in your browser
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transform transition hover:scale-105">
            <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">
              🎯 Easy to Use
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              No app installation required. Access AR experiences directly through your web browser.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transform transition hover:scale-105">
            <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">
              🚀 High Performance
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Powered by MindAR for fast and accurate marker tracking with smooth AR experiences.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transform transition hover:scale-105">
            <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">
              🔒 Secure & Private
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Your data is protected with Supabase authentication and secure cloud storage.
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/ar"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transform transition hover:scale-105 shadow-lg"
          >
            Basic AR
          </Link>
          <Link
            href="/ar/enhanced"
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transform transition hover:scale-105 shadow-lg"
          >
            Enhanced AR
          </Link>
          <button className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transform transition hover:scale-105 shadow-lg">
            Learn More
          </button>
        </div>
      </div>
    </main>
  )
}
