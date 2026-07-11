'use client'

import { useState, useEffect, useCallback } from 'react'

interface Project {
  id: string
  name: string
  prompt: string
  code: string
  lang: string
  status: 'done' | 'generating'
  created_at: string
}

export default function UIPage() {
  const [prompt, setPrompt] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadProjects = useCallback(() => {
    try {
      const stored = localStorage.getItem('jas_projects')
      if (stored) setProjects(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    loadProjects()
    const id = setInterval(loadProjects, 5000)
    return () => clearInterval(id)
  }, [loadProjects])

  const saveProjects = (ps: Project[]) => {
    try { localStorage.setItem('jas_projects', JSON.stringify(ps)) } catch {}
  }

  const generate = async () => {
    if (!prompt.trim() || generating) return
    setGenerating(true)

    const id = `p-${Date.now()}`
    const newCard: Project = {
      id, name: prompt.slice(0, 40), prompt,
      code: '', lang: 'tsx', status: 'generating',
      created_at: new Date().toISOString()
    }
    const updated = [newCard, ...projects]
    setProjects(updated)
    saveProjects(updated)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt, session_id: id })
      })
      const data = await res.json()
      const answer = data?.data?.answer || data?.answer || 'No output'

      const done: Project = { ...newCard, code: answer, status: 'done' }
      const final = updated.map(p => p.id === id ? done : p)
      setProjects(final)
      saveProjects(final)
    } catch (e) {
      const err: Project = { ...newCard, code: `Error: ${e}`, status: 'done' }
      const final = updated.map(p => p.id === id ? err : p)
      setProjects(final)
      saveProjects(final)
    } finally {
      setGenerating(false)
      setPrompt('')
    }
  }

  const clearAll = () => {
    setProjects([])
    localStorage.removeItem('jas_projects')
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">JAS UI</h1>
          <p className="text-gray-400 text-sm">Generated apps — type a prompt, get a live card</p>
        </div>

        {/* Prompt box */}
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="create a nextjs todo app..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
          <button
            onClick={generate}
            disabled={generating || !prompt.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>

        {/* Cards */}
        {projects.length === 0 ? (
          <div className="text-center text-gray-600 py-20">
            <p className="text-lg">No apps yet</p>
            <p className="text-sm mt-1">Type a prompt above to generate your first app</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400 text-sm">{projects.length} app{projects.length !== 1 ? 's' : ''}</span>
              <button onClick={clearAll} className="text-gray-500 hover:text-red-400 text-sm transition-colors">Clear all</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(p => (
                <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm truncate">{p.name}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {new Date(p.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                      p.status === 'done' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300 animate-pulse'
                    }`}>
                      {p.status === 'done' ? 'done' : 'generating…'}
                    </span>
                  </div>

                  {p.status === 'done' && p.code && (
                    <div>
                      <button
                        onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                        className="text-blue-400 hover:text-blue-300 text-xs mb-2 transition-colors"
                      >
                        {expanded === p.id ? 'Hide code ↑' : 'View code ↓'}
                      </button>
                      {expanded === p.id && (
                        <pre className="bg-gray-950 rounded-lg p-3 text-xs text-gray-300 overflow-auto max-h-48 whitespace-pre-wrap">
                          {p.code}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
