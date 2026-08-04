import os

fp = '/home/z/my-project/karaoke-successor/src/lib/i18n/locales/fr/mobile.ts'
with open(fp, 'rb') as f:
    data = f.read()

# The file has literal bytes: d, backslash, backslash, quote
# We want: d, backslash, quote
# In bytes: replace b'd\\\\"' with b'd\\"'

# Just replace the specific problematic sequences
data = data.replace(b"d\x5c\x5c'", b"d\x5c")  # d\\  ->  d\
data = data.replace(b"l\x5c\x5c'", b"l\x5c")  # l\\  ->  l\

with open(fp, 'wb') as f:
    f.write(data)

# Verify
with open(fp, 'rb') as f:
    data2 = f.read()
idx = data2.find(b'abord')
print('Result:', repr(data2[idx-15:idx+10]))

# Also check other problematic words
for word in [b'attente', b'ouvrir']:
    idx2 = data2.find(word)
    if idx2 >= 0:
        print(f'{word}:', repr(data2[idx2-5:idx2+5]))
