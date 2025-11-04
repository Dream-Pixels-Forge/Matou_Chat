# Matou

Matou (meaning "chat") is a beautiful and responsive web interface for interacting with Ollama's LLM models. This application provides a modern chat interface with support for multiple models, markdown rendering, and code syntax highlighting.

![Matou Chat Interface Screenshot](screenshot.png)

## Features

- 🚀 Chat with any Ollama model
- 💅 Beautiful and responsive UI with dark/light mode
- 📝 Markdown support with syntax highlighting
- 🔄 Real-time streaming responses
- 📱 Mobile-friendly design
- 🌓 Dark/light theme support
- 📦 Easy to set up and deploy

## Prerequisites

- Node.js (v16 or later)
- Python 3.8+
- Ollama server running locally (default: http://localhost:11434)

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the backend server:
   ```bash
   python main.py
   ```
   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5174`

## Environment Variables

### Backend

Create a `.env` file in the `backend` directory with the following variables:

```env
# Ollama API Configuration
OLLAMA_BASE_URL=http://localhost:11434

# Server Configuration
PORT=8000
HOST=0.0.0.0

# Development Settings
DEBUG=True
```

## Project Structure

```
ollama-chat-interface/
├── backend/
│   ├── main.py          # FastAPI backend server
│   ├── requirements.txt  # Python dependencies
│   └── .env             # Environment variables
└── frontend/
    ├── src/
    │   ├── components/  # React components
    │   ├── types/       # TypeScript type definitions
    │   ├── App.tsx      # Main application component
    │   ├── main.tsx     # Application entry point
    │   └── App.css      # Global styles
    ├── index.html       # HTML template
    ├── package.json     # Node.js dependencies
    └── vite.config.ts   # Vite configuration
```

## Available Scripts

In the frontend directory, you can run:

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Customization

### Styling

The application uses Mantine for styling with a custom theme. You can customize the theme by modifying the `theme` object in `App.tsx`.

### Models

By default, the application will use the `llama2` model. You can change this in the sidebar by selecting a different model from the dropdown.

## Deployment

### Backend

The backend can be deployed using any WSGI server like Gunicorn or uWSGI. For production, you might want to use a reverse proxy like Nginx.

Example with Gunicorn:
```bash
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend

Build the frontend for production:
```bash
npm run build
```

This will create a `dist` directory with the production build that can be served using any static file server.

## License

MIT

## Acknowledgements

- [Ollama](https://ollama.ai/) - For the amazing LLM platform
- [Mantine](https://mantine.dev/) - For the beautiful React components
- [Vite](https://vitejs.dev/) - For the fast development experience
- [React](https://reactjs.org/) - For building user interfaces
