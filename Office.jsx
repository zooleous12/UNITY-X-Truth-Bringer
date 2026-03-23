import React, { useState, useEffect, useRef } from 'react'
import { 
  Terminal, 
  Play, 
  Square, 
  Trash2, 
  Download, 
  Upload,
  Cpu,
  HardDrive,
  Wifi,
  Activity
} from 'lucide-react'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'

const Office = () => {
  const {
    currentProject,
    terminalOutput,
    isExecuting,
    addTerminalOutput,
    clearTerminal,
    setExecuting
  } = useStore()
  
  const [command, setCommand] = useState('')
  const [systemStats, setSystemStats] = useState({
    cpu: 45,
    memory: 62,
    disk: 78,
    network: 'Connected'
  })
  
  const terminalRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    // Auto-scroll terminal to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  useEffect(() => {
    // Simulate system stats updates
    const interval = setInterval(() => {
      setSystemStats(prev => ({
        cpu: Math.max(20, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(30, Math.min(95, prev.memory + (Math.random() - 0.5) * 8)),
        disk: prev.disk,
        network: Math.random() > 0.1 ? 'Connected' : 'Disconnected'
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const executeCommand = async (cmd) => {
    if (!cmd.trim()) return

    setExecuting(true)
    addTerminalOutput(`$ ${cmd}`)

    // Simulate command execution
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    // Mock command responses
    const responses = {
      'ls': 'app.py\nrequirements.txt\nstatic/\ntemplates/\n__pycache__/',
      'pwd': '/workspace/chop-shop-supreme',
      'whoami': 'mechanic',
      'date': new Date().toString(),
      'python --version': 'Python 3.11.0',
      'node --version': 'v18.17.0',
      'npm --version': '9.6.7',
      'git status': 'On branch main\nnothing to commit, working tree clean',
      'ps aux': 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nmechanic  1234  2.1  1.5  12345  6789 pts/0    S+   10:30   0:01 python app.py',
      'df -h': 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        20G   15G  4.2G  78% /',
      'free -h': '              total        used        free      shared  buff/cache   available\nMem:           8.0G        4.9G        1.2G        256M        1.9G        2.6G',
      'help': 'Available commands:\n  ls, pwd, whoami, date\n  python, node, npm, git\n  ps, df, free, clear\n  run [filename] - Execute project files'
    }

    // Special commands
    if (cmd === 'clear') {
      clearTerminal()
      setExecuting(false)
      return
    }

    if (cmd.startsWith('run ')) {
      const filename = cmd.split(' ')[1]
      if (currentProject?.files?.find(f => f.name === filename)) {
        addTerminalOutput(`Running ${filename}...`)
        await new Promise(resolve => setTimeout(resolve, 1500))
        addTerminalOutput('Hello from the Chop Shop!')
        addTerminalOutput('Process completed successfully.')
      } else {
        addTerminalOutput(`Error: File '${filename}' not found`)
      }
      setExecuting(false)
      return
    }

    if (cmd.startsWith('python ')) {
      const filename = cmd.split(' ')[1]
      if (filename && currentProject?.files?.find(f => f.name === filename)) {
        addTerminalOutput(`Executing Python script: ${filename}`)
        await new Promise(resolve => setTimeout(resolve, 1500))
        addTerminalOutput('Hello from Python!')
        addTerminalOutput('Script execution completed.')
      } else {
        addTerminalOutput('Python 3.11.0 (main, Oct 24 2022, 18:26:48)')
        addTerminalOutput('Type "help", "copyright", "credits" or "license" for more information.')
        addTerminalOutput('>>> ')
      }
      setExecuting(false)
      return
    }

    // Default responses
    const response = responses[cmd.toLowerCase()] || `Command '${cmd}' not found. Type 'help' for available commands.`
    addTerminalOutput(response)
    
    setExecuting(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (command.trim() && !isExecuting) {
      executeCommand(command)
      setCommand('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      // Command history would go here
    }
  }

  const quickCommands = [
    { label: 'List Files', cmd: 'ls' },
    { label: 'Check Status', cmd: 'git status' },
    { label: 'System Info', cmd: 'free -h' },
    { label: 'Run Python', cmd: 'python app.py' },
  ]

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-display font-bold text-oil-400 mb-2">
            🖥️ The Office
          </h1>
          <p className="text-garage-300 text-lg">
            Terminal environment and system monitoring
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Terminal */}
          <div className="lg:col-span-2">
            <div className="garage-card h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Terminal className="w-5 h-5 text-oil-400" />
                  <h3 className="font-semibold text-garage-200">Terminal</h3>
                  {currentProject && (
                    <span className="text-sm text-garage-400">
                      {currentProject.name}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={clearTerminal}
                    className="p-2 text-garage-400 hover:text-red-400 transition-colors"
                    title="Clear Terminal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              {/* Terminal Output */}
              <div 
                ref={terminalRef}
                className="flex-1 bg-garage-900/80 rounded-lg p-4 font-mono text-sm overflow-y-auto border border-garage-600/30"
              >
                <div className="text-green-400 mb-2">
                  Welcome to Chop Shop Supreme Terminal v1.0.0
                </div>
                <div className="text-garage-400 mb-4">
                  Type 'help' for available commands
                </div>
                
                {terminalOutput.map((output) => (
                  <div key={output.id} className="mb-1">
                    <span className="text-garage-300">{output.content}</span>
                  </div>
                ))}
                
                {isExecuting && (
                  <div className="flex items-center space-x-2 text-oil-400">
                    <div className="w-2 h-2 bg-oil-400 rounded-full animate-pulse"></div>
                    <span>Executing...</span>
                  </div>
                )}
              </div>
              
              {/* Command Input */}
              <form onSubmit={handleSubmit} className="mt-4">
                <div className="flex items-center space-x-2">
                  <span className="text-green-400 font-mono">$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter command..."
                    className="flex-1 bg-transparent text-garage-200 font-mono focus:outline-none"
                    disabled={isExecuting}
                  />
                  <button
                    type="submit"
                    disabled={isExecuting || !command.trim()}
                    className="p-2 text-garage-400 hover:text-oil-400 transition-colors disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* System Stats */}
            <div className="garage-card">
              <h3 className="font-semibold text-garage-200 mb-4 flex items-center space-x-2">
                <Activity className="w-5 h-5 text-oil-400" />
                <span>System Monitor</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-garage-300">CPU</span>
                    </div>
                    <span className="text-sm text-garage-400">{systemStats.cpu.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-garage-700 rounded-full h-2">
                    <div 
                      className="h-2 bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${systemStats.cpu}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-garage-300">Memory</span>
                    </div>
                    <span className="text-sm text-garage-400">{systemStats.memory.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-garage-700 rounded-full h-2">
                    <div 
                      className="h-2 bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${systemStats.memory}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-garage-300">Disk</span>
                    </div>
                    <span className="text-sm text-garage-400">{systemStats.disk}%</span>
                  </div>
                  <div className="w-full bg-garage-700 rounded-full h-2">
                    <div 
                      className="h-2 bg-yellow-500 rounded-full"
                      style={{ width: `${systemStats.disk}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wifi className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-garage-300">Network</span>
                  </div>
                  <span className={`text-sm ${systemStats.network === 'Connected' ? 'text-green-400' : 'text-red-400'}`}>
                    {systemStats.network}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Commands */}
            <div className="garage-card">
              <h3 className="font-semibold text-garage-200 mb-4">Quick Commands</h3>
              <div className="space-y-2">
                {quickCommands.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCommand(item.cmd)
                      inputRef.current?.focus()
                    }}
                    className="w-full text-left p-3 bg-garage-800/50 hover:bg-garage-700/50 rounded-lg transition-colors text-sm"
                    disabled={isExecuting}
                  >
                    <div className="font-medium text-garage-200">{item.label}</div>
                    <div className="text-garage-400 font-mono text-xs">{item.cmd}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Project Files */}
            {currentProject && (
              <div className="garage-card">
                <h3 className="font-semibold text-garage-200 mb-4">Project Files</h3>
                <div className="space-y-2">
                  {currentProject.files?.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => {
                        setCommand(`run ${file.name}`)
                        inputRef.current?.focus()
                      }}
                      className="w-full text-left p-2 bg-garage-800/30 hover:bg-garage-700/50 rounded transition-colors"
                      disabled={isExecuting}
                    >
                      <div className="text-sm text-garage-200">{file.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Office