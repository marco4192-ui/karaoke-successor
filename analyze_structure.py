#!/usr/bin/env python3
"""
Deep structural analysis of the logo image.
Analyzes regions, patterns, and composition.
"""
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
from collections import Counter

filepath = '/home/z/my-project/upload/Gemini_Generated_Image_wekrdmwekrdmwekr.png'
img = Image.open(filepath)

if img.mode == 'RGBA':
    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
    rgb_img.paste(img, mask=img.split()[3])
else:
    rgb_img = img.convert('RGB')

W, H = rgb_img.size
print(f"Image: {W}x{H}")
print(f"Aspect ratio: {W/H:.2f} (approximately 11:6)")

# Analyze rows for structural bands
print("\n=== VERTICAL STRUCTURE (Row Analysis) ===")
band_height = H // 10
for i in range(10):
    top = i * band_height
    bottom = top + band_height
    band = rgb_img.crop((0, top, W, bottom))
    band_quant = band.quantize(colors=5, method=Image.Quantize.MEDIANCUT)
    band_rgb = band_quant.convert('RGB')
    pixels = list(band_rgb.getdata())
    colors = Counter(pixels)
    total = sum(colors.values())
    print(f"  Band {i} (y:{top}-{bottom}, {(bottom-top)}px tall):")
    for color, count in colors.most_common(5):
        r, g, b = color
        hex_c = f"#{r:02x}{g:02x}{b:02x}"
        pct = count/total*100
        print(f"    {hex_c} ({pct:.1f}%)")

# Analyze columns for horizontal structure
print("\n=== HORIZONTAL STRUCTURE (Column Analysis) ===")
band_width = W // 10
for i in range(10):
    left = i * band_width
    right = left + band_width
    band = rgb_img.crop((left, 0, right, H))
    band_quant = band.quantize(colors=5, method=Image.Quantize.MEDIANCUT)
    band_rgb = band_quant.convert('RGB')
    pixels = list(band_rgb.getdata())
    colors = Counter(pixels)
    total = sum(colors.values())
    print(f"  Band {i} (x:{left}-{right}, {(right-left)}px wide):")
    for color, count in colors.most_common(5):
        r, g, b = color
        hex_c = f"#{r:02x}{g:02x}{b:02x}"
        pct = count/total*100
        print(f"    {hex_c} ({pct:.1f}%)")

# Analyze the center region (likely where main content is)
print("\n=== CENTER REGION ANALYSIS ===")
cx, cy = W//2, H//2
margin = min(W, H) // 4
center = rgb_img.crop((cx - margin, cy - margin, cx + margin, cy + margin))
center_quant = center.quantize(colors=10, method=Image.Quantize.MEDIANCUT)
center_rgb = center_quant.convert('RGB')
pixels = list(center_rgb.getdata())
colors = Counter(pixels)
total = sum(colors.values())
print(f"  Center region ({margin*2}x{margin*2}px around center):")
for color, count in colors.most_common(10):
    r, g, b = color
    hex_c = f"#{r:02x}{g:02x}{b:02x}"
    pct = count/total*100
    print(f"    {hex_c} ({pct:.1f}%)")

# Edge analysis - detect if there's a border
print("\n=== BORDER/EDGE ANALYSIS ===")
# Check outer edges
edge_width = 10
edges = {
    'top': rgb_img.crop((0, 0, W, edge_width)),
    'bottom': rgb_img.crop((0, H-edge_width, W, H)),
    'left': rgb_img.crop((0, 0, edge_width, H)),
    'right': rgb_img.crop((W-edge_width, 0, W, H)),
}
for name, edge_img in edges.items():
    edge_quant = edge_img.quantize(colors=5, method=Image.Quantize.MEDIANCUT)
    edge_rgb = edge_quant.convert('RGB')
    pixels = list(edge_rgb.getdata())
    colors = Counter(pixels)
    top_c = colors.most_common(1)[0]
    r, g, b = top_c[0]
    hex_c = f"#{r:02x}{g:02x}{b:02x}"
    unique = len(colors)
    print(f"  {name} edge: dominant={hex_c}, unique_colors={unique}")

# Detect rounded corners or irregular edges
print("\n=== CORNER ROUNDING ANALYSIS ===")
# Check corners at various distances from the edge
for corner_name, (cx_off, cy_off) in [('top-left', (0, 0)), ('top-right', (W-1, 0)), 
                                        ('bottom-left', (0, H-1)), ('bottom-right', (W-1, H-1))]:
    # Sample pixels along diagonal from corner
    diagonal_colors = []
    for d in range(0, min(200, min(W, H)//4), 5):
        px = cx_off + (d if cx_off == 0 else -d)
        py = cy_off + (d if cy_off == 0 else -d)
        px = max(0, min(W-1, px))
        py = max(0, min(H-1, py))
        r, g, b = rgb_img.getpixel((px, py))
        diagonal_colors.append((r, g, b))
    
    # Check if the first few pixels differ from the rest (corner rounding effect)
    first_pixels = diagonal_colors[:3]
    rest_pixels = diagonal_colors[3:]
    if rest_pixels:
        avg_rest_r = sum(c[0] for c in rest_pixels)/len(rest_pixels)
        avg_rest_g = sum(c[1] for c in rest_pixels)/len(rest_pixels)
        avg_rest_b = sum(c[2] for c in rest_pixels)/len(rest_pixels)
        first_diff = sum(abs(f[0]-avg_rest_r)+abs(f[1]-avg_rest_g)+abs(f[2]-avg_rest_b) for f in first_pixels)/3
        print(f"  {corner_name}: first_pixel_diff_from_corner_body={first_diff:.1f}")

# Halftone/dot pattern detection
print("\n=== PATTERN DETECTION ===")
# Check for regular patterns by looking at pixel variance in small blocks
gray = rgb_img.convert('L')
block_size = 8
variances = []
for y in range(0, H-block_size, block_size*2):
    for x in range(0, W-block_size, block_size*2):
        block = np.array(gray.crop((x, y, x+block_size, y+block_size)))
        var = np.var(block)
        variances.append(var)

avg_var = np.mean(variances)
max_var = np.max(variances)
std_var = np.std(variances)
high_var_blocks = np.sum(np.array(variances) > avg_var + std_var)
print(f"  Block variance (8x8): avg={avg_var:.1f}, max={max_var:.1f}, std={std_var:.1f}")
print(f"  High-variance blocks: {high_var_blocks}/{len(variances)} ({high_var_blocks/len(variances)*100:.1f}%)")
if high_var_blocks/len(variances) > 0.3:
    print("  → Likely contains fine patterns, textures, or halftone dots")
elif high_var_blocks/len(variances) > 0.1:
    print("  → Some textured regions present")
else:
    print("  → Mostly smooth/flat regions")

# Check for gradient patterns
print("\n=== GRADIENT DETECTION ===")
# Sample horizontal lines through the image
for line_y in [H//4, H//2, 3*H//4]:
    line_pixels = [rgb_img.getpixel((x, line_y)) for x in range(0, W, 10)]
    line_r = [p[0] for p in line_pixels]
    line_g = [p[1] for p in line_pixels]
    line_b = [p[2] for p in line_pixels]
    r_range = max(line_r) - min(line_r)
    g_range = max(line_g) - min(line_g)
    b_range = max(line_b) - min(line_b)
    print(f"  Horizontal line at y={line_y}: R range={r_range}, G range={g_range}, B range={b_range}")
    if r_range > 100 or g_range > 100 or b_range > 100:
        print(f"    → Significant color variation across horizontal axis")

# Specific region deep-dive: Where are the dark areas?
print("\n=== DARK REGION MAP ===")
gray_arr = np.array(gray)
# Find connected dark regions
dark_mask = gray_arr < 50
total_dark = np.sum(dark_mask)
print(f"  Total dark pixels (brightness<50): {total_dark}/{gray_arr.size} ({total_dark/gray_arr.size*100:.1f}%)")

# Find bounding box of all dark content
dark_coords = np.where(dark_mask)
if len(dark_coords[0]) > 0:
    dark_top = dark_coords[0].min()
    dark_bottom = dark_coords[0].max()
    dark_left = dark_coords[1].min()
    dark_right = dark_coords[1].max()
    print(f"  Dark content bounding box: x:{dark_left}-{dark_right}, y:{dark_top}-{dark_bottom}")
    print(f"  Dark content size: {dark_right-dark_left}x{dark_bottom-dark_top}")

# Find bright regions
bright_mask = gray_arr > 230
total_bright = np.sum(bright_mask)
print(f"\n  Total bright pixels (brightness>230): {total_bright}/{gray_arr.size} ({total_bright/gray_arr.size*100:.1f}%)")
bright_coords = np.where(bright_mask)
if len(bright_coords[0]) > 0:
    bright_top = bright_coords[0].min()
    bright_bottom = bright_coords[0].max()
    bright_left = bright_coords[1].min()
    bright_right = bright_coords[1].max()
    print(f"  Bright content bounding box: x:{bright_left}-{bright_right}, y:{bright_top}-{bright_bottom}")
