import { useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { useOrg } from '@/context/org'

export default function Messages() {
  const { outlets } = useOrg()
  const [selectedChat, setSelectedChat] = useState<string>('hq')
  const [message, setMessage] = useState('')
  const [threads, setThreads] = useState<Record<string, { id: string; from: string; text: string; ts: string }[]>>({
    hq: [
      { id: 'm1', from: 'You', text: 'Hello HQ, need stock update for sneakers.', ts: '10:05' },
      { id: 'm2', from: 'HQ', text: 'Copy that, will share by EOD.', ts: '10:06' },
    ],
  })

  const current = threads[selectedChat] || []

  const send = () => {
    if (!message.trim()) return
    const msg = { id: `m-${Date.now()}`, from: 'You', text: message.trim(), ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setThreads(prev => ({ ...prev, [selectedChat]: [...(prev[selectedChat] || []), msg] }))
    setMessage('')
  }

  return (
    <Shell>
      <PageHeader title="Messages" subtitle="Chat with outlets and head office." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Chats">
          <div className="space-y-2">
            <Select
              label="Select Conversation"
              value={selectedChat}
              onChange={(e: any) => setSelectedChat(e.target.value)}
              options={outlets.map(o => ({ label: `${o.name} (${o.code})`, value: o.id }))}
            />
          </div>
        </Card>
        <Card title="Conversation" className="lg:col-span-2">
          <div className="h-80 overflow-y-auto rounded-md border border-gray-200 p-3 bg-white">
            {current.length === 0 && (
              <div className="text-sm text-gray-500">No messages yet. Say hello!</div>
            )}
            <ul className="space-y-2">
              {current.map(m => (
                <li key={m.id} className="text-sm">
                  <span className="font-medium text-gray-800">{m.from}:</span> <span className="text-gray-700">{m.text}</span>
                  <span className="ml-2 text-[11px] text-gray-400">{m.ts}</span>
                </li>
              ))}
            </ul>
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); send() }}
          >
            <Input placeholder="Type a message" value={message} onChange={(e: any) => setMessage(e.target.value)} className="flex-1" />
            <Button type="submit">Send</Button>
          </form>
        </Card>
      </div>
    </Shell>
  )
}
