import React from 'react'
import Button from '@/components/ui/Button'

export default function Profile() {
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-md bg-white shadow-soft p-4">
        <h1 className="text-lg font-semibold text-headerBlue">Profile</h1>
        <p className="text-sm text-gray-600">Manage your account information and preferences.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md bg-white shadow-soft p-4">
          <h2 className="text-base font-medium text-gray-800">Account</h2>
          <div className="mt-3 grid gap-3">
            <label className="text-sm text-gray-600">Name</label>
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="Your name" defaultValue="Store Admin" />
            <label className="text-sm text-gray-600">Email</label>
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="you@example.com" defaultValue="admin@demo.com" />
            <div className="pt-2">
              <Button>Save Changes</Button>
            </div>
          </div>
        </div>

        <div className="rounded-md bg-white shadow-soft p-4">
          <h2 className="text-base font-medium text-gray-800">Security</h2>
          <div className="mt-3 grid gap-3">
            <label className="text-sm text-gray-600">Password</label>
            <input type="password" className="rounded-md border px-3 py-2 text-sm" placeholder="New password" />
            <label className="text-sm text-gray-600">Confirm Password</label>
            <input type="password" className="rounded-md border px-3 py-2 text-sm" placeholder="Confirm password" />
            <div className="pt-2">
              <Button variant="outline">Update Password</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-white shadow-soft p-4">
        <h2 className="text-base font-medium text-gray-800">Preferences</h2>
        <div className="mt-3 grid gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" defaultChecked className="h-4 w-4" />
            Enable email notifications
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="h-4 w-4" />
            Dark mode
          </label>
          <div className="pt-2">
            <Button>Save Preferences</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
