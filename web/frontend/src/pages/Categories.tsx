import { useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'

export default function Categories() {
  type Category = { id: string; name: string; colour: string }
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [colour, setColour] = useState('')
  const [errors, setErrors] = useState<{ [k: string]: string }>({})

  const validate = () => {
    const e: { [k: string]: string } = {}
    if (!name.trim()) e.name = 'Category name is required'
    if (!colour.trim()) e.colour = 'Colour is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const columns: Column<Category>[] = [
    { header: 'Category', key: 'name' },
    { header: 'Colour', key: 'colour', render: (row) => (
      <div className="flex items-center gap-2">
        <span className="inline-block h-4 w-4 rounded-full border" style={{ backgroundColor: row.colour }} />
        <span>{row.colour}</span>
      </div>
    ) },
  ]

  return (
    <Shell>
      <PageHeader
        title="Categories"
        subtitle="Manage all product categories."
        actions={<Button variant="primary" onClick={() => setOpen(true)}>Add Category</Button>}
      />
      <Card>
        <SimpleTable columns={columns} data={categories} keyField="id" />
      </Card>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">Add Category</h2>
            <p className="mt-1 text-sm text-gray-500">Enter category name and colour.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!validate()) return
                const id = `cat-${Date.now()}`
                setCategories(prev => [...prev, { id, name, colour }])
                setOpen(false)
                setName('')
                setColour('')
                setErrors({})
              }}
              className="mt-3 grid gap-3"
            >
              <Input label="Category Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Shoes" error={errors.name} />
              <Input label="Colour" value={colour} onChange={(e: any) => setColour(e.target.value)} placeholder="#000000 or Black" error={errors.colour} />
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}
