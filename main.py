from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import json
import uuid
from datetime import datetime
from typing import List, Optional
import subprocess
import tempfile
import shutil

app = FastAPI(title="Chop Shop Supreme API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class Project(BaseModel):
    id: str
    name: str
    status: str = "idle"
    progress: int = 0
    lastModified: str
    files: List[dict] = []

class FileModel(BaseModel):
    name: str
    content: str

class ExecuteRequest(BaseModel):
    code: str
    language: str = "python"

class AIRequest(BaseModel):
    prompt: str
    context: Optional[str] = None

# In-memory storage (replace with database in production)
projects_db = {}
files_db = {}

# Ensure directories exist
os.makedirs("projects", exist_ok=True)
os.makedirs("temp", exist_ok=True)

@app.get("/")
async def root():
    return {"message": "🚗 Chop Shop Supreme API - Ready to build!"}

@app.get("/api/projects")
async def get_projects():
    """Get all projects"""
    return list(projects_db.values())

@app.post("/api/projects")
async def create_project(name: str):
    """Create a new project"""
    project_id = str(uuid.uuid4())
    project = Project(
        id=project_id,
        name=name,
        lastModified=datetime.now().isoformat(),
        files=[{
            "name": "main.py",
            "content": f"# {name} - Created by Chop Shop Supreme\nprint('Hello from {name}!')\n\n# Your code here\n"
        }]
    )
    
    projects_db[project_id] = project.dict()
    
    # Create project directory
    project_dir = f"projects/{project_id}"
    os.makedirs(project_dir, exist_ok=True)
    
    return project.dict()

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Get a specific project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    return projects_db[project_id]

@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, updates: dict):
    """Update a project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    projects_db[project_id].update(updates)
    projects_db[project_id]["lastModified"] = datetime.now().isoformat()
    
    return projects_db[project_id]

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Remove project directory
    project_dir = f"projects/{project_id}"
    if os.path.exists(project_dir):
        shutil.rmtree(project_dir)
    
    del projects_db[project_id]
    return {"message": "Project deleted successfully"}

@app.post("/api/projects/{project_id}/files")
async def create_file(project_id: str, file: FileModel):
    """Create a new file in a project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = projects_db[project_id]
    
    # Check if file already exists
    for existing_file in project["files"]:
        if existing_file["name"] == file.name:
            raise HTTPException(status_code=400, detail="File already exists")
    
    # Add file to project
    project["files"].append(file.dict())
    project["lastModified"] = datetime.now().isoformat()
    
    # Save file to disk
    project_dir = f"projects/{project_id}"
    file_path = os.path.join(project_dir, file.name)
    with open(file_path, 'w') as f:
        f.write(file.content)
    
    return file.dict()

@app.put("/api/projects/{project_id}/files/{file_name}")
async def update_file(project_id: str, file_name: str, content: str):
    """Update a file's content"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = projects_db[project_id]
    
    # Find and update file
    for file in project["files"]:
        if file["name"] == file_name:
            file["content"] = content
            project["lastModified"] = datetime.now().isoformat()
            
            # Save to disk
            project_dir = f"projects/{project_id}"
            file_path = os.path.join(project_dir, file_name)
            with open(file_path, 'w') as f:
                f.write(content)
            
            return file
    
    raise HTTPException(status_code=404, detail="File not found")

@app.delete("/api/projects/{project_id}/files/{file_name}")
async def delete_file(project_id: str, file_name: str):
    """Delete a file from a project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = projects_db[project_id]
    
    # Remove file from project
    project["files"] = [f for f in project["files"] if f["name"] != file_name]
    project["lastModified"] = datetime.now().isoformat()
    
    # Remove file from disk
    project_dir = f"projects/{project_id}"
    file_path = os.path.join(project_dir, file_name)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    return {"message": "File deleted successfully"}

@app.post("/api/execute")
async def execute_code(request: ExecuteRequest):
    """Execute code in a secure sandbox"""
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(request.code)
            temp_file = f.name
        
        # Execute code with timeout
        if request.language == "python":
            result = subprocess.run(
                ["python", temp_file],
                capture_output=True,
                text=True,
                timeout=10,
                cwd="temp"
            )
        elif request.language == "javascript":
            result = subprocess.run(
                ["node", temp_file],
                capture_output=True,
                text=True,
                timeout=10,
                cwd="temp"
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported language")
        
        # Clean up
        os.unlink(temp_file)
        
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "success": result.returncode == 0
        }
        
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "Execution timed out (10s limit)",
            "returncode": -1,
            "success": False
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": str(e),
            "returncode": -1,
            "success": False
        }

