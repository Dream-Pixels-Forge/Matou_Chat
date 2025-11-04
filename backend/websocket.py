import asyncio
import json
import base64
from typing import Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger
from tts_service import tts_service

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.audio_queues: Dict[str, asyncio.Queue] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.audio_queues[client_id] = asyncio.Queue()
        logger.info(f"Client {client_id} connected")

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)
        self.audio_queues.pop(client_id, None)
        logger.info(f"Client {client_id} disconnected")

    async def send_audio_chunk(self, client_id: str, audio_chunk: bytes):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_bytes(audio_chunk)
            except Exception as e:
                logger.error(f"Error sending audio to {client_id}: {str(e)}")
                self.disconnect(client_id)

    async def process_text_to_speech(self, client_id: str, text: str):
        """Convert text to speech and send audio chunks to the client"""
        try:
            async for audio_chunk in tts_service.text_to_speech(text):
                if client_id in self.active_connections:
                    await self.send_audio_chunk(client_id, audio_chunk)
        except Exception as e:
            logger.error(f"Error in TTS processing for {client_id}: {str(e)}")
            await self.send_error(client_id, f"TTS Error: {str(e)}")

    async def send_error(self, client_id: str, message: str):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json({
                    "type": "error",
                    "message": message
                })
            except Exception as e:
                logger.error(f"Error sending error to {client_id}: {str(e)}")

# Global connection manager
manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """Handle WebSocket connections for voice interaction"""
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            try:
                # Wait for messages from the client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "tts":
                    text = message.get("text", "")
                    if text:
                        # Start TTS processing in the background
                        asyncio.create_task(
                            manager.process_text_to_speech(client_id, text)
                        )
                
            except json.JSONDecodeError:
                await manager.send_error(client_id, "Invalid JSON format")
            except Exception as e:
                logger.error(f"WebSocket error for {client_id}: {str(e)}")
                await manager.send_error(client_id, f"Server error: {str(e)}")
                
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket: {str(e)}")
    finally:
        manager.disconnect(client_id)
