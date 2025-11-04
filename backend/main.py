import logging
import time
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any

import httpx
from fastapi import FastAPI, HTTPException, Request, status, Depends, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from config import get_settings, logger, setup_logging
from websocket import websocket_endpoint, manager
from routers import tts as tts_router
import uuid

# Setup logging
setup_logging()

# Application lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting application...")
    logger.info(f"Environment: {get_settings().model_dump_json(indent=2)}")
    
    # Rate limiting is disabled for now
    # app.state.limiter = Limiter(key_func=get_remote_address)
    # app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("Shutting down application...")

# Create FastAPI app
app = FastAPI(
    title=get_settings().APP_NAME,
    description="Enhanced API for interacting with Ollama LLM",
    version=get_settings().APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=get_settings().CORS_METHODS,
    allow_headers=get_settings().CORS_HEADERS,
)

# Models
class Message(BaseModel):
    role: str = Field(..., description="The role of the message sender (user/assistant/system)")
    content: str = Field(..., description="The content of the message")

class ChatRequest(BaseModel):
    model: str = Field(..., description="The model to use for generation")
    messages: List[Message] = Field(..., description="List of messages in the conversation")
    stream: bool = Field(False, description="Whether to stream the response")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(None, ge=1, description="Maximum number of tokens to generate")

# Middleware for request/response logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    try:
        response = await call_next(request)
    except Exception as e:
        logger.error(f"Request error: {str(e)}")
        raise
    
    # Calculate process time
    process_time = (time.time() - start_time) * 1000
    logger.info(f"Request completed in {process_time:.2f}ms | Status: {response.status_code}")
    
    return response

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )

# WebSocket endpoint
@app.websocket("/ws/voice/{client_id}")
async def websocket_voice(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time voice interaction"""
    await websocket_endpoint(websocket, client_id)

# Include API routers
app.include_router(tts_router.router)

# API endpoints
@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint
    
    Returns:
        dict: Status of the API
    """
    try:
        # Check connection to Ollama
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{get_settings().OLLAMA_BASE_URL}/api/tags", timeout=5.0)
            response.raise_for_status()
            
        return {
            "status": "healthy",
            "version": get_settings().APP_VERSION,
            "ollama_connected": True
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable"
        )

@app.get("/api/tags", tags=["Models"])
async def get_models():
    """
    Get available models from Ollama
    
    Returns:
        dict: List of available models
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{get_settings().OLLAMA_BASE_URL}/api/tags",
                timeout=get_settings().OLLAMA_TIMEOUT
            )
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to Ollama: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to connect to Ollama service"
        )
    except Exception as e:
        logger.error(f"Error getting models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve models"
        )

@app.post("/api/chat", tags=["Chat"])
async def chat(chat_request: ChatRequest, request: Request):
    """
    Chat with the Ollama model
    
    Args:
        chat_request: The chat request containing messages and model info
        
    Returns:
        dict: The model's response
    """
    logger.info(f"Chat request - Model: {chat_request.model}, Messages: {len(chat_request.messages)}")
    
    try:
        url = f"{get_settings().OLLAMA_BASE_URL}/api/chat"
        timeout = get_settings().OLLAMA_TIMEOUT
        
        # Rate limiting - Check if limiter is available
        if hasattr(request.state, 'limiter') and hasattr(request.state.limiter, 'check_limit'):
            try:
                if not request.state.limiter.check_limit():
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded"
                    )
            except Exception as e:
                logger.warning(f"Rate limiter error: {str(e)}")
                # Continue without rate limiting if there's an error
        
        # Prepare request data
        request_data = chat_request.dict(exclude_none=True)
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url,
                json=request_data,
                timeout=timeout
            )
            response.raise_for_status()
            
            # Log successful response
            logger.info(f"Chat response - Status: {response.status_code}")
            return response.json()
            
    except httpx.TimeoutException:
        logger.error("Request to Ollama timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request to Ollama service timed out"
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"Ollama API error: {str(e)}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Ollama API error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request"
        )

@app.post("/api/generate", tags=["Generate"])
async def generate(chat_request: ChatRequest, request: Request):
    """
    Generate text with the Ollama model (supports streaming)
    
    Args:
        chat_request: The generation request
        
    Returns:
        StreamingResponse or dict: Streamed or complete response
    """
    logger.info(f"Generate request - Model: {chat_request.model}, Stream: {chat_request.stream}")
    
    try:
        url = f"{get_settings().OLLAMA_BASE_URL}/api/generate"
        timeout = get_settings().OLLAMA_TIMEOUT
        
        # Rate limiting - Check if limiter is available
        if hasattr(request.state, 'limiter') and hasattr(request.state.limiter, 'check_limit'):
            try:
                if not request.state.limiter.check_limit():
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded"
                    )
            except Exception as e:
                logger.warning(f"Rate limiter error: {str(e)}")
                # Continue without rate limiting if there's an error
        
        # Prepare request data
        request_data = chat_request.dict(exclude_none=True)
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url,
                json=request_data,
                timeout=timeout,
                stream=chat_request.stream
            )
            response.raise_for_status()
            
            if chat_request.stream:
                async def generate_stream():
                    async for chunk in response.aiter_lines():
                        if chunk:
                            yield f"data: {chunk}\n\n"
                
                return StreamingResponse(
                    generate_stream(),
                    media_type="text/event-stream"
                )
            else:
                return response.json()
                
    except httpx.TimeoutException:
        logger.error("Generate request to Ollama timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request to Ollama service timed out"
        )
    except httpx.HTTPStatusError as e:
        logger.error(f"Ollama API error during generate: {str(e)}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Ollama API error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Generate error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating text"
        )

# Application entry point
if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug",
        workers=1
    )
