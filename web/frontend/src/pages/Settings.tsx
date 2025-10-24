import React from 'react'
import Shell from '@/components/layout/Shell'

export default function Settings() {
  return (
    <Shell>
      <div className="p-4 space-y-4">
        <div className="rounded-md bg-white shadow-soft p-4">
          <h1 className="text-lg font-semibold text-headerBlue">Settings</h1>
          <p className="text-sm text-gray-600">Configure application preferences.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md bg-white shadow-soft p-4">
          <h2 className="text-base font-medium text-gray-800">General</h2>
          <div className="mt-3 grid gap-3">
            <label className="text-sm text-gray-600">Default Outlet</label>
            <select className="rounded-md border px-3 py-2 text-sm">
              <option>HQ</option>
              <option>S01</option>
              <option>S02</option>
            </select>
            <label className="text-sm text-gray-600">Currency</label>
            <select className="rounded-md border px-3 py-2 text-sm">
              <option>INR (₹)</option>
              <option>USD ($)</option>
            </select>
          </div>
        </div>

        <div className="rounded-md bg-white shadow-soft p-4">
          <h2 className="text-base font-medium text-gray-800">Notifications</h2>
          <div className="mt-3 grid gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" defaultChecked className="h-4 w-4" />
              Email notifications
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4" />
              Push notifications
            </label>
          </div>
        </div>
        </div>

        <div className="rounded-md bg-white shadow-soft p-4">
          <h2 className="text-base font-medium text-gray-800">Advanced</h2>
          <div className="mt-3 grid gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4" />
              Enable beta features
            </label>
          </div>
        </div>
      </div>
    </Shell>
  )
}
