import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const data = [
  { name: 'Mon', sales: 240 },
  { name: 'Tue', sales: 320 },
  { name: 'Wed', sales: 210 },
  { name: 'Thu', sales: 380 },
  { name: 'Fri', sales: 290 },
  { name: 'Sat', sales: 450 },
  { name: 'Sun', sales: 300 },
]

export default function SalesChart() {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#9CA3AF" />
          <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
          <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
          <Tooltip />
          <Line type="monotone" dataKey="sales" stroke="#000000" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
