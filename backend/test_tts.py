import asyncio
import os
import edge_tts
from tts_service import TTSService, TTSConfig

async def test_tts():
    print("Testing TTS with default settings...")
    tts = TTSService()
    
    test_text = "Hello, this is a test of the text to speech system. It seems to be working well!"
    
    print(f"Generating speech for: {test_text}")
    
    # Create output directory if it doesn't exist
    os.makedirs("output", exist_ok=True)
    output_file = os.path.join("output", "test_output.mp3")
    
    # Generate speech and save to file
    communicate = edge_tts.Communicate(
        text=test_text,
        voice=tts.config.voice,
        rate=tts.config.rate,
        volume=tts.config.volume
    )
    
    print(f"Saving output to: {output_file}")
    await communicate.save(output_file)
    
    print("\nAvailable voices you can use:")
    voices = await edge_tts.list_voices()
    for voice in voices:
        if voice['Locale'].startswith('en-'):  # Show only English voices for brevity
            print(f"- {voice['ShortName']}: {voice['Gender']} ({voice['Locale']})")
    
    print(f"\nTest complete! Check {output_file} for the generated speech.")

if __name__ == "__main__":
    asyncio.run(test_tts())
