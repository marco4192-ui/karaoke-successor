#!/usr/bin/env python3
import os, re, glob

LOCALE_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'i18n', 'locales')

# key -> {locale: value}
TRANSLATIONS = {
    'mirrorRestart': {'de': 'Neustart', 'en': 'Restart', 'it': 'Riavvia', 'nl': 'Herstart', 'da': 'Genstart', 'sv': 'Starta om', 'pt': 'Reiniciar', 'fr': 'Redemarrer', 'ko': '다시 시작', 'zh': '重新开始', 'ru': 'Перезапуск', 'no': 'Start på nytt', 'pl': 'Uruchom ponownie', 'fi': 'Käynnistä uudelleen', 'es': 'Reiniciar', 'ja': '再生'},
    'mirrorPause': {'de': 'Pause', 'en': 'Pause', 'it': 'Pausa', 'nl': 'Pauze', 'da': 'Pause', 'sv': 'Pausa', 'pt': 'Pausar', 'fr': 'Pause', 'ko': '일시중지', 'zh': '暂停', 'ru': 'Пауза', 'no': 'Pause', 'pl': 'Pauza', 'fi': 'Tauko', 'es': 'Pausar', 'ja': '一時停止'},
    'mirrorPlay': {'de': 'Abspielen', 'en': 'Play', 'it': 'Riproduci', 'nl': 'Afspelen', 'da': 'Afspil', 'sv': 'Spela upp', 'pt': 'Reproduzir', 'fr': 'Lecture', 'ko': '재생', 'zh': '播放', 'ru': 'Воспроизвести', 'no': 'Spill av', 'pl': 'Odtwórz', 'fi': 'Toista', 'es': 'Reproducir', 'ja': '再生'},
    'mirrorSkip': {'de': 'Überspringen', 'en': 'Skip', 'it': 'Salta', 'nl': 'Overslaan', 'da': 'Spring over', 'sv': 'Hoppa över', 'pt': 'Pular', 'fr': 'Passer', 'ko': '건너뛰기', 'zh': '跳过', 'ru': 'Пропустить', 'no': 'Hopp over', 'pl': 'Pomiń', 'fi': 'Ohita', 'es': 'Saltar', 'ja': 'スキップ'},
    'mirrorResume': {'de': 'Fortfahren', 'en': 'Resume', 'it': 'Riprendi', 'nl': 'Hervatten', 'da': 'Fortsæt', 'sv': 'Återuppta', 'pt': 'Continuar', 'fr': 'Reprendre', 'ko': '계속', 'zh': '继续', 'ru': 'Продолжить', 'no': 'Fortsett', 'pl': 'Wznów', 'fi': 'Jatka', 'es': 'Continuar', 'ja': '再開'},
    'mirrorAbortSong': {'de': 'Song beenden', 'en': 'End Song', 'it': 'Fine brano', 'nl': 'Nummer beëindigen', 'da': 'Afslut sang', 'sv': 'Avsluta sång', 'pt': 'Encerrar música', 'fr': 'Terminer le morceau', 'ko': '노래 종료', 'zh': '结束歌曲', 'ru': 'Завершить песню', 'no': 'Avslutt sang', 'pl': 'Zakończ piosenkę', 'fi': 'Lopeta kappale', 'es': 'Terminar canción', 'ja': '曲を終了'},
    'mirrorPauseTitle': {'de': 'Pausiert', 'en': 'Paused', 'it': 'In pausa', 'nl': 'Gepauzeerd', 'da': 'Pauset', 'sv': 'Pausad', 'pt': 'Pausado', 'fr': 'En pause', 'ko': '일시중지', 'zh': '已暂停', 'ru': 'Пауза', 'no': 'Pauset', 'pl': 'Zapauzowane', 'fi': 'Tauko', 'es': 'En pausa', 'ja': '一時停止中'},
    'mirrorSongRunningWarning': {'de': 'Achtung: Ein Song läuft gerade!', 'en': 'Warning: A song is currently playing!', 'it': 'Attenzione: è in riproduzione un brano!', 'nl': 'Let op: er wordt nu een nummer afgespeeld!', 'da': 'Advarsel: En sang spilles lige nu!', 'sv': 'Varning: En låt spelas just nu!', 'pt': 'Atenção: Uma música está tocando!', 'fr': 'Attention : un morceau est en cours !', 'ko': '경고: 노래가 재생 중입니다!', 'zh': '注意：正在播放歌曲！', 'ru': 'Внимание: Песня сейчас играет!', 'no': 'Advarsel: En sang spilles nå!', 'pl': 'Uwaga: Piosenka jest teraz odtwarzana!', 'fi': 'Huom: Kappale on käynnissä!', 'es': '¡Atención: ¡Hay una canción en reproducción!', 'ja': '警告：曲が再生中です！'},
    'mirrorEndSong': {'de': 'Song beenden', 'en': 'End Song', 'it': 'Fine brano', 'nl': 'Nummer beëindigen', 'da': 'Afslut sang', 'sv': 'Avsluta sång', 'pt': 'Encerrar música', 'fr': 'Terminer', 'ko': '노래 종료', 'zh': '结束歌曲', 'ru': 'Завершить', 'no': 'Avslutt sang', 'pl': 'Zakończ piosenkę', 'fi': 'Lopeta kappale', 'es': 'Terminar canción', 'ja': '曲を終了'},
    'mirrorReleaseControlShort': {'de': 'Kontrolle abgeben', 'en': 'Release Control', 'it': 'Rilascia controllo', 'nl': 'Beheer loslaten', 'da': 'Frigør kontrol', 'sv': 'Släpp kontroll', 'pt': 'Liberar controle', 'fr': 'Libérer le contrôle', 'ko': '컨트롤 반환', 'zh': '释放控制', 'ru': 'Отпустить управление', 'no': 'Slipp kontroll', 'pl': 'Puść kontrolę', 'fi': 'Luovuta hallinta', 'es': 'Liberar control', 'ja': '操作を解除'},
    'mirrorSongRunningDesc': {'de': 'Während ein Song läuft, kann die Steuerung nicht verlassen werden.', 'en': 'While a song is playing, you cannot leave the controller.', 'it': 'Durante la riproduzione non puoi abbandonare il controllo.', 'nl': 'Tijdens het afspelen kun je de besturing niet verlaten.', 'da': 'Mens en sang spilles, kan du ikke forlade betjeningen.', 'sv': 'Under låtens uppspelning kan du inte lämna kontrollen.', 'pt': 'Enquanto uma música toca, você não pode abandonar o controle.', 'fr': 'Pendant la lecture, vous ne pouvez pas quitter le contrôle.', 'ko': '노래 재생 중에는 컨트롤을 반환할 수 없습니다.', 'zh': '歌曲播放期间无法释放控制。', 'ru': 'Пока играет песня, нельзя освободить управление.', 'no': 'Mens en sang spilles, kan du ikke slippe kontrollen.', 'pl': 'Podczas odtwarzania piosenki nie możesz opuścić kontroli.', 'fi': 'Kappaleen toiston aikana et voi luopua hallinnasta.', 'es': 'Mientras suena una canción, no puedes liberar el control.', 'ja': '曲再生中は操作を解除できません。'},
}

