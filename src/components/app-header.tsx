'use client'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { ThemeSelect } from '@/components/theme-select'
import { WalletDropdown } from '@/components/wallet-dropdown'

const ClusterDropdown = dynamic(() => import('@/components/cluster-dropdown').then((m) => m.ClusterDropdown), {
  ssr: false,
})

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  return (
    <header className="relative z-50 px-4 py-2 bg-white border-b border-gray-200 dark:bg-black dark:border-[#5A9CB5]/30">
      <div className="mx-auto flex justify-between items-center">
        <div className="flex items-baseline gap-4">
          <Link className="text-xl font-bold text-gray-900 hover:text-[#5A9CB5] dark:text-white dark:hover:text-[#FACE68]" href="/">
            <span>Muzica</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center absolute left-1/2 transform -translate-x-1/2">
          <ul className="flex gap-4 flex-nowrap items-center">
            {links.map(({ label, path }) => (
              <li key={path}>
                <Link
                  className={`text-gray-700 hover:text-[#5A9CB5] dark:text-gray-200 dark:hover:text-[#FACE68] ${isActive(path) ? 'text-[#5A9CB5] dark:text-[#FACE68] font-semibold' : ''}`}
                  href={path}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        <div className="hidden md:flex items-center gap-4">
          <div className="px-3 py-1 bg-[#5A9CB5] text-white rounded-md text-sm font-medium">
            Localnet
          </div>
          <WalletDropdown />
          <ThemeSelect />
        </div>

        {showMenu && (
          <div className="md:hidden fixed inset-x-0 top-[52px] bottom-0 bg-white/95 dark:bg-black/95 backdrop-blur-sm">
            <div className="flex flex-col p-4 gap-4 border-t border-gray-200 dark:border-[#5A9CB5]/30">
              <div className="flex justify-end items-center gap-4">
                <div className="px-3 py-1 bg-[#5A9CB5] text-white rounded-md text-sm font-medium">
                  Localnet
                </div>
                <WalletDropdown />
                <ThemeSelect />
              </div>
              <ul className="flex flex-col gap-4">
                {links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      className={`block text-lg py-2 ${isActive(path) ? 'text-[#5A9CB5] dark:text-[#FACE68] font-semibold' : 'text-gray-700 dark:text-gray-200'} hover:text-[#5A9CB5] dark:hover:text-[#FACE68]`}
                      href={path}
                      onClick={() => setShowMenu(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
