import Link from "next/link";
import { Navigation } from "@/components/Navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-harbor-900 dark:to-harbor-800">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            ClearHarbor Noise
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Privacy-Preserving Community Noise Monitoring Powered by FHEVM
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/report"
              className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition"
            >
              Start Reporting
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-white dark:bg-harbor-700 text-primary-600 dark:text-primary-400 font-semibold rounded-lg border-2 border-primary-600 hover:bg-primary-50 dark:hover:bg-harbor-600 transition"
            >
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white dark:bg-harbor-800 rounded-xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Private Reporting
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Submit noise data encrypted end-to-end. Your individual records remain private.
            </p>
          </div>

          <div className="bg-white dark:bg-harbor-800 rounded-xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Aggregated Insights
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              View neighborhood-level statistics without exposing individual records.
            </p>
          </div>

          <div className="bg-white dark:bg-harbor-800 rounded-xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authorized Access
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Urban management can decrypt aggregated data only with proper authorization.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white dark:bg-harbor-800 rounded-xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            How It Works
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Encrypt Data</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Residents encrypt noise measurements</p>
            </div>
            <div className="hidden md:block text-gray-400">→</div>
            <div className="flex-1 text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">On-Chain Processing</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">FHEVM aggregates encrypted data</p>
            </div>
            <div className="hidden md:block text-gray-400">→</div>
            <div className="flex-1 text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Public Insights</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Block-level statistics revealed</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-harbor-700 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 dark:text-gray-400">
          <p>Powered by Zama FHEVM • Built with ❤️ for Privacy</p>
        </div>
      </footer>
    </div>
  );
}

