import React from 'react'
import Button from '@/components/ui/Button'

export default function EditProfile() {
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-md bg-white shadow-soft p-4">
        <h1 className="text-lg font-semibold text-headerBlue">Edit Profile</h1>
        <p className="text-sm text-gray-600">Update your personal information.</p>
      </div>

      <div className="rounded-md bg-white shadow-soft p-4 max-w-xl">
        <div className="grid gap-3">
          <label className="text-sm text-gray-600">Full Name</label>
          <input className="rounded-md border px-3 py-2 text-sm" defaultValue="Store Admin" />
          <label className="text-sm text-gray-600">Email</label>
          <input className="rounded-md border px-3 py-2 text-sm" defaultValue="admin@demo.com" />
          <label className="text-sm text-gray-600">Phone</label>
          <input className="rounded-md border px-3 py-2 text-sm" defaultValue="+91 90000 00000" />
          <div className="pt-2">
            <Button>Save</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
