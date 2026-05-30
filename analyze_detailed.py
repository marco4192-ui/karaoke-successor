#!/usr/bin/env python3
"""
Even more detailed analysis - extract color per region and look for specific design elements.
"""
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
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

# Extract a palette with proper color names
print("=== DEFINITIVE COLOR PALETTE ===")
small = rgb_img.resize((200, 109))
quant = small.quantize(colors=24, method=Image.Quantize.MEDIANCUT)
palette = quant.getpalette()
counts = quant.getcolors()

# Group similar colors
def hex_color(idx):
    r = palette[idx*3]
    g = palette[idx*3+1]
    b = palette[idx*3+2]
    return f"#{r:02x}{g:02x}{b:02x}", (r, g, b)

def color_name(r, g, b):
    from colorsys import rgb_to_hsv
    h, s, v = rgb_to_hsv(r/255, g/255, b/255)
    
    if v < 0.12: return "Near-Black"
    if v > 0.88 and s < 0.12: return "White/Off-White"
    if s < 0.10:
        if v < 0.3: return "Dark Gray"
        if v < 0.7: return "Gray"
        return "Light Gray"
    
    if h < 0.05 or h >= 0.95:
        if s > 0.7: return "Hot Pink / Magenta"
        if s > 0.4: return "Pink / Rose"
        return "Muted Pink"
    elif h < 0.12:
        if s > 0.6: return "Orange-Red / Coral"
        return "Warm Red"
    elif h < 0.2:
        return "Orange"
    elif h < 0.3:
        return "Amber / Gold / Yellow"
    elif h < 0.45:
        if s > 0.5: return "Yellow-Green / Lime"
        return "Olive / Khaki"
    elif h < 0.55:
        if s > 0.5: return "Green"
        return "Sage Green"
    elif h < 0.65:
        return "Teal"
    elif h < 0.75:
        return "Cyan / Mint"
    elif h < 0.85:
        if s > 0.5: return "Blue"
        return "Steel Blue"
    elif h < 0.95:
        if s > 0.6: return "Purple / Violet"
        return "Lavender / Mauve"

total_pixels = 200 * 109
print("\nPrimary palette (sorted by frequency):")
sorted_colors = sorted(counts, key=lambda x: -x[0])
for i, (count, idx) in enumerate(sorted_colors):
    hex_c, (r, g, b) = hex_color(idx)
    pct = count / total_pixels * 100
    name = color_name(r, g, b)
    print(f"  #{i+1:2d}: {hex_c}  RGB({r:3d},{g:3d},{b:3d})  [{name}]  {pct:.1f}%")

# Analyze for halftone/dot patterns more carefully
print("\n=== DETAILED TEXTURE ANALYSIS ===")
gray = rgb_img.convert('L')

