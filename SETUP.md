# Matou Setup Guide

## Quick Start

1. **Install Prerequisites**
   - Python 3.8+ 
   - Node.js 16+
   - Ollama

2. **Start Services**
   ```bash
   # Option 1: Use the simple startup script
   start_simple.bat
   
   # Option 2: Manual startup
   # Terminal 1 - Backend
   cd backend
   pip install -r requirements.txt
   python -m uvicorn main:app --reload
   
   # Terminal 2 - Frontend  
   cd frontend
   npm install
   npm run dev
   
   # Terminal 3 - Ollama (if not running)
   ollama serve
   ```

3. **Test Setup**
   ```bash
   python test_setup.py
   ```

4. **Access Application**
   - Frontend: http://localhost:5174
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Troubleshooting

### Common Issues

**1. "Failed to connect to Ollama service"**
- Ensure Ollama is running: `ollama serve`
- Check if Ollama is accessible: `curl http://localhost:11434/api/tags`

**2. "Backend not accessible"**
- Check if Python dependencies are installed: `pip install -r requirements.txt`
- Verify backend is running on port 8000
- Check backend logs for errors

**3. "Frontend not loading"**
- Install Node.js dependencies: `npm install`
- Check if Vite dev server is running on port 5174
- Clear browser cache

**4. "API calls failing"**
- Verify backend is running and accessible
- Check browser console for CORS errors
- Ensure API endpoints are correct

### Port Configuration

- Ollama: 11434 (default)
- Backend: 8000
- Frontend: 5174

### Environment Variables

Backend (.env):
```
OLLAMA_BASE_URL=http://localhost:11434
PORT=8000
HOST=0.0.0.0
DEBUG=True
```

## Features Working

✅ Chat interface with Ollama models
✅ Model selection
✅ Dark/light theme toggle
✅ Text-to-speech (TTS)
✅ Responsive design
✅ Message history
✅ Error handling

## Architecture

```
Frontend (React + Vite) → Backend (FastAPI) → Ollama
     ↓                        ↓
  Port 5174              Port 8000         Port 11434
```

The frontend communicates with the backend API, which then forwards requests to Ollama. This architecture provides better error handling, logging, and potential for future features like authentication.