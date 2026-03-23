import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Garage from './pages/Garage'
import Workstation from './pages/Workstation'
import Office from './pages/Office'
import { useStore } from './store/useStore'

function App() {
  const { currentProject } = useStore()

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-garage-900 via-garage-800 to-garage-700">
        <Navbar />
        
        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-oil-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-mechanic-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        </div>
        
        <main className="relative z-10">
          <Routes>
            <Route path="/" element={<Garage />} />
            <Route path="/workstation" element={<Workstation />} />
            <Route path="/office" element={<Office />} />
          </Routes>
        </main>
        
        <Toaster 
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #475569',
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App