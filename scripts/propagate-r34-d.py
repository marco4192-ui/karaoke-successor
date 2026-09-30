#!/usr/bin/env python3
"""R34-d: Propagates 10 i18n keys (companion device assignment) into 14 locales.

IMPORTANT FINDING vs. task description:
  In EN/DE the device* keys (incl. deviceMicCount) live in party.ts — but in the
  14 target languages deviceMicCount & ALL sibling device*/qr* keys live in
  delta.ts (R31 catch-up layer, merged LAST in index.ts via deepMerge).
  party.ts of these languages has a unifiedSetup object without any device keys.
  => The 9 unifiedSetup keys are inserted into delta.ts DIRECTLY AFTER
     `deviceMicCount` (the anchor named in the task), keeping the R34 keys
     together with their device* siblings. Barrel merge makes the location
     irrelevant to consumers (delta is merged last).
  mobile.profileAssignedToast goes into mobile.ts directly after
  `toastControlTaken` (anchor exists in all 14 mobile.ts, 2-space indent).
"""
import re, sys, pathlib

ROOT = pathlib.Path('/home/z/my-project/src/lib/i18n/locales')
LANGS = ['es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi']

PARTY_KEYS = ['deviceConnect', 'assignDevicesTitle', 'assignDeviceNoClients',
              'assignDeviceToPlayer', 'assignDeviceUnassigned', 'assignDeviceAssignedTo',
              'assignDeviceQrHint', 'assignDeviceDone', 'assignDeviceError']

# Terminologie kalibriert am Sprachbestand (delta.ts device*/qr*-Keys, mobile.ts):
# Companion-App aus deviceCompanion, QR-Code + Telefon aus qrWlanHint, Zuweisen aus
# singingDeviceAssignment/deviceNeedExclusive, Profil aus Stock, Register aus mobile.ts.
V = {
 'es': dict(
    deviceConnect="Conectar…",
    assignDevicesTitle="Dispositivos conectados",
    assignDeviceNoClients="Aún no hay ningún dispositivo conectado — abre la App Compañera en un teléfono o escanea el código QR.",
    assignDeviceToPlayer="Asignar",
    assignDeviceUnassigned="sin perfil",
    assignDeviceAssignedTo="asignado a: {name}",
    assignDeviceQrHint="O escanea el código QR: el teléfono inicia sesión directamente como {name} y canta por este jugador.",
    assignDeviceDone="Asignado ✓",
    assignDeviceError="La asignación ha fallado — inténtalo de nuevo",
    profileAssignedToast="Ahora cantas como {name} 🎤"),
 'fr': dict(
    deviceConnect="Connecter…",
    assignDevicesTitle="Appareils connectés",
    assignDeviceNoClients="Aucun appareil connecté pour l'instant — ouvrez l'App Compagnon sur un téléphone ou scannez le QR code.",
    assignDeviceToPlayer="Assigner",
    assignDeviceUnassigned="sans profil",
    assignDeviceAssignedTo="assigné à : {name}",
    assignDeviceQrHint="Ou scannez le QR code : le téléphone s'identifie directement en tant que {name} et chante pour ce joueur.",
    assignDeviceDone="Assigné ✓",
    assignDeviceError="L'assignation a échoué — veuillez réessayer",
    profileAssignedToast="Vous chantez désormais en tant que {name} 🎤"),
 'it': dict(
    deviceConnect="Connetti…",
    assignDevicesTitle="Dispositivi connessi",
    assignDeviceNoClients="Nessun dispositivo ancora connesso — apri l'App Companion su un telefono o scansiona il QR code.",
    assignDeviceToPlayer="Assegna",
    assignDeviceUnassigned="senza profilo",
    assignDeviceAssignedTo="assegnato a: {name}",
    assignDeviceQrHint="Oppure scansiona il QR code: il telefono accede direttamente come {name} e canta per questo giocatore.",
    assignDeviceDone="Assegnato ✓",
    assignDeviceError="Assegnazione non riuscita — riprova",
    profileAssignedToast="Ora canti come {name} 🎤"),
 'pt': dict(
    deviceConnect="Conectar…",
    assignDevicesTitle="Dispositivos conectados",
    assignDeviceNoClients="Nenhum dispositivo conectado ainda — abra o App Companion no celular ou escaneie o QR code.",
    assignDeviceToPlayer="Atribuir",
    assignDeviceUnassigned="sem perfil",
    assignDeviceAssignedTo="atribuído a: {name}",
    assignDeviceQrHint="Ou escaneie o QR code: o celular entra diretamente como {name} e canta por este jogador.",
    assignDeviceDone="Atribuído ✓",
    assignDeviceError="Falha na atribuição — tente novamente",
    profileAssignedToast="Agora você canta como {name} 🎤"),
 'ja': dict(
    deviceConnect="接続…",
    assignDevicesTitle="接続済みデバイス",
    assignDeviceNoClients="まだデバイスが接続されていません — スマホでコンパニオンアプリを開くか、QRコードをスキャンしてください。",
    assignDeviceToPlayer="割り当て",
    assignDeviceUnassigned="プロフィールなし",
    assignDeviceAssignedTo="割り当て先：{name}",
    assignDeviceQrHint="またはQRコードをスキャン：スマホが{name}として直接ログインし、このプレイヤーの代わりに歌います。",
    assignDeviceDone="割り当て済み ✓",
    assignDeviceError="割り当てに失敗しました — もう一度お試しください",
    profileAssignedToast="今は{name}として歌います 🎤"),
 'ko': dict(
    deviceConnect="연결…",
    assignDevicesTitle="연결된 기기",
    assignDeviceNoClients="아직 연결된 기기가 없어요 — 휴대폰에서 컴패니언 앱을 열거나 QR 코드를 스캔해 주세요.",
    assignDeviceToPlayer="배정",
    assignDeviceUnassigned="프로필 없음",
    assignDeviceAssignedTo="배정됨: {name}",
    assignDeviceQrHint="또는 QR 코드를 스캔하세요: 휴대폰이 {name}(으)로 바로 로그인해서 이 플레이어 대신 노래해요.",
    assignDeviceDone="배정됨 ✓",
    assignDeviceError="배정에 실패했어요 — 다시 시도해 주세요",
    profileAssignedToast="이제 {name}(으)로 노래해요 🎤"),
 'zh': dict(
    deviceConnect="连接…",
    assignDevicesTitle="已连接的设备",
    assignDeviceNoClients="还没有已连接的设备——在手机上打开伴侣应用或扫描二维码。",
    assignDeviceToPlayer="分配",
    assignDeviceUnassigned="无档案",
    assignDeviceAssignedTo="已分配给：{name}",
    assignDeviceQrHint="或扫描二维码：手机会直接以 {name} 的身份登录，替这位玩家演唱。",
    assignDeviceDone="已分配 ✓",
    assignDeviceError="分配失败——请重试",
    profileAssignedToast="你现在以 {name} 的身份演唱 🎤"),
 'ru': dict(
    deviceConnect="Подключить…",
    assignDevicesTitle="Подключённые устройства",
    assignDeviceNoClients="Подключённых устройств пока нет — откройте приложение-компаньон на телефоне или отсканируйте QR-код.",
    assignDeviceToPlayer="Назначить",
    assignDeviceUnassigned="без профиля",
    assignDeviceAssignedTo="назначено игроку: {name}",
    assignDeviceQrHint="Или отсканируйте QR-код: телефон войдёт напрямую как {name} и будет петь за этого игрока.",
    assignDeviceDone="Назначено ✓",
    assignDeviceError="Не удалось назначить — попробуйте ещё раз",
    profileAssignedToast="Теперь вы поёте как {name} 🎤"),
 'nl': dict(
    deviceConnect="Verbinden…",
    assignDevicesTitle="Verbonden apparaten",
    assignDeviceNoClients="Nog geen apparaat verbonden — open de Companion App op een telefoon of scan de QR-code.",
    assignDeviceToPlayer="Toewijzen",
    assignDeviceUnassigned="zonder profiel",
    assignDeviceAssignedTo="toegewezen aan: {name}",
    assignDeviceQrHint="Of scan de QR-code: de telefoon logt direct in als {name} en zingt voor deze speler.",
    assignDeviceDone="Toegewezen ✓",
    assignDeviceError="Toewijzen mislukt — probeer het opnieuw",
    profileAssignedToast="Je zingt nu als {name} 🎤"),
 'pl': dict(
    deviceConnect="Połącz…",
    assignDevicesTitle="Połączone urządzenia",
    assignDeviceNoClients="Nie podłączono jeszcze żadnego urządzenia — otwórz Aplikację kompana na telefonie lub zeskanuj kod QR.",
    assignDeviceToPlayer="Przypisz",
    assignDeviceUnassigned="bez profilu",
    assignDeviceAssignedTo="przypisane do: {name}",
    assignDeviceQrHint="Albo zeskanuj kod QR: telefon zaloguje się bezpośrednio jako {name} i zaśpiewa za tego gracza.",
    assignDeviceDone="Przypisano ✓",
    assignDeviceError="Przypisanie nie powiodło się — spróbuj ponownie",
    profileAssignedToast="Śpiewasz teraz jako {name} 🎤"),
 'sv': dict(
    deviceConnect="Anslut…",
    assignDevicesTitle="Anslutna enheter",
    assignDeviceNoClients="Ingen enhet ansluten ännu — öppna Companion-appen på en telefon eller skanna QR-koden.",
    assignDeviceToPlayer="Tilldela",
    assignDeviceUnassigned="utan profil",
    assignDeviceAssignedTo="tilldelad: {name}",
    assignDeviceQrHint="Eller skanna QR-koden: telefonen loggar in direkt som {name} och sjunger för den här spelaren.",
    assignDeviceDone="Tilldelad ✓",
    assignDeviceError="Tilldelningen misslyckades — försök igen",
    profileAssignedToast="Du sjunger nu som {name} 🎤"),
 'no': dict(
    deviceConnect="Koble til…",
    assignDevicesTitle="Tilkoblede enheter",
    assignDeviceNoClients="Ingen enhet tilkoblet ennå — åpne Companion-appen på en telefon eller skann QR-koden.",
    assignDeviceToPlayer="Tilordne",
    assignDeviceUnassigned="uten profil",
    assignDeviceAssignedTo="tilordnet: {name}",
    assignDeviceQrHint="Eller skann QR-koden: telefonen logger inn direkte som {name} og synger for denne spilleren.",
    assignDeviceDone="Tilordnet ✓",
    assignDeviceError="Tilordningen mislyktes — prøv igjen",
    profileAssignedToast="Du synger nå som {name} 🎤"),
 'da': dict(
    deviceConnect="Tilslut…",
    assignDevicesTitle="Tilsluttede enheder",
    assignDeviceNoClients="Ingen enhed tilsluttet endnu — åbn Companion-appen på en telefon eller scan QR-koden.",
    assignDeviceToPlayer="Tildel",
    assignDeviceUnassigned="uden profil",
    assignDeviceAssignedTo="tildelt: {name}",
    assignDeviceQrHint="Eller scan QR-koden: telefonen logger direkte ind som {name} og synger for denne spiller.",
    assignDeviceDone="Tildelt ✓",
    assignDeviceError="Tildelingen mislykkedes — prøv igen",
    profileAssignedToast="Du synger nu som {name} 🎤"),
 'fi': dict(
    deviceConnect="Yhdistä…",
    assignDevicesTitle="Yhdistetyt laitteet",
    assignDeviceNoClients="Yhtään laitetta ei ole vielä yhdistetty — avaa Companion-sovellus puhelimessa tai skannaa QR-koodi.",
    assignDeviceToPlayer="Osoita",
    assignDeviceUnassigned="ilman profiilia",
    assignDeviceAssignedTo="osoitettu: {name}",
    assignDeviceQrHint="Tai skannaa QR-koodi: puhelin kirjautuu suoraan käyttäjänä {name} ja laulaa tämän pelaajan puolesta.",
    assignDeviceDone="Osoitettu ✓",
    assignDeviceError="Osoittaminen epäonnistui — yritä uudelleen",
    profileAssignedToast="Laulat nyt käyttäjänä {name} 🎤"),
}

COMMENT = '    // ── R34: assign companion device (players not connected yet) ──'

def insert_after(lines, anchor_re, new_lines, must_not_contain):
    idxs = [i for i, l in enumerate(lines) if re.match(anchor_re, l)]
    if len(idxs) != 1:
        raise SystemExit(f'ANCHOR-FAIL: {anchor_re} matched {len(idxs)} lines')
    present = [k for k in must_not_contain if any(re.match(rf'\s*{k}:["\']', l) for l in lines)]
    if present:
        raise SystemExit(f'IDEMPOTENCY-FAIL: keys already present: {present}')
    at = idxs[0] + 1
    return lines[:at] + new_lines + lines[at:], at

def main():
    errors = []
    for lang in LANGS:
        v = V[lang]
        # sanity: all 10 keys, {name} placeholders exactly once where required
        for k in ('assignDeviceAssignedTo', 'assignDeviceQrHint', 'profileAssignedToast'):
            if v[k].count('{name}') != 1:
                errors.append(f'{lang}: {k} has {v[k].count("{name}")} placeholders')
        # ── delta.ts: 9 unifiedSetup keys after deviceMicCount ──
        dpath = ROOT / lang / 'delta.ts'
        dlines = dpath.read_text(encoding='utf-8').split('\n')
        m = re.match(r'^(\s*)deviceMicCount:', dlines[[i for i, l in enumerate(dlines) if re.match(r'^\s*deviceMicCount:', l)][0]])
        indent = m.group(1)
        block = [COMMENT] + [f'{indent}{k}: "{v[k]}",' for k in PARTY_KEYS]
        dlines, at = insert_after(dlines, r'^(\s*)deviceMicCount:', block,
                                  [rf'\s*{k}:' for k in PARTY_KEYS])
        dpath.write_text('\n'.join(dlines), encoding='utf-8')
        # ── mobile.ts: profileAssignedToast after toastControlTaken ──
        mpath = ROOT / lang / 'mobile.ts'
        mlines = mpath.read_text(encoding='utf-8').split('\n')
        am = re.match(r'^(\s*)toastControlTaken:', mlines[[i for i, l in enumerate(mlines) if re.match(r'^\s*toastControlTaken:', l)][0]])
        mind = am.group(1)
        mlines, mat = insert_after(mlines, r'^(\s*)toastControlTaken:',
                                   [f'{mind}profileAssignedToast: \'{v["profileAssignedToast"]}\','],
                                   [r'\s*profileAssignedToast:'])
        mpath.write_text('\n'.join(mlines), encoding='utf-8')
        print(f'{lang}: delta.ts +{len(block)} lines after line {at} (deviceMicCount), '
              f'mobile.ts +1 line after line {mat} (toastControlTaken)')
    if errors:
        print('ERRORS:'); [print(' -', e) for e in errors]; sys.exit(1)
    print('DONE: 14 languages x 10 keys inserted.')

if __name__ == '__main__':
    main()
