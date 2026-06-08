import { Link } from 'react-router-dom'

export default function PageNotFound({ title, message, backTo = '/gardens', backLabel = 'К участкам' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-gray-50">
      <span className="text-5xl mb-4" aria-hidden="true">🌱</span>
      <h1 className="text-xl font-semibold text-gray-800 mb-2">{title}</h1>
      <p className="text-gray-500 text-sm max-w-sm mb-6">{message}</p>
      <Link
        to={backTo}
        className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium"
      >
        {backLabel}
      </Link>
    </div>
  )
}
