#!/usr/bin/env python3
"""
Comprehensive logo image analysis using Python/Pillow.
Extracts color palette, layout information, texture patterns, etc.
"""
from PIL import Image
import numpy as np
from collections import Counter
import json

def analyze_image(filepath):
    print(f"=== IMAGE ANALYSIS: {filepath} ===\n")
    
    # Open image
    img = Image.open(filepath)
    print(f"1. BASIC INFO:")
    print(f"   Format: {img.format}")
    print(f"   Mode: {img.mode}")
    print(f"   Size: {img.size[0]}x{img.size[1]} pixels")
    print(f"   Aspect Ratio: {img.size[0]/img.size[1]:.4f}")
    
    # Convert to RGB if needed
    if img.mode == 'RGBA':
        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
        rgb_img.paste(img, mask=img.split()[3])
        img_rgb = rgb_img
    else:
        img_rgb = img.convert('RGB')
    
    # Analyze alpha channel if present
    if img.mode == 'RGBA':
        alpha = img.split()[3]
        alpha_data = np.array(alpha)
        transparent_pixels = np.sum(alpha_data < 128)
        total_pixels = alpha_data.size
        print(f"   Transparency: {transparent_pixels/total_pixels*100:.1f}% transparent")
    
    # Get pixel data
    pixels = np.array(img_rgb)
    
    print(f"\n2. COLOR ANALYSIS:")
    
    # Top colors (quantized)
    quantized = img_rgb.quantize(colors=32, method=Image.Quantize.MEDIANCUT)
    quant_rgb = quantized.convert('RGB')
    quant_pixels = list(quant_rgb.getdata())
    color_counts = Counter(quant_pixels)
    
    print(f"   Top 32 colors (by frequency):")
    for i, (color, count) in enumerate(color_counts.most_common(32)):
        r, g, b = color
        hex_code = f"#{r:02x}{g:02x}{b:02x}"
        percentage = count / len(quant_pixels) * 100
        print(f"   [{i+1:2d}] {hex_code} (RGB: {r:3d},{g:3d},{b:3d}) - {percentage:.1f}% of image")
    
    # Also analyze with more precision - cluster colors
    print(f"\n   --- More precise color analysis ---")
    # Reshape and sample
    all_pixels = pixels.reshape(-1, 3)
    sample = all_pixels[np.random.choice(len(all_pixels), min(50000, len(all_pixels)), replace=False)]
    
    # Simple k-means-like color clustering
    def find_dominant_colors(pixels_arr, n_colors=16):
        from PIL import Image as PILImage
        small = PILImage.fromarray(pixels.reshape(img.size[1], img.size[0], 3))
        small = small.resize((256, int(256 * img.size[1] / img.size[0])))
        quant = small.quantize(colors=n_colors, method=PILImage.Quantize.MEDIANCUT)
        palette = quant.getpalette()
        counts = quant.getcolors()
        if counts:
            result = []
            for count, idx in sorted(counts, key=lambda x: -x[0]):
                r = palette[idx*3]
                g = palette[idx*3+1]
                b = palette[idx*3+2]
                hex_code = f"#{r:02x}{g:02x}{b:02x}"
                total_pixels_count = 256 * int(256 * img.size[1] / img.size[0])
                pct = count / total_pixels_count * 100
                result.append((hex_code, r, g, b, pct))
            return result
        return []
    
    dominant = find_dominant_colors(pixels, 20)
    print(f"   Top 20 dominant colors (from resized analysis):")
    for i, (hex_code, r, g, b, pct) in enumerate(dominant):
        # Determine color category
        h, s, v = rgb_to_hsv(r, g, b)
        category = categorize_color(r, g, b, h, s, v)
        print(f"   [{i+1:2d}] {hex_code} | R:{r:3d} G:{g:3d} B:{b:3d} | HSV({h:.0f},{s:.0f},{v:.0f}) | {category} | {pct:.1f}%")
    
    print(f"\n3. SPATIAL LAYOUT ANALYSIS:")
    
    # Divide image into a grid and analyze each section
    grid_w, grid_h = 5, 3
    section_w = img.size[0] // grid_w
    section_h = img.size[1] // grid_h
    
    print(f"   Analyzing {grid_w}x{grid_h} grid sections:")
    for row in range(grid_h):
        for col in range(grid_w):
            left = col * section_w
            top = row * section_h
            right = left + section_w
            bottom = top + section_h
            
            section = img_rgb.crop((left, top, right, bottom))
            section_quant = section.quantize(colors=4, method=Image.Quantize.MEDIANCUT)
            section_rgb = section_quant.convert('RGB')
            section_pixels = list(section_rgb.getdata())
            section_colors = Counter(section_pixels)
            
            top_color = section_colors.most_common(1)[0][0]
            r, g, b = top_color
            hex_code = f"#{r:02x}{g:02x}{b:02x}"
            num_unique = len(section_colors)
            print(f"   Section [{row},{col}] (x:{left}-{right}, y:{top}-{bottom}): dominant={hex_code}, unique colors={num_unique}")
    
    print(f"\n4. BRIGHTNESS/CONTRAST ANALYSIS:")
    gray = img_rgb.convert('L')
    gray_data = np.array(gray)
    print(f"   Mean brightness: {gray_data.mean():.1f}/255 ({gray_data.mean()/255*100:.1f}%)")
    print(f"   Std deviation: {gray_data.std():.1f}")
    print(f"   Min brightness: {gray_data.min()}")
    print(f"   Max brightness: {gray_data.max()}")
    
    # Analyze brightness distribution
    dark_pct = np.sum(gray_data < 64) / gray_data.size * 100
    mid_pct = np.sum((gray_data >= 64) & (gray_data < 192)) / gray_data.size * 100
    light_pct = np.sum(gray_data >= 192) / gray_data.size * 100
    print(f"   Dark pixels (<25%): {dark_pct:.1f}%")
    print(f"   Mid pixels (25-75%): {mid_pct:.1f}%")
    print(f"   Light pixels (>75%): {light_pct:.1f}%")
    
    print(f"\n5. EDGE/TEXTURE ANALYSIS:")
    # Simple edge detection
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_data = np.array(edges)
    edge_intensity = edge_data.mean()
    print(f"   Average edge intensity: {edge_intensity:.1f}/255")
    print(f"   (Higher values indicate more detail/edges/texture)")
    
    # Saturation analysis
    hsv_img = img_rgb.convert('HSV')
    h_data, s_data, v_data = hsv_img.split()
    s_arr = np.array(s_data)
    avg_sat = s_arr.mean()
    print(f"\n6. SATURATION ANALYSIS:")
    print(f"   Average saturation: {avg_sat:.1f}/255 ({avg_sat/255*100:.1f}%)")
    high_sat_pct = np.sum(s_arr > 180) / s_arr.size * 100
    low_sat_pct = np.sum(s_arr < 50) / s_arr.size * 100
    print(f"   High saturation (>70%): {high_sat_pct:.1f}%")
    print(f"   Low saturation (<20%): {low_sat_pct:.1f}%")
    
    print(f"\n7. CORNER/SIDE ANALYSIS:")
    corners = {
        'top-left': img_rgb.crop((0, 0, section_w*2, section_h*2)),
        'top-right': img_rgb.crop((img.size[0]-section_w*2, 0, img.size[0], section_h*2)),
        'bottom-left': img_rgb.crop((0, img.size[1]-section_h*2, section_w*2, img.size[1])),
        'bottom-right': img_rgb.crop((img.size[0]-section_w*2, img.size[1]-section_h*2, img.size[0], img.size[1])),
    }
    for name, corner_img in corners.items():
        c_quant = corner_img.quantize(colors=3, method=Image.Quantize.MEDIANCUT)
        c_rgb = c_quant.convert('RGB')
        c_pixels = list(c_rgb.getdata())
        c_colors = Counter(c_pixels)
        top_c = c_colors.most_common(1)[0][0]
        r, g, b = top_c
        hex_code = f"#{r:02x}{g:02x}{b:02x}"
        print(f"   {name} corner dominant color: {hex_code}")

def rgb_to_hsv(r, g, b):
    r, g, b = r/255.0, g/255.0, b/255.0
    mx, mn = max(r, g, b), min(r, g, b)
    diff = mx - mn
    h = 0
    if diff != 0:
        if mx == r:
            h = (60 * ((g - b) / diff) + 360) % 360
        elif mx == g:
            h = (60 * ((b - r) / diff) + 120) % 360
        else:
            h = (60 * ((r - g) / diff) + 240) % 360
    s = 0 if mx == 0 else (diff / mx) * 255
    v = mx * 255
    return h, s, v

def categorize_color(r, g, b, h, s, v):
    if v < 30:
        return "BLACK"
    if v > 230 and s < 30:
        return "WHITE"
    if s < 25:
        if v < 100:
            return "DARK GRAY"
        elif v > 180:
            return "LIGHT GRAY"
        else:
            return "GRAY"
    
    if h < 15 or h >= 345:
        if v < 100:
            return "DARK RED"
        elif s < 100:
            return "BROWN"
        return "RED"
    elif h < 45:
        if s < 100:
            return "BROWN/OLIVE"
        return "ORANGE"
    elif h < 70:
        if s < 80:
            return "OLIVE/KHAKI"
        return "YELLOW"
    elif h < 160:
        if v < 80:
            return "DARK GREEN"
        return "GREEN"
    elif h < 200:
        return "TEAL/CYAN"
    elif h < 260:
        if v < 80:
            return "DARK BLUE"
        return "BLUE"
    elif h < 300:
        return "PURPLE"
    else:
        return "MAGENTA/PINK"

if __name__ == '__main__':
    from PIL import ImageFilter
    analyze_image('/home/z/my-project/upload/Gemini_Generated_Image_wekrdmwekrdmwekr.png')
