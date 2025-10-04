import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/layout/PageHeader'

export default function Promotions() {
  return (
    <Shell>
      <PageHeader
        title="Promotions"
        subtitle="Create and manage promotional campaigns."
        actions={<Button>Create Promotion</Button>}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Active Promotions">
          <div className="text-sm text-gray-500 dark:text-gray-400">No promotions yet. Create one to get started.</div>
        </Card>
        <Card title="Upcoming / Expired">
          <div className="text-sm text-gray-500 dark:text-gray-400">No history available.</div>
        </Card>
      </div>
    </Shell>
  )
}