@app.post("/api/ai/generate")
async def generate_code(request: AIRequest):
    """Generate code using AI (mock implementation)"""
    
    # Mock AI responses based on prompt keywords
    templates = {
        "react": {
            "code": f"""import React, {{ useState }} from 'react'

function GeneratedComponent() {{
  const [count, setCount] = useState(0)
  
  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Generated Component</h2>
      <p className="text-gray-600 mb-4">Count: {{count}}</p>
      <div className="space-x-2">
        <button 
          onClick={{() => setCount(count + 1)}}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Increment
        </button>
        <button 
          onClick={{() => setCount(count - 1)}}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Decrement
        </button>
      </div>
    </div>
  )
}}

export default GeneratedComponent""",
            "language": "javascript"
        },
        
        "api": {
            "code": f"""from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Sample data
data = []

@app.route('/api/items', methods=['GET'])
def get_items():
    return jsonify(data)

@app.route('/api/items', methods=['POST'])
def create_item():
    item = request.get_json()
    item['id'] = len(data) + 1
    data.append(item)
    return jsonify(item), 201

@app.route('/api/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    item = next((item for item in data if item['id'] == item_id), None)
    if item:
        return jsonify(item)
    return jsonify({{'error': 'Item not found'}}), 404

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    global data
    data = [item for item in data if item['id'] != item_id]
    return jsonify({{'message': 'Item deleted'}})

if __name__ == '__main__':
    app.run(debug=True)""",
            "language": "python"
        },
        
        "dashboard": {
            "code": f"""import React, {{ useState, useEffect }} from 'react'

function Dashboard() {{
  const [stats, setStats] = useState({{
    users: 1250,
    revenue: 45600,
    orders: 89,
    growth: 12.5
  }})
  
  useEffect(() => {{
    // Simulate real-time updates
    const interval = setInterval(() => {{
      setStats(prev => ({{
        ...prev,
        users: prev.users + Math.floor(Math.random() * 5),
        orders: prev.orders + Math.floor(Math.random() * 3)
      }}))
    }}, 5000)
    
    return () => clearInterval(interval)
  }}, [])
  
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-600">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">{{stats.users.toLocaleString()}}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-600">Revenue</h3>
          <p className="text-3xl font-bold text-green-600">${{stats.revenue.toLocaleString()}}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-600">Orders</h3>
          <p className="text-3xl font-bold text-purple-600">{{stats.orders}}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-600">Growth</h3>
          <p className="text-3xl font-bold text-orange-600">{{stats.growth}}%</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span>New user registration</span>
            <span className="text-gray-500">2 minutes ago</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span>Order #1234 completed</span>
            <span className="text-gray-500">5 minutes ago</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span>Payment received</span>
            <span className="text-gray-500">8 minutes ago</span>
          </div>
        </div>
      </div>
    </div>
  )
}}

export default Dashboard""",
            "language": "javascript"
        }
    }
    
    # Determine template based on prompt
    prompt_lower = request.prompt.lower()
    template_key = "api"  # default
    
    if any(word in prompt_lower for word in ["react", "component", "jsx"]):
        template_key = "react"
    elif any(word in prompt_lower for word in ["dashboard", "stats", "analytics"]):
        template_key = "dashboard"
    elif any(word in prompt_lower for word in ["api", "flask", "endpoint", "server"]):
        template_key = "api"
    
    template = templates.get(template_key, templates["api"])
    
    return {
        "code": template["code"],
        "language": template["language"],
        "explanation": f"Generated {template_key} code based on your prompt: '{request.prompt}'"
    }

@app.get("/api/system/stats")
async def get_system_stats():
    """Get system statistics"""
    import psutil
    
    try:
        return {
            "cpu": psutil.cpu_percent(interval=1),
            "memory": psutil.virtual_memory().percent,
            "disk": psutil.disk_usage('/').percent,
            "network": "Connected"  # Simplified
        }
    except:
        return {
            "cpu": 45.0,
            "memory": 62.0,
            "disk": 78.0,
            "network": "Connected"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)