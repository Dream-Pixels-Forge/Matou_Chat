import os
import tempfile
import asyncio
from typing import AsyncGenerator, Optional
from dataclasses import dataclass
import edge_tts
from loguru import logger

@dataclass
class TTSConfig:
    voice: str = "en-US-AriaNeural"  # Default voice, can be changed
    rate: str = "+0%"  # Speaking rate adjustment
    volume: str = "+0%"  # Volume adjustment

class TTSService:
    def __init__(self, config: Optional[TTSConfig] = None):
        self.config = config or TTSConfig()
        
    async def text_to_speech(self, text: str) -> AsyncGenerator[bytes, None]:
        """Convert text to speech and yield audio chunks"""
        try:
            # Create a temporary file to store the audio
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
                temp_path = temp_file.name
            
            # Generate speech and save to temp file
            communicate = edge_tts.Communicate(
                text=text,
                voice=self.config.voice,
                rate=self.config.rate,
                volume=self.config.volume
            )
            
            # Save to the temp file
            await communicate.save(temp_path)
            
            # Read the file in chunks and yield
            chunk_size = 4096
            with open(temp_path, 'rb') as audio_file:
                while True:
                    chunk = audio_file.read(chunk_size)
                    if not chunk:
                        break
                    yield chunk
            
            # Clean up
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temp file {temp_path}: {e}")
                
        except Exception as e:
            logger.error(f"Error in text_to_speech: {str(e)}")
            raise
    
    async def play_audio(self, audio_data: bytes, sample_rate: int = 22050):
        """Play audio data using sounddevice"""
        try:
            # Convert bytes back to numpy array
            audio_array = np.frombuffer(audio_data, dtype=np.int16)
            
            # Normalize to float32 for sounddevice
            audio_array = audio_array.astype(np.float32) / 32768.0
            
            # Play the audio
            sd.play(audio_array, sample_rate)
            sd.wait()  # Wait until audio is done playing
            
        except Exception as e:
            logger.error(f"Error playing audio: {str(e)}")
            raise

# Global TTS service instance
tts_service = TTSService()
