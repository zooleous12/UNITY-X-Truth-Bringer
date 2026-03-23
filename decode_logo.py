#!/usr/bin/env python3
"""
Decoder for Lecture Me Pro logo with embedded Context Forge payload
Usage: python3 decode_logo.py lecture-me-logo-encoded.png
"""

from PIL import Image
import sys

def decode_payload(image_path):
    # Load image
    img = Image.open(image_path).convert('RGB')
    pixels = img.load()
    width, height = img.size
    
    # Extract length (first 32 bits)
    length_bits = ''
    bit_count = 0
    
    for y in range(height):
        for x in range(width):
            if bit_count >= 32:
                break
            r, g, b = pixels[x, y]
            
            if bit_count < 32:
                length_bits += str(r & 1)
                bit_count += 1
            if bit_count < 32:
                length_bits += str(g & 1)
                bit_count += 1
            if bit_count < 32:
                length_bits += str(b & 1)
                bit_count += 1
        if bit_count >= 32:
            break
    
    payload_length = int(length_bits, 2)
    total_bits_needed = 32 + (payload_length * 8)
    
    print(f"📏 Detected payload length: {payload_length} bytes")
    
    # Extract payload bits
    all_bits = ''
    bit_count = 0
    
    for y in range(height):
        for x in range(width):
            if bit_count >= total_bits_needed:
                break
            r, g, b = pixels[x, y]
            
            all_bits += str(r & 1)
            bit_count += 1
            if bit_count >= total_bits_needed:
                break
                
            all_bits += str(g & 1)
            bit_count += 1
            if bit_count >= total_bits_needed:
                break
                
            all_bits += str(b & 1)
            bit_count += 1
        if bit_count >= total_bits_needed:
            break
    
    # Skip the length header
    payload_bits = all_bits[32:total_bits_needed]
    
    # Convert bits to bytes
    payload_bytes = bytearray()
    for i in range(0, len(payload_bits), 8):
        byte_bits = payload_bits[i:i+8]
        if len(byte_bits) == 8:
            payload_bytes.append(int(byte_bits, 2))
    
    # Decode to string
    payload = payload_bytes.decode('utf-8')
    
    return payload

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 decode_logo.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    print(f"🔍 Decoding payload from: {image_path}")
    
    payload = decode_payload(image_path)
    
    print(f"✅ Payload extracted successfully!")
    print(f"📄 Payload length: {len(payload)} characters")
    print("\n" + "="*50)
    print(payload)
    print("="*50)
