import Link from 'next/link'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
            <div className="bg-blue-50 p-6 rounded-full mb-6">
                <FileQuestion size={64} className="text-blue-600" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">404</h2>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Page Not Found</h3>
            <p className="text-gray-600 mb-8 max-w-md">
                The page you are looking for does not exist or has been moved.
            </p>
            <Link
                href="/"
                className="flex items-center gap-2 px-8 py-3 bg-[#CC0000] text-white rounded-xl hover:bg-[#990000] transition-colors font-medium shadow-md"
            >
                <Home size={20} />
                Back to Dashboard
            </Link>
        </div>
    )
}
