#!/usr/bin/env python3
"""
Region-specific color analysis to understand the layout and design elements.
"""
from PIL import Image
import numpy as np
from collections import Counter

filepath = '/home/z/my-project/upload/Gemini_Generated_Image_wekrdmwekrdmwekr.png'
img = Image.open(filepath).convert('RGB')
W, H = img.size

# Divide into meaningful regions
print("=== REGIONAL COLOR BREAKDOWN (6x4 grid) ===")
cols, rows = 6, 4
rw, rh = W // cols, H // rows

for r in range(rows):
    for c in range(cols):
        left = c * rw
        top = r * rh
        right = left + rw
        bottom = top + rh
        
        region = img.crop((left, top, right, bottom))
        small = region.resize((50, 50))
        quant = small.quantize(colors=6, method=Image.Quantize.MEDIANCUT)
        palette = quant.getpalette()
        counts = quant.getcolors()
        total = sum(ct for ct, _ in counts)
        
        colors_str = []
        for ct, idx in sorted(counts, key=lambda x: -x[0]):
            r_c = palette[idx*3]
            g_c = palette[idx*3+1]
            b_c = palette[idx*3+2]
            hex_c = f"#{r_c:02x}{g_c:02x}{b_c:02x}"
            pct = ct / total * 100
            colors_str.append(f"{hex_c}({pct:.0f}%)")
        
        print(f"  [{r},{c}] x:{left:4d}-{right:4d} y:{top:4d}-{bottom:4d}: {' | '.join(colors_str)}")

# Color density heatmap analysis
print("\n=== COLOR DENSITY MAP (where colors concentrate) ===")
pixels = np.array(img)

# Yellow density
yellow = ((pixels[:,:,0] > 200) & (pixels[:,:,1] > 180) & (pixels[:,:,2] < 80)).astype(np.uint8)
# Pink density  
pink = ((pixels[:,:,0] > 150) & (pixels[:,:,1] < 100) & (pixels[:,:,2] > 100)).astype(np.uint8)
# Teal density
teal = ((pixels[:,:,0] < 80) & (pixels[:,:,1] > 150) & (pixels[:,:,2] > 120)).astype(np.uint8)
# Black density
black = ((pixels[:,:,0] < 20) & (pixels[:,:,1] < 20) & (pixels[:,:,2] < 20)).astype(np.uint8)

grid_cols, grid_rows = 12, 8
cell_w, cell_h = W // grid_cols, H // grid_rows

print("  Yellow distribution:")
for row in range(grid_rows):
    line = "  "
    for col in range(grid_cols):
        cell = yellow[row*cell_h:(row+1)*cell_h, col*cell_w:(col+1)*cell_w]
        density = np.mean(cell) * 100
        if density > 20:
            line += "██"
        elif density > 10:
            line += "▓▓"
        elif density > 5:
            line += "░░"
        else:
            line += "··"
    print(line)

print("  Pink/Magenta distribution:")
for row in range(grid_rows):
    line = "  "
    for col in range(grid_cols):
        cell = pink[row*cell_h:(row+1)*cell_h, col*cell_w:(col+1)*cell_w]
        density = np.mean(cell) * 100
        if density > 15:
            line += "██"
        elif density > 7:
            line += "▓▓"
        elif density > 3:
            line += "░░"
        else:
            line += "··"
    print(line)

print("  Teal/Mint distribution:")
for row in range(grid_rows):
    line = "  "
    for col in range(grid_cols):
        cell = teal[row*cell_h:(row+1)*cell_h, col*cell_w:(col+1)*cell_w]
        density = np.mean(cell) * 100
        if density > 15:
            line += "██"
        elif density > 7:
            line += "▓▓"
        elif density > 3:
            line += "░░"
        else:
            line += "··"
    print(line)

print("  Black/Outline distribution:")
for row in range(grid_rows):
    line = "  "
    for col in range(grid_cols):
        cell = black[row*cell_h:(row+1)*cell_h, col*cell_w:(col+1)*cell_w]
        density = np.mean(cell) * 100
        if density > 20:
            line += "██"
        elif density > 10:
            line += "▓▓"
        elif density > 5:
            line += "░░"
        else:
            line += "··"
    print(line)

# Identify the main visual "mass" - where the content is
print("\n=== CONTENT DENSITY MAP ===")
gray = img.convert('L')
gray_arr = np.array(gray)

# Non-white, non-black content
content = ((gray_arr > 30) & (gray_arr < 240))
for row in range(grid_rows):
    line = "  "
    for col in range(grid_cols):
        cell = content[row*cell_h:(row+1)*cell_h, col*cell_w:(col+1)*cell_w]
        density = np.sum(cell) / cell.size * 100
        if density > 50:
            line += "██"
        elif density > 35:
            line += "▓▓"
        elif density > 20:
            line += "░░"
        else:
            line += "··"
    print(line)

print("  Legend: ██ = very dense, ▓▓ = moderate, ░░ = sparse, ·· = empty")
