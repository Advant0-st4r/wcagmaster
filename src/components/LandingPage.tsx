// src/components/LandingPage.tsx
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const nav = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-bold mb-4">WCAG Master</h1>
      <p className="text-lg text-gray-700 max-w-xl text-center mb-8">
        AI-powered WCAG optimizer — prepare once, improve accessibility and SEO across your frontend.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => nav('/signup')}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Get Started
        </button>
        <button
          onClick={() => nav('/upload')}
          className="px-6 py-3 border rounded-md"
        >
          Try Upload
        </button>
      </div>
    </div>
  )
}

