#!/usr/bin/env python3
import os, re

LOCALE_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'i18n', 'locales')

CANCEL_VALUES = {
    'de': "'Abbrechen'", 'en': "'Cancel'", 'it': "'Annulla'", 'nl': "'Annuleren'",
    'da': "'Annuller'", 'sv': "'Avbryt'", 'pt': "'Cancelar'", 'fr': "'Annuler'",
    'ko': "'보기'", 'zh': "'取消'", 'ru': "'Отмена'", 'no': "'Avbryt'",
    'pl': "'Anuluj'", 'fi': "'Peruuta'", 'es': "'Cancelar'", 'ja': "'キャンセル"",
}

LOCALES = ['de', 'en', 'it', 'nl', 'da', 'sv', 'pt', 'fr', 'ko', 'zh', 'ru', 'no', 'pl', 'fi', 'es', 'ja']

for locale in LOCALES:
    fpath = os.path.join(LOCALE_DIR, locale, 'mobile.ts')
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    cancel_val = CANCEL_VALUES.get(locale)
    if not cancel_val:
        continue
    
    # Fix 1: mirrorCancel: without value -> restore it
    content = re.sub(
        r'  mirrorCancel:\s*\n',
        f'  mirrorCancel: {cancel_val},\n',
        content
    )
    
    # Fix 2: mirrorRestart: 'value', 'orphaned_cancel_value', -> remove orphan
    content = re.sub(
        f"(  mirrorRestart: '[^']*',) {re.escape(cancel_val)},",
        r'\1',
        content
    )
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  Fixed {locale}/mobile.ts')

print('Done!')