# Check for periodic patterns (halftone dots)
# Look at autocorrelation of brightness values along rows
row = np.array(gray.crop((0, H//2, W, H//2+1))).flatten()
row_normalized = row - row.mean()
row_normalized = row_normalized / (row_normalized.std() + 1e-10)

# Check for regular periodicity
from numpy.fft import fft
spectrum = np.abs(fft(row_normalized[:1024]))
spectrum = spectrum[:512]
peaks = []
for i in range(2, len(spectrum)-1):
    if spectrum[i] > spectrum[i-1] and spectrum[i] > spectrum[i+1] and spectrum[i] > np.mean(spectrum) * 2:
        peaks.append(i)
print(f"  Frequency peaks (suggesting regular patterns): {peaks[:10]}")
if len(peaks) > 5:
    print("  → Regular periodic patterns detected - likely halftone dots or line patterns")

# Check specific regions for halftone-like patterns
# Sample multiple points and look for circular dot patterns
print("\n  Checking for dot patterns in various regions:")
for ry, rx in [(H//4, W//4), (H//4, W//2), (H//2, W//2), (H//2, 3*W//4), (3*H//4, W//2)]:
    region = gray.crop((rx-20, ry-20, rx+20, ry+20))
    r_arr = np.array(region)
    # Count local maxima (dots)
    from scipy import ndimage
    local_max = ndimage.maximum_filter(r_arr, size=3)
    detected_maxima = (r_arr == local_max) & (r_arr > np.percentile(r_arr, 75))
    num_maxima = np.sum(detected_maxima)
    # Count local minima (gaps between dots)
    local_min = ndimage.minimum_filter(r_arr, size=3)
    detected_minima = (r_arr == local_min) & (r_arr < np.percentile(r_arr, 25))
    num_minima = np.sum(detected_minima)
    print(f"    Region at ({rx},{ry}): bright_spots={num_maxima}, dark_spots={num_minima}")

# Check for outline/stroke effects around colored areas
print("\n=== OUTLINE/STROKE DETECTION ===")
# Look at edges of saturated regions
hsv_img = rgb_img.convert('HSV')
s_data = np.array(hsv_img.split()[1])
v_data = np.array(hsv_img.split()[2])

# Find saturated regions
saturated_mask = s_data > 128
# Find dark outlines near saturated regions
dark_mask = v_data < 50

# Dilate saturated mask
from scipy import ndimage
dilated = ndimage.binary_dilation(saturated_mask, iterations=3)
outline_candidates = dilated & dark_mask & ~saturated_mask

outline_pct = np.sum(outline_candidates) / outline_candidates.size * 100
print(f"  Outline-like pixels (dark borders near saturated areas): {outline_pct:.1f}%")
if outline_pct > 2:
    print("  → Significant use of outlines/strokes around colored elements")

# Detect thick black outlines (common in comic/retro styles)
edge_img = gray.filter(ImageFilter.FIND_EDGES)
edge_arr = np.array(edge_img)
strong_edges = edge_arr > 100
strong_edge_pct = np.sum(strong_edges) / strong_edges.size * 100
print(f"  Strong edges (black outlines): {strong_edge_pct:.1f}%")
if strong_edge_pct > 5:
    print("  → Heavy use of black outlines - comic/retro style indicator")

# Analyze specific dominant color regions more carefully
print("\n=== COLOR REGION ANALYSIS ===")
# Create color masks
pixels_arr = np.array(rgb_img)

# Yellow regions
yellow_mask = (pixels_arr[:,:,0] > 200) & (pixels_arr[:,:,1] > 180) & (pixels_arr[:,:,2] < 80)
yellow_pct = np.sum(yellow_mask) / yellow_mask.size * 100
print(f"  Yellow regions: {yellow_pct:.1f}%")

# Pink/magenta regions
pink_mask = (pixels_arr[:,:,0] > 150) & (pixels_arr[:,:,1] < 100) & (pixels_arr[:,:,2] > 100)
pink_pct = np.sum(pink_mask) / pink_mask.size * 100
print(f"  Pink/Magenta regions: {pink_pct:.1f}%")

# Teal/mint regions
teal_mask = (pixels_arr[:,:,0] < 80) & (pixels_arr[:,:,1] > 150) & (pixels_arr[:,:,2] > 120)
teal_pct = np.sum(teal_mask) / teal_mask.size * 100
print(f"  Teal/Mint regions: {teal_pct:.1f}%")

# Purple regions
purple_mask = (pixels_arr[:,:,0] > 80) & (pixels_arr[:,:,1] < 80) & (pixels_arr[:,:,2] > 80) & (pixels_arr[:,:,0] > pixels_arr[:,:,2])
purple_pct = np.sum(purple_mask) / purple_mask.size * 100
print(f"  Purple regions: {purple_pct:.1f}%")

# Green regions
green_mask = (pixels_arr[:,:,0] < 80) & (pixels_arr[:,:,1] > 150) & (pixels_arr[:,:,2] < 100)
green_pct = np.sum(green_mask) / green_mask.size * 100
print(f"  Green regions: {green_pct:.1f}%")

# White/cream regions
white_mask = (pixels_arr[:,:,0] > 230) & (pixels_arr[:,:,1] > 230) & (pixels_arr[:,:,2] > 220)
white_pct = np.sum(white_mask) / white_mask.size * 100
print(f"  White/Cream regions: {white_pct:.1f}%")

# Dark/near-black regions
dark_mask = (pixels_arr[:,:,0] < 20) & (pixels_arr[:,:,1] < 20) & (pixels_arr[:,:,2] < 20)
dark_pct = np.sum(dark_mask) / dark_mask.size * 100
print(f"  Near-Black regions: {dark_pct:.1f}%")

# Warm/skin-tone regions
skin_mask = (pixels_arr[:,:,0] > 150) & (pixels_arr[:,:,1] > 100) & (pixels_arr[:,:,2] > 80) & \
            (pixels_arr[:,:,0] > pixels_arr[:,:,2]) & (pixels_arr[:,:,1] < pixels_arr[:,:,0])
skin_pct = np.sum(skin_mask) / skin_mask.size * 100
print(f"  Warm/Skin-tone regions: {skin_pct:.1f}%")

# Final summary
print("\n=== COMPOSITION SUMMARY ===")
print(f"  Image dimensions: {W}x{H} ({W/H:.2f}:1 aspect ratio)")
print(f"  Dark content (outlines, text): ~{dark_pct:.0f}%")
print(f"  Vibrant colors (yellow, pink, teal, purple, green): ~{yellow_pct+pink_pct+teal_pct+purple_pct+green_pct:.0f}%")
print(f"  Light/white areas: ~{white_pct:.1f}%")
print(f"  Strong edge presence: {'Yes' if strong_edge_pct > 5 else 'No'} ({strong_edge_pct:.1f}%)")
