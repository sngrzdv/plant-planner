import { Link } from 'react-router-dom'

export default function StatCard({ title, value, icon: Icon, color, link }) {
  return (
    <Link to={link} className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-0.5">{value}</p>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
        </div>
      </div>
    </Link>
  )
}