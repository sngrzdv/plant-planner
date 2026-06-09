import { Link, useLocation } from 'react-router-dom'
import { MAIN_NAV_LINKS, isNavLinkActive } from '../lib/navLinks'

export default function MobileNav() {
  const { pathname } = useLocation()

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {MAIN_NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex flex-1 flex-col items-center justify-center py-2 px-0.5 min-w-0 ${
              isNavLinkActive(pathname, link.to) ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <link.icon className="w-5 h-5 shrink-0" />
            <span className="text-[9px] mt-0.5 truncate w-full text-center leading-tight">{link.shortLabel || link.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
