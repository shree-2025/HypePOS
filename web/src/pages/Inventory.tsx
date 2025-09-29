import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/layout/PageHeader'

export default function Inventory() {
  return (
    <Shell>
      <PageHeader
        title="Inventory"
        subtitle="Manage products and stock levels for the selected outlet."
        actions={(
          <>
            <Button variant="outline">Import</Button>
            <Button> Add Product</Button>
          </>
        )}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Stock On Hand" className="lg:col-span-2">
          <div className="text-sm text-gray-500 dark:text-gray-400">No data yet. Connect products and stock APIs.</div>
        </Card>
        <Card title="Low Stock Alerts">
          <div className="text-sm text-gray-500 dark:text-gray-400">No alerts. You’re all stocked up.</div>
        </Card>
      </div>
    </Shell>
  )
}
