#!/usr/bin/env python3
"""
Extract text from the logo image using Tesseract OCR.
"""
import pytesseract
from PIL import Image
import numpy as np

filepath = '/home/z/my-project/upload/Gemini_Generated_Image_wekrdmwekrdmwekr.png'
img = Image.open(filepath)

# Full image OCR
print("=== FULL IMAGE OCR ===")
text = pytesseract.image_to_string(img)
print(text)
print("---")

# Also try with different configs
print("\n=== OCR WITH PSM 11 (Sparse text) ===")
text2 = pytesseract.image_to_string(img, config='--psm 11')
print(text2)

print("\n=== OCR WITH PSM 6 (Uniform block) ===")
text3 = pytesseract.image_to_string(img, config='--psm 6')
print(text3)

# Get detailed data
print("\n=== DETAILED OCR DATA ===")
data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
for i, txt in enumerate(data['text']):
    if txt.strip():
        x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
        conf = data['conf'][i]
        print(f"  Text: '{txt}' | Position: ({x},{y}) Size: {w}x{h} | Confidence: {conf}%")

# Analyze image sections for color of text regions
print("\n=== TEXT REGION COLOR ANALYSIS ===")
img_rgb = img.convert('RGB')
for i, txt in enumerate(data['text']):
    if txt.strip() and data['conf'][i] > 50:
        x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
        # Sample center of text region
        cx = min(x + w//2, img.size[0]-1)
        cy = min(y + h//2, img.size[1]-1)
        region = img_rgb.crop((x, y, x+w, y+h))
        pixels = list(region.getdata())
        if pixels:
            # Get most common non-background color
            from collections import Counter
            color_counts = Counter(pixels)
            most_common = color_counts.most_common(3)
            colors_str = ", ".join([f"#{r:02x}{g:02x}{b:02x}" for (r,g,b), c in most_common])
            print(f"  '{txt}' at ({x},{y}) {w}x{h} | Colors: {colors_str}")
