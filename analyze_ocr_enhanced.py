#!/usr/bin/env python3
"""
Enhanced OCR with image preprocessing for better text detection.
"""
import pytesseract
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
import numpy as np

filepath = '/home/z/my-project/upload/Gemini_Generated_Image_wekrdmwekrdmwekr.png'
img = Image.open(filepath).convert('RGB')

W, H = img.size

# Try multiple preprocessing approaches
print("=== ENHANCED OCR ANALYSIS ===\n")

# Method 1: High contrast black/white
gray = img.convert('L')
enhanced = ImageOps.autocontrast(gray, cutoff=2)
bw = enhanced.point(lambda x: 0 if x < 128 else 255)
print("Method 1 (High contrast B/W):")
print(pytesseract.image_to_string(bw, config='--psm 6 --oem 3'))

# Method 2: Edge-enhanced
edges = gray.filter(ImageFilter.FIND_EDGES)
print("\nMethod 2 (Edge detection):")
print(pytesseract.image_to_string(edges, config='--psm 6 --oem 3'))

# Method 3: Inverted
inverted = ImageOps.invert(gray)
print("\nMethod 3 (Inverted):")
print(pytesseract.image_to_string(inverted, config='--psm 6 --oem 3'))

# Method 4: Scale up and sharpen
scaled = img.resize((W*2, H*2), Image.LANCZOS)
scaled_gray = scaled.convert('L')
sharpened = scaled_gray.filter(ImageFilter.SHARPEN)
print("\nMethod 4 (2x scaled + sharpened):")
print(pytesseract.image_to_string(sharpened, config='--psm 6 --oem 3'))

# Method 5: Analyze specific horizontal strips where text is likely
print("\n=== STRIP-BASED OCR ===")
strip_height = H // 8
for i in range(8):
    top = i * strip_height
    bottom = top + strip_height
    strip = img.crop((0, top, W, bottom))
    strip_gray = strip.convert('L')
    strip_bw = strip_gray.point(lambda x: 0 if x < 100 else 255)
    text = pytesseract.image_to_string(strip_bw, config='--psm 7 --oem 3').strip()
    if text and len(text) > 2:
        print(f"  Strip {i} (y:{top}-{bottom}): '{text}'")

# Also try with character-level detection
print("\n=== CHARACTER-LEVEL DETECTION ===")
for i in range(8):
    top = i * strip_height
    bottom = top + strip_height
    strip = img.crop((0, top, W, bottom))
    strip_gray = strip.convert('L')
    strip_bw = strip_gray.point(lambda x: 0 if x < 100 else 255)
    text = pytesseract.image_to_string(strip_bw, config='--psm 8 --oem 3').strip()
    if text and len(text) > 1:
        print(f"  Strip {i} (y:{top}-{bottom}): '{text}'")
