import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Current project state
  currentProject: null,
  projects: [
    {
      id: 1,
      name: "React Dashboard",
      status: "running",
      progress: 75,
      lastModified: "2 minutes ago",
      files: [
        { name: "App.jsx", content: "import React from 'react'\n\nfunction App() {\n  return (\n    <div className=\"p-8\">\n      <h1>My Dashboard</h1>\n    </div>\n  )\n}\n\nexport default App" },
        { name: "index.css", content: "body {\n  margin: 0;\n  font-family: Arial, sans-serif;\n}" }
      ]
    },
    {
      id: 2,
      name: "API Server",
      status: "idle",
      progress: 45,
      lastModified: "1 hour ago",
      files: [
        { name: "server.py", content: "from flask import Flask\n\napp = Flask(__name__)\n\n@app.route('/')\ndef hello():\n    return 'Hello World!'\n\nif __name__ == '__main__':\n    app.run(debug=True)" }
      ]
    },
    {
      id: 3,
      name: "Mobile App",
      status: "error",
      progress: 20,
      lastModified: "3 hours ago",
      files: [
        { name: "App.js", content: "import React from 'react';\nimport { View, Text } from 'react-native';\n\nexport default function App() {\n  return (\n    <View>\n      <Text>Hello Mobile!</Text>\n    </View>\n  );\n}" }
      ]
    }
  ],
  
  // Workstation state
  activeFile: null,
  editorContent: '',
  
  // Office/Terminal state
  terminalOutput: [],
  isExecuting: false,
  
  // Music player state
  isPlaying: false,
  currentTrack: null,
  playlist: [
    { id: 1, title: "Coding Flow", artist: "Lo-Fi Beats", duration: "3:45" },
    { id: 2, title: "Debug Mode", artist: "Synthwave", duration: "4:12" },
    { id: 3, title: "Compile Time", artist: "Ambient Code", duration: "5:23" },
    { id: 4, title: "Git Push", artist: "Electronic", duration: "3:58" }
  ],
  
  // Actions
  setCurrentProject: (project) => set({ currentProject: project }),
  
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map(p => 
      p.id === id ? { ...p, ...updates } : p
    )
  })),
  
  createProject: (name) => {
    const newProject = {
      id: Date.now(),
      name,
      status: "idle",
      progress: 0,
      lastModified: "just now",
      files: [
        { name: "main.py", content: "# Your new project starts here!\nprint('Hello, World!')" }
      ]
    }
    set((state) => ({
      projects: [...state.projects, newProject]
    }))
    return newProject
  },
  
  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter(p => p.id !== id),
    currentProject: state.currentProject?.id === id ? null : state.currentProject
  })),
  
  setActiveFile: (file) => set({ 
    activeFile: file,
    editorContent: file?.content || ''
  }),
  
  updateFileContent: (content) => set((state) => {
    if (!state.activeFile || !state.currentProject) return state
    
    const updatedProjects = state.projects.map(project => {
      if (project.id === state.currentProject.id) {
        const updatedFiles = project.files.map(file => 
          file.name === state.activeFile.name 
            ? { ...file, content }
            : file
        )
        return { ...project, files: updatedFiles, lastModified: "just now" }
      }
      return project
    })
    
    const updatedCurrentProject = updatedProjects.find(p => p.id === state.currentProject.id)
    const updatedActiveFile = updatedCurrentProject?.files.find(f => f.name === state.activeFile.name)
    
    return {
      projects: updatedProjects,
      currentProject: updatedCurrentProject,
      activeFile: updatedActiveFile,
      editorContent: content
    }
  }),
  
  addTerminalOutput: (output) => set((state) => ({
    terminalOutput: [...state.terminalOutput, {
      id: Date.now(),
      content: output,
      timestamp: new Date().toLocaleTimeString()
    }]
  })),
  
  clearTerminal: () => set({ terminalOutput: [] }),
  
  setExecuting: (executing) => set({ isExecuting: executing }),
  
  toggleMusic: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  setCurrentTrack: (track) => set({ currentTrack: track }),
  
  // AI Mechanic Actions
  generateCode: async (prompt) => {
    set({ isExecuting: true })
    
    // Simulate AI code generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const codeTemplates = {
      "react component": `import React, { useState } from 'react'

function ${prompt.replace(/[^a-zA-Z]/g, '')}Component() {
  const [count, setCount] = useState(0)
  
  return (
    <div className="p-4">
      <h2>Generated Component</h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  )
}

export default ${prompt.replace(/[^a-zA-Z]/g, '')}Component`,
      
      "api endpoint": `from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/${prompt.toLowerCase().replace(/\s+/g, '-')}', methods=['GET', 'POST'])
def handle_${prompt.replace(/[^a-zA-Z]/g, '_').toLowerCase()}():
    if request.method == 'GET':
        return jsonify({"message": "GET request received"})
    elif request.method == 'POST':
        data = request.get_json()
        return jsonify({"received": data, "status": "success"})

if __name__ == '__main__':
    app.run(debug=True)`,
      
      "default": `# Generated code for: ${prompt}

def main():
    print("Hello from the AI Mechanic!")
    print("Generated based on: ${prompt}")
    
    # TODO: Implement your logic here
    pass

if __name__ == "__main__":
    main()`
    }
    
    const template = Object.keys(codeTemplates).find(key => 
      prompt.toLowerCase().includes(key)
    ) || "default"
    
    set({ isExecuting: false })
    return codeTemplates[template]
  }
}))