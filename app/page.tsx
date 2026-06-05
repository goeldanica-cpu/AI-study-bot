'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface SaveModalData {
  masteryLevel: 'Introduced' | 'Developing' | 'Proficient' | 'Strong'
  overviewGist: string
  deepDiveGist: string
  strongAreas: string
  weakAreas: string
  nextSteps: string
  notes: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [detectedSubject, setDetectedSubject] = useState('')
  const [detectedConcept, setDetectedConcept] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [lastAssistantMessageId, setLastAssistantMessageId] = useState<string | null>(null)
  const [saveModalData, setSaveModalData] = useState<SaveModalData>({
    masteryLevel: 'Developing',
    overviewGist: '',
    deepDiveGist: '',
    strongAreas: '',
    weakAreas: '',
    nextSteps: '',
    notes: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    const userMessageId = `msg-${Date.now()}-${Math.random()}`
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', content: userMessage },
    ])

    setIsLoading(true)

    try {
      // Step 1: Detect concept
      const detectResponse = await fetch('/api/detect-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage }),
      })

      if (!detectResponse.ok) {
        throw new Error('Failed to detect concept')
      }

      const { subject, concept } = await detectResponse.json()
      setDetectedSubject(subject)
      setDetectedConcept(concept)

      // Step 2: Call chat API with streaming
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          subject,
          concept,
        }),
      })

      if (!chatResponse.ok) {
        throw new Error('Failed to get chat response')
      }

      // Step 3: Stream the response
      const reader = chatResponse.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let assistantMessage = ''
      const assistantMessageId = `msg-${Date.now()}-${Math.random()}`
      let messageAdded = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        assistantMessage += chunk

        if (!messageAdded) {
          setMessages((prev) => [
            ...prev,
            { id: assistantMessageId, role: 'assistant', content: assistantMessage },
          ])
          messageAdded = true
          setLastAssistantMessageId(assistantMessageId)
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: assistantMessage }
                : msg
            )
          )
        }
      }

      // Show save button if subject/concept were detected
      if (subject && concept) {
        setShowSaveModal(false)
        setSaveModalData({
          masteryLevel: 'Developing',
          overviewGist: '',
          deepDiveGist: '',
          strongAreas: '',
          weakAreas: '',
          nextSteps: '',
          notes: '',
        })
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessageId = `msg-${Date.now()}-${Math.random()}`
      setMessages((prev) => [
        ...prev,
        {
          id: errorMessageId,
          role: 'assistant',
          content: 'Sorry, there was an error. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProgress = () => {
    setShowSaveModal(true)
  }

  const handleSaveModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detectedSubject || !detectedConcept) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/save-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: detectedSubject,
          concept: detectedConcept,
          masteryLevel: saveModalData.masteryLevel,
          overviewGist: saveModalData.overviewGist,
          deepDiveGist: saveModalData.deepDiveGist
            .split('\n')
            .filter((s) => s.trim()),
          strongAreas: saveModalData.strongAreas.split(',').map((s) => s.trim()),
          weakAreas: saveModalData.weakAreas.split(',').map((s) => s.trim()),
          nextSteps: saveModalData.nextSteps.split('\n').filter((s) => s.trim()),
          notes: saveModalData.notes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save concept')
      }

      alert('Progress saved successfully!')
      setShowSaveModal(false)
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save progress. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold text-white">Study Agent</div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="rounded-full px-3 py-2 text-slate-200 transition hover:bg-slate-800">
              Chat
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-slate-700 px-3 py-2 text-white transition hover:bg-slate-600"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Study Agent</h1>
        <p className="text-sm text-slate-400">
          {detectedConcept
            ? `Studying: ${detectedSubject} - ${detectedConcept}`
            : 'Ask me anything to get started'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-slate-400">
                Start a conversation to learn something new
              </p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs rounded-lg px-4 py-3 lg:max-w-md ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-100'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-slate-700 px-4 py-3">
                <div className="flex space-x-2">
                  <div className="h-2 w-2 animate-bounce bg-slate-400"></div>
                  <div
                    className="h-2 w-2 animate-bounce bg-slate-400"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="h-2 w-2 animate-bounce bg-slate-400"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          {lastAssistantMessageId && detectedSubject && detectedConcept && (
            <div className="mt-2 flex justify-start">
              <button
                onClick={handleSaveProgress}
                className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
              >
                💾 Save progress
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 bg-slate-800 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-screen w-full max-w-md overflow-y-auto rounded-lg bg-slate-800 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Save Learning Progress</h2>
            <form onSubmit={handleSaveModalSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Mastery Level
                </label>
                <select
                  value={saveModalData.masteryLevel}
                  onChange={(e) =>
                    setSaveModalData({
                      ...saveModalData,
                      masteryLevel: e.target.value as SaveModalData['masteryLevel'],
                    })
                  }
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
                >
                  <option>Introduced</option>
                  <option>Developing</option>
                  <option>Proficient</option>
                  <option>Strong</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Overview/Gist
                </label>
                <textarea
                  value={saveModalData.overviewGist}
                  onChange={(e) =>
                    setSaveModalData({
                      ...saveModalData,
                      overviewGist: e.target.value,
                    })
                  }
                  placeholder="Brief summary of the concept"
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Deep Dive Points
                </label>
                <textarea
                  value={saveModalData.deepDiveGist}
                  onChange={(e) =>
                    setSaveModalData({
                      ...saveModalData,
                      deepDiveGist: e.target.value,
                    })
                  }
                  placeholder="Key details (one per line)"
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Strong Areas (comma-separated)
                </label>
                <input
                  type="text"
                  value={saveModalData.strongAreas}
                  onChange={(e) =>
                    setSaveModalData({
                      ...saveModalData,
                      strongAreas: e.target.value,
                    })
                  }
                  placeholder="e.g., basics, terminology"
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Weak Areas (comma-separated)
                </label>
                <input
                  type="text"
                  value={saveModalData.weakAreas}
                  onChange={(e) =>
                    setSaveModalData({
                      ...saveModalData,
                      weakAreas: e.target.value,
                    })
                  }
                  placeholder="e.g., applications, edge cases"
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Next Steps (one per line)
                </label>
                <textarea
                  value={saveModalData.nextSteps}
                  onChange={(e) =>
                    setSaveModalData({
                      ...saveModalData,
                      nextSteps: e.target.value,
                    })
                  }
                  placeholder="What to study next"
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Additional Notes
                </label>
                <textarea
                  value={saveModalData.notes}
                  onChange={(e) =>
                    setSaveModalData({
                      ...saveModalData,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Any additional notes"
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 rounded border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-700"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
