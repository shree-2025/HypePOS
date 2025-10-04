import { PropsWithChildren } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Shell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="flex w-full h-screen">
        <Sidebar />
        {/* Right column with header and content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
