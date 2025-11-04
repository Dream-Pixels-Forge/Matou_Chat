from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import edge_tts
import asyncio
import io

router = APIRouter(prefix="/api/tts", tags=["TTS"])

class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-AriaNeural"
    rate: str = "+0%"
    volume: str = "+0%"

@router.post("", response_class=StreamingResponse)
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using edge-tts
    """
    try:
        communicate = edge_tts.Communicate(
            text=request.text,
            voice=request.voice,
            rate=request.rate,
            volume=request.volume
        )
        
        # Create an in-memory buffer to store the audio
        audio_buffer = io.BytesIO()
        
        # Save the audio to the buffer
        await communicate.save(audio_buffer)
        audio_buffer.seek(0)
        
        # Return the audio data as a streaming response
        return StreamingResponse(
            iter([audio_buffer.getvalue()]),
            media_type="audio/mpeg"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate speech: {str(e)}"
        )

@router.get("/voices")
async def list_voices(locale: Optional[str] = None):
    """
    List available voices, optionally filtered by locale
    """
    try:
        voices = await edge_tts.list_voices()
        if locale:
            voices = [v for v in voices if v['Locale'].lower() == locale.lower()]
        return {"voices": voices}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch voices: {str(e)}"
        )
