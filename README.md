# Matou Chat

A modern chat interface for Ollama LLM with voice support and conversation history.

## Quick Start

### Start Matou
```bash
start_fixed.bat
```

### Stop Matou
```bash
stop_matou.bat
```

## Features
- 🤖 Chat with multiple Ollama models
- 🎤 Voice input and text-to-speech
- 📝 Conversation history
- 🌙 Dark/light mode
- ⚙️ Customizable settings
- ⚡ Speed indicators for models

## Stopping Services

**Option 1: Use the stop script (Recommended)**
- Run `stop_matou.bat` to cleanly shut down all services

**Option 2: Manual cleanup**
- Close the backend and frontend console windows
- Or use Task Manager to end Python and Node.js processes

## Ports
- Backend: http://localhost:8001
- Frontend: http://localhost:5174

## Troubleshooting
- If you get timeout errors, try switching to a faster model (gemma3:270m)
- If ports are in use, the startup script will show an error
- Run `stop_matou.bat` first if you have orphaned processes