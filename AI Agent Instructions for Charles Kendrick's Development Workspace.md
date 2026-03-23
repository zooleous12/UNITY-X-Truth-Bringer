# AI Agent Instructions for Charles Kendrick's Development Workspace

## Project Overview
This workspace contains multiple interconnected projects focused on AI-powered tools, context orchestration, and educational technology. All projects are **PROPERTY OF CHARLES KENDRICK** and represent a comprehensive suite of AI workflow optimization tools.

## Core Projects Architecture

### 1. AI Context Orchestrator (`/ai-orchestrator/`, root files)
**Purpose**: Advanced context injection & steganography platform for AI workflows
- **Entry Points**: `encode_context.py`, `decode_context.py`, `cli.py`, `streamlit_app.py`
- **Key Pattern**: Multi-strategy compression (B64+JSON, B64+GZIP+JSON, B85+GZIP+JSON) with automatic optimization
- **Data Flow**: JSON extraction → placeholder substitution → compression envelope selection → PNG steganography
- **Critical Files**: 
  - `Whisper_Deck/` - Output directory for encoded payloads
  - `tmpDFF8.tmp.py` - Source file containing JSON context data
- **Unique Approach**: Embeds data in PNG text chunks for covert transport

### 2. Lecture Me (`app.py`, `/modules/`)
**Purpose**: AI-powered study guide generator from lectures and textbooks
- **Entry Point**: `app.py` (Streamlit application)
- **Architecture**: Modular design with specialized processors:
  - `audio_processor.py` - Whisper-based transcription
  - `textbook_processor.py` - PDF text extraction
  - `study_guide_generator.py` - AI-powered content synthesis
  - `flashcard_generator.py` - Spaced repetition cards
  - **Revolutionary Features**: Document scanning, weakness analysis, proactive learning
- **Data Flow**: Audio/PDF → AI analysis → Study materials → Downloadable packages
- **Pricing Model**: $9 Student / $19 Scholar / $39 Academic

### 3. Multi-Cloud Forensic Audit (`/MultiCloudAudit/`)
**Purpose**: PowerShell GUI for comprehensive cloud storage analysis
- **Entry Point**: `MultiCloudAuditGUI.ps1`, `RunAudit.bat`
- **Architecture**: PowerShell + ImportExcel module
- **Data Flow**: Cloud folder scan → Excel multi-sheet reports → Cleanup recommendations
- **Output**: Timestamped Excel files with 5 analysis sheets

### 4. Context Forge Enhanced (`/context-forge-enhanced/`)
**Purpose**: Luxury AI infrastructure platform website
- **Tech Stack**: Vanilla HTML/CSS/JS with glassmorphism design
- **Architecture**: Modern responsive design with particle animations
- **Positioning**: "Power. Money. Control." - Enterprise AI infrastructure

### 5. Chop Shop Supreme (`/chop-shop-supreme/`)
**Purpose**: Automotive-themed app builder (competition project)
- **Tech Stack**: React + Vite frontend, FastAPI backend
- **Architecture**: "Garage" (projects), "Workstation" (Monaco editor), "Office" (terminal)
- **Competitive Advantage**: REAL functionality vs. simulation

## Development Workflows

### Context Orchestrator Workflow
```bash
# Encode context data
python encode_context.py
# Or via CLI
python cli.py encode -s source_file.json

# Decode data
python cli.py decode

# Web interface
streamlit run streamlit_app.py
```

### Lecture Me Workflow
```bash
# Main application
streamlit run app.py

# Module testing
python -m modules.audio_processor
```

### Multi-Cloud Audit Workflow
```powershell
# Easy launch
.\RunAudit.bat

# Manual launch
.\MultiCloudAuditGUI.ps1
```

## Key Patterns & Conventions

### File Organization
- **Output Directories**: `Whisper_Deck/`, `data/users/`, `document/`
- **Module Structure**: Specialized processors in `/modules/` with clear separation of concerns
- **Configuration**: Environment variables for paths (`CONTEXT_SOURCE_PATH`)

### Data Processing Patterns
- **JSON Extraction**: Robust brace-matching from mixed-content files
- **Compression Strategy**: Multiple algorithms with automatic optimization
- **Placeholder System**: Dynamic content replacement (`${USER_NAME}`, `${USER_LOCATION}`)
- **Error Handling**: Graceful fallbacks and multiple source file locations

### UI/UX Conventions
- **Streamlit Apps**: Consistent sidebar navigation, feature cards, progress indicators
- **Automotive Metaphors**: "Garage", "Workstation", "Office", "Mechanic" (Chop Shop)
- **Educational Focus**: Study guides, flashcards, progress tracking (Lecture Me)

## Integration Points

### Cross-Project Dependencies
- **Shared Modules**: Audio processing, PDF handling, AI content generation
- **Common Patterns**: Streamlit interfaces, ZIP package downloads, JSON configuration
- **Data Formats**: Base64 encoded payloads, Excel reports, PDF study guides

### External Dependencies
- **AI Services**: OpenAI Whisper, GPT models for content generation
- **Processing Libraries**: PIL/Pillow (PNG embedding), pandas (data analysis)
- **UI Frameworks**: Streamlit (web apps), PowerShell ISE (desktop GUI)

## Critical Developer Knowledge

### Context Orchestrator Specifics
- **Source File Priority**: ENV override → repo-local → temp directory → fallback
- **Encoding Selection**: B85+GZIP typically wins for size optimization
- **PNG Embedding**: Uses text chunks with zlib compression for steganography

### Lecture Me Business Logic
- **Processing Pipeline**: Upload → Transcribe → Analyze → Generate → Package
- **Weakness Analysis**: Scans homework/tests to predict future mistakes
- **Monetization**: Freemium model with processing hour limits

### Multi-Cloud Audit Performance
- **Hash Calculation**: Optional but enables duplicate detection (slower)
- **Large Dataset Handling**: Progress bars, configurable file size thresholds
- **Excel Output**: Multi-sheet reports with pivot-ready data structure

## Security & Privacy Considerations
- **Local Processing**: All AI analysis happens locally when possible
- **No External Tracking**: Privacy-first approach across all applications
- **Steganography**: PNG embedding for covert data transport
- **File Permissions**: Secure handling of temporary files and user data

## Testing & Debugging
- **Context Orchestrator**: `python cli.py test` for full encode/decode cycle
- **Lecture Me**: Module-level testing with sample audio/PDF files
- **Multi-Cloud**: Test with small folder structures before full scans

## Deployment Notes
- **Streamlit Apps**: Use `streamlit run` for development, containerize for production
- **PowerShell Tools**: Require Windows with PowerShell 5.1+, ImportExcel module
- **Web Projects**: Static hosting for Context Forge, full-stack for Chop Shop

Remember: This is a **research and development workspace** with multiple active projects. Always check project-specific README files for detailed implementation guidance.
