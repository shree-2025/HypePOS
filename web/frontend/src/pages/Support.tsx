import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'

export default function Support() {
  return (
    <Shell>
      <PageHeader
        title="Support"
        subtitle="Find answers or reach out to our team."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="FAQ" className="lg:col-span-2">
          <ul className="list-disc pl-5 text-sm text-gray-700">
            <li>How to add products?</li>
            <li>How to process a sale?</li>
            <li>How to manage stock counts?</li>
            <li>How to transfer stock across outlets?</li>
            <li>How to generate reports?</li>
          </ul>
        </Card>
        <Card title="Contact Us">
          <div className="text-sm text-gray-700">
            Email: support@example.com
            <br />
            Phone: +91-00000-00000
            <br />
            Response time: 1-2 business days
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Help Resources">
          <ul className="list-disc list-inside text-sm text-gray-700">
            <li>User Guide (PDF)</li>
            <li>API Reference</li>
            <li>Troubleshooting</li>
          </ul>
        </Card>
        <Card title="System Status" className="lg:col-span-2">
          <div className="text-sm text-gray-500">All systems operational.</div>
        </Card>
      </div>
    </Shell>
  )
}