LOCALES = ['de', 'en', 'it', 'nl', 'da', 'sv', 'pt', 'fr', 'ko', 'zh', 'ru', 'no', 'pl', 'fi', 'es', 'ja']

# Known mirrorCancel values per locale (for matching)
CANCEL_VALUES = {
    'de': "'Abbrechen'", 'en': "'Cancel'", 'it': "'Annulla'", 'nl': "'Annuleren'",
    'da': "'Annuller'", 'sv': "'Avbryt'", 'pt': "'Cancelar'", 'fr': "'Annuler'",
    'ko': "'보기'", 'zh': "'取消'", 'ru': "'Отмена'", 'no': "'Avbryt'",
    'pl': "'Anuluj'", 'fi': "'Peruuta'", 'es': "'Cancelar'", 'ja': "'キャンセル'",
}

def fix_locale(locale):
    fpath = os.path.join(LOCALE_DIR, locale, 'mobile.ts')
    if not os.path.exists(fpath):
        print(f'  SKIP: {locale}/mobile.ts not found')
        return
    
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    cancel_val = CANCEL_VALUES.get(locale, '')
    if not cancel_val:
        print(f'  SKIP: {locale} - no cancel value known')
        return
    
    # Find broken mirrorCancel line: it should be exactly "  mirrorCancel: 'value',"
    # but the script broke it by inserting content after "  mirrorCancel:"
    correct_cancel_line = f"  mirrorCancel: {cancel_val},"
    
    # Check if already correct (no broken content)
    if correct_cancel_line in content:
        # Check if any of the new keys already exist
        has_new_keys = any(f'  {k}:' in content for k in TRANSLATIONS)
        if not has_new_keys:
            # Add new keys after mirrorCancel
            new_keys = '\n'.join(f"  {k}: '{TRANSLATIONS[k][locale]}'," for k in TRANSLATIONS)
            content = content.replace(correct_cancel_line, correct_cancel_line + '\n' + new_keys)
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'  Added translations to {locale}/mobile.ts')
            return
        else:
            print(f'  OK: {locale}/mobile.ts already has translations')
            return
    
    # Find the broken line using regex
    # The broken line starts with "  mirrorCancel:" but has extra content after the value
    pattern = r'(  mirrorCancel: ' + re.escape(cancel_val) + r',)[^\n]*'
    match = re.search(pattern, content)
    if match:
        new_keys = '\n'.join(f"  {k}: '{TRANSLATIONS[k][locale]}'," for k in TRANSLATIONS)
        replacement = correct_cancel_line + '\n' + new_keys
        content = content[:match.start()] + replacement + content[match.end():]
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  Fixed {locale}/mobile.ts')
        return
    
    print(f'  NO MATCH: {locale}/mobile.ts - manual check needed')

print('Fixing locale files...')
for locale in LOCALES:
    fix_locale(locale)
print('Done!')
