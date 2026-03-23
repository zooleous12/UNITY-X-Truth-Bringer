import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, Pause, Trash2, Settings, Clock, TrendingUp } from 'lucide-react'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'

const Garage = () => {
  const navigate = useNavigate()
  const { 
    projects, 
    createProject, 
    deleteProject, 
    setCurrentProject, 
    updateProject 
  } = useStore()
  
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name')
      return
    }
    
    const project = createProject(newProjectName)
    setNewProjectName('')
    setShowNewProject(false)
    toast.success(`Project "${project.name}" created!`)
  }

  const handleDeleteProject = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteProject(id)
      toast.success('Project deleted')
    }
  }

  const handleOpenProject = (project) => {
    setCurrentProject(project)
    navigate('/workstation')
    toast.success(`Opened "${project.name}"`)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-400 bg-green-900/30 border-green-500/30'
      case 'idle': return 'text-blue-400 bg-blue-900/30 border-blue-500/30'
      case 'error': return 'text-red-400 bg-red-900/30 border-red-500/30'
      default: return 'text-gray-400 bg-gray-900/30 border-gray-500/30'
    }
  }

  const getProgressColor = (progress) => {
    if (progress < 30) return 'bg-red-500'
    if (progress < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-display font-bold text-oil-400 mb-2">
                🚗 The Garage
              </h1>
              <p className="text-garage-300 text-lg">
                Your project dashboard - where apps come to life
              </p>
            </div>
            
            <button
              onClick={() => setShowNewProject(true)}
              className="mechanic-button flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Project</span>
            </button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="garage-card">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-oil-600/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-oil-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-oil-400">{projects.length}</p>
                  <p className="text-garage-400">Active Projects</p>
                </div>
              </div>
            </div>
            
            <div className="garage-card">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-600/20 rounded-lg">
                  <Play className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    {projects.filter(p => p.status === 'running').length}
                  </p>
                  <p className="text-garage-400">Running</p>
                </div>
              </div>
            </div>
            
            <div className="garage-card">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-600/20 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">
                    {Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length) || 0}%
                  </p>
                  <p className="text-garage-400">Avg Progress</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="lift-card group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-garage-100 mb-2 group-hover:text-oil-400 transition-colors">
                    {project.name}
                  </h3>
                  <div className={`status-indicator ${getStatusColor(project.status)}`}>
                    {project.status.toUpperCase()}
                  </div>
                </div>
                
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Toggle project status
                      const newStatus = project.status === 'running' ? 'idle' : 'running'
                      updateProject(project.id, { status: newStatus })
                    }}
                    className="p-2 text-garage-400 hover:text-green-400 transition-colors"
                  >
                    {project.status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteProject(project.id, project.name)
                    }}
                    className="p-2 text-garage-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-garage-400 mb-2">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-garage-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(project.progress)}`}
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>
              
              {/* File Count & Last Modified */}
              <div className="flex justify-between text-sm text-garage-400 mb-4">
                <span>{project.files?.length || 0} files</span>
                <span>{project.lastModified}</span>
              </div>
              
              {/* Action Button */}
              <button
                onClick={() => handleOpenProject(project)}
                className="w-full oil-button"
              >
                Open in Workstation
              </button>
            </div>
          ))}
          
          {/* Empty State */}
          {projects.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🔧</div>
              <h3 className="text-xl font-semibold text-garage-300 mb-2">
                No projects yet
              </h3>
              <p className="text-garage-400 mb-6">
                Create your first project to get started building amazing apps!
              </p>
              <button
                onClick={() => setShowNewProject(true)}
                className="mechanic-button"
              >
                Create Your First Project
              </button>
            </div>
          )}
        </div>

        {/* New Project Modal */}
        {showNewProject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="garage-card max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-garage-100 mb-4">
                Create New Project
              </h3>
              
              <input
                type="text"
                placeholder="Enter project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                className="garage-input w-full mb-6"
                autoFocus
              />
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateProject}
                  className="flex-1 mechanic-button"
                >
                  Create Project
                </button>
                <button
                  onClick={() => {
                    setShowNewProject(false)
                    setNewProjectName('')
                  }}
                  className="flex-1 bg-garage-700 hover:bg-garage-600 text-garage-300 font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Garage