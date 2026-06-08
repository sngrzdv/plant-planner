import { Link } from 'react-router-dom'
import { MapPinOff } from 'lucide-react'

export default function PageNotFound({ title, message, backTo = '/dashboard', backLabel = 'На главную' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-gray-50">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <MapPinOff className="w-8 h-8 text-gray-400" aria-hidden="true" />
      </div>
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
