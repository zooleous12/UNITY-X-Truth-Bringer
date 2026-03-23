import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Wrench, Home, Code, Terminal, Music, Settings } from 'lucide-react'
import { useStore } from '../store/useStore'

const Navbar = () => {
  const location = useLocation()
  const { isPlaying, toggleMusic, currentTrack } = useStore()
  
  const navItems = [
    { path: '/', icon: Home, label: 'The Garage', description: 'Project Dashboard' },
    { path: '/workstation', icon: Code, label: 'Workstation', description: 'Code Editor' },
    { path: '/office', icon: Terminal, label: 'The Office', description: 'Terminal & Testing' },
  ]
  
  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-garage-900/95 backdrop-blur-sm border-b border-garage-600/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-oil-500 to-oil-600 rounded-lg shadow-lg">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-oil-400">
                CHOP SHOP SUPREME
              </h1>
              <p className="text-xs text-garage-400">Ultimate App Builder</p>
            </div>
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300
                    ${isActive(item.path) 
                      ? 'bg-oil-600/20 text-oil-400 border border-oil-500/30' 
                      : 'text-garage-300 hover:text-oil-400 hover:bg-garage-800/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <div className="hidden lg:block">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </div>
          
          {/* Right Side Controls */}
          <div className="flex items-center space-x-4">
            {/* Music Player */}
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleMusic}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300
                  ${isPlaying 
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                    : 'bg-garage-800/50 text-garage-300 hover:text-green-400'
                  }
                `}
              >
                <Music className={`w-4 h-4 ${isPlaying ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:block text-sm">
                  {isPlaying ? 'Playing' : 'Music'}
                </span>
              </button>
              
              {isPlaying && currentTrack && (
                <div className="hidden lg:block text-sm text-garage-300">
                  <div className="font-medium">{currentTrack.title}</div>
                  <div className="text-xs opacity-75">{currentTrack.artist}</div>
                </div>
              )}
            </div>
            
            {/* Settings */}
            <button className="p-2 text-garage-400 hover:text-oil-400 transition-colors duration-300">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-garage-600/30">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-300
                  ${isActive(item.path) 
                    ? 'text-oil-400' 
                    : 'text-garage-400 hover:text-oil-400'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default Navbar