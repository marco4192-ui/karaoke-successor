/**
 * R55 — DuckDNS + Let's Encrypt: ECHTES HTTPS-Zertifikat ohne Hand-Installation.
 *
 * Nutzer-Feedback auf die R54-Lösung (Root-CA pro Handy installieren):
 * „Die Zertifikatsinstallation ist ziemlich komplex — gibt es nicht eine
 * einfachere Lösung? Ein kostenloses TLS-Zertifikat, dass das Handy schon
 * kennt und dem es automatisch vertraut?"
 *
 * Lösung: Kostenlose DuckDNS-Subdomain (z. B. mein-karaoke.duckdns.org) +
 * Let's-Encrypt-Zertifikat via DNS-01-Challenge:
 *   1. Nutzer registriert sich EINMAL auf duckdns.org (Google/GitHub-Login,
 *      kostenlos), legt eine Subdomain an und trägt Subdomain + Token in den
 *      Desktop-Settings ein. (~2 Minuten, EINMALIG für den ganzen Haushalt)
 *   2. Dieses Modul holt automatisch ein echtes Let's-Encrypt-Zertifikat:
 *      - DNS-01-Challenge: TXT-Record _acme-challenge.<sub>.duckdns.org wird
 *        über die DuckDNS-API gesetzt (funktioniert hinter NAT/Firewall —
 *        anders als HTTP-01 braucht es KEINEN vom Internet erreichbaren Port).
 *      - Der A-Record der Subdomain zeigt auf die LAN-IP des Servers —
 *        der gesamte Datenverkehr (Audio-Pitch, Socket.IO, Chunks) bleibt
 *        im Heimnetzwerk, nur die Zertifikats-Ausstellung geht ins Internet.
 *   3. Jedes Handy vertraut dem Zertifikat AUTOMATISCH (Let's Encrypt ist
 *      in jedem Browser/OS vorinstalliert) — keine Installation, keine
 *      Warnung, keine „Erweitert → Weiter"-Klicks.
 *   4. Erneuerung (alle ~60 Tage) + DNS-Sync (IP-Wechsel) laufen automatisch.
 *
 * WICHTIG — Zwei Modul-Graphen: server.ts (tsx) und die Next-API-Routes
 * laden diese Datei als GETRENNTE Modul-Instanzen. Aller veränderlicher
 * In-Memory-State (Issue-Lock, Swap-Handler, Timer) ist deshalb auf
 * globalThis verankert — dasselbe Muster wie mobile-state/socketio-server
 * („Shared state is safe: anchor everything on globalThis").
 * Persistenter State liegt in certs/https-domain.json + certs/le-*.pem
 * (Dateisystem = beide Graphen lesen dasselbe).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { promises as dnsPromises } from 'dns';
import { networkInterfaces } from 'os';
import { join } from 'path';

// ===================== Typen =====================

export interface LeCertBundle {
  /** Zertifikats-Kette (Leaf + Intermediate) als PEM. */
  cert: string;
  /** Private Key des Leaf als PEM. */
  key: string;
  /** Ablaufdatum (ISO 8601). */
  expiresAt: string;
  /** Domain, für die das Zertifikat ausgestellt ist. */
  domain: string;
}

export interface HttpsDomainStatus {
  /** DuckDNS eingerichtet? */
  configured: boolean;
  /** Konfigurierte Domain (z. B. mein-karaoke.duckdns.org) — ohne Token! */
  domain: string | null;
  /** Zertifikats-Ausstellung läuft gerade. */
  issuing: boolean;
  /** Gültiges Let's-Encrypt-Zertifikat vorhanden? */
  certActive: boolean;
  /** Ablaufdatum des Zertifikats (ISO 8601). */
  certExpiresAt: string | null;
  /** Letzter Fehler bei Ausstellung/DNS-Sync (für die Settings-UI). */
  lastError: string | null;
  /** LAN-IP, auf die der DNS-A-Record zuletzt gesetzt wurde. */
  dnsIp: string | null;
  /** Wann der DNS-A-Record zuletzt synchronisiert wurde (ISO 8601). */
  lastSyncAt: string | null;
}

interface DomainStateFile {
  domain: string;
  token: string;
  lastIssuedAt?: string;
  lastError?: string;
  dnsIp?: string;
  lastSyncAt?: string;
  /** Letzter Ausstellungs-Versuch (ISO 8601) — persistierter Retry-Schutz
   * über Server-Neustarts hinweg (LE-Limit: 5 fehlgeschlagene Validierungen
   * pro Account/Domain/Stunde). */
  lastAttemptIso?: string;
}

// ===================== globalThis-Anker (zwei Modul-Graphen!) =====================

interface HttpsDomainShared {
  issuing: boolean;
  lastAttemptAt: number;
  swapHandlers: Array<(bundle: LeCertBundle) => void>;
  maintenanceTimer: ReturnType<typeof setInterval> | null;
  dnsSyncTimer: ReturnType<typeof setInterval> | null;
}

const sharedAnchor = globalThis as typeof globalThis & { __karaokeHttpsDomainShared?: HttpsDomainShared };

function shared(): HttpsDomainShared {
  if (!sharedAnchor.__karaokeHttpsDomainShared) {
    sharedAnchor.__karaokeHttpsDomainShared = {
      issuing: false,
      lastAttemptAt: 0,
      swapHandlers: [],
      maintenanceTimer: null,
      dnsSyncTimer: null,
    };
  }
  return sharedAnchor.__karaokeHttpsDomainShared;
}

// ===================== Datei-Ablage =====================

function certsDir(): string {
  return process.env.KARAOKE_CERTS_DIR || join(process.cwd(), 'certs');
}

const STATE_FILE = 'https-domain.json';
const LE_CERT_FILE = 'le-cert.pem';
const LE_KEY_FILE = 'le-key.pem';
const LE_META_FILE = 'le-meta.json';
const ACME_ACCOUNT_FILE = 'acme-account.pem';

/** Domain-State lesen (token bleibt serverseitig — niemals in Status/API!). */
export function readDomainState(): DomainStateFile | null {
  try {
    const p = join(certsDir(), STATE_FILE);
    if (!existsSync(p)) return null;
    const raw = JSON.parse(readFileSync(p, 'utf8')) as Partial<DomainStateFile>;
    if (typeof raw.domain !== 'string' || !raw.domain) return null;
    if (typeof raw.token !== 'string' || !raw.token) return null;
    return {
      domain: raw.domain,
      token: raw.token,
      lastIssuedAt: raw.lastIssuedAt,
      lastError: raw.lastError,
      dnsIp: raw.dnsIp,
      lastSyncAt: raw.lastSyncAt,
      lastAttemptIso: raw.lastAttemptIso,
    };
  } catch {
    return null;
  }
}

function writeDomainState(state: DomainStateFile): void {
  const dir = certsDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, STATE_FILE), JSON.stringify(state, null, 2));
}

/**
 * Domain-Eingabe normalisieren. Akzeptiert „mein-karaoke" (wird zu
 * mein-karaoke.duckdns.org ergänzt) und die vollständige Domain. Nur
 * *.duckdns.org wird unterstützt (DNS-01 läuft über die DuckDNS-API) —
 * alles andere wirft mit einer klaren Meldung.
 */
export function normalizeDuckDomain(input: string): string {
  let d = (input || '').trim().toLowerCase();
  if (!d) throw new Error('EMPTY_DOMAIN');
  if (!d.includes('.')) d += '.duckdns.org';
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.duckdns\.org$/.test(d)) {
    throw new Error('INVALID_DOMAIN');
  }
  return d;
}

/** DuckDNS-Tokens sind UUIDs — Grob-Check gegen Tippfehler. */
function isValidToken(token: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((token || '').trim());
}

/** Subdomain-Teil ohne .duckdns.org (so will es die DuckDNS-API). */
function duckSub(domain: string): string {
  return domain.replace(/\.duckdns\.org$/, '');
}

// ===================== LAN-IP-Auswahl =====================

/** Bevorzugte LAN-IPv4 (192.168.* > 10.* > 172.16-31.* > erste) — für den DNS-A-Record. */
export function pickLanIp(): string | null {
  const ips: string[] = [];
  try {
    const nets = networkInterfaces();
    for (const list of Object.values(nets)) {
      for (const net of list ?? []) {
        if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
      }
    }
  } catch { /* keine Netzwerk-Infos — DNS-Sync nicht möglich */ }
  if (!ips.length) return null;
  const pref = ips.find(ip => ip.startsWith('192.168.'))
    ?? ips.find(ip => ip.startsWith('10.'))
    ?? ips.find(ip => /^172\.(1[6-9]|2\d|3[01])\./.test(ip));
  return pref ?? ips[0];
}

// ===================== DuckDNS-API =====================

/** DuckDNS-Update-API aufrufen — wirft bei „KO" (falscher Token/Subdomain).
 *
 * TXT-Aufrufe (DNS-01) erfolgen OHNE ip-Parameter — genau das Muster, das das
 * gesamte Let's-Encrypt-Ökosystem für DuckDNS verwendet (acme.sh-Plugin
 * dns_duckdns, lego-Provider):
 *   TXT setzen:    ?domains=<sub>&token=<t>&txt=<wert>
 *   TXT entfernen: ?domains=<sub>&token=<t>&txt=&clear=true
 *
 * R57-FIX: R55 ÜBERGAB ip und txt in EINEM Aufruf — DuckDNS antwortete zwar
 * „OK", legte den TXT-Record aber nie an. Folge war der Nutzer-Fehler
 * „No TXT records found for name: _acme-challenge.<sub>.duckdns.org"
 * (acme-client/src/verify.js). A-Record-Aufrufe (ip) laufen separat über
 * syncDnsRecord(). Leere Werte (txt=) werden explizit gesendet — nur
 * undefined wird ausgelassen.
 */
async function duckDnsUpdate(params: Record<string, string | undefined>): Promise<void> {
  const url = new URL('https://www.duckdns.org/update');
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const text = (await res.text()).trim().toUpperCase();
  if (!text.startsWith('OK')) {
    throw new Error('DUCKDNS_REJECTED');
  }
}

/**
 * Warten, bis der TXT-Record im öffentlichen DNS sichtbar ist (R57).
 *
 * acme-client auto() prüft die Challenge selbst (src/verify.js) mit dem
 * System-Resolver — dessen NEGATIV-Cache (NXDOMAIN) kann nach vorherigen
 * Fehlversuchen mehrere Minuten lang eine frisch gesetzte TXT „unsichtbar"
 * halten. Wir pollen deshalb VOR der Rückkehr aus challengeCreateFn über
 * explizit abgefragte öffentliche Resolver (8.8.8.8, 1.1.1.1) und geben
 * erst weiter, wenn der Record dort live ist. acme-clients eigener Verify
 * hat dann zusätzlich einen Authoritative-NS-Fallback (verify.js:107).
 */
async function waitForTxtRecord(name: string, expected: string, timeoutMs: number): Promise<void> {
  const resolver = new dnsPromises.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const records = await resolver.resolveTxt(name);
      const flat = records.map(chunks => chunks.join(''));
      if (flat.includes(expected)) return;
    } catch { /* noch nicht sichtbar — weiterpollen */ }
    if (Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, 4000));
  }
  throw new Error('DUCKDNS_TXT_NOT_VISIBLE');
}

/**
 * DNS-A-Record der Domain auf die aktuelle LAN-IP setzen. Muss nach
 * WLAN-/IP-Wechsel laufen, damit die Handys den Server erreichen (der
 * A-Record zeigt sonst auf die alte IP). DuckDNS-Domains laufen aus, wenn
 * sie 30 Tage nicht aktualisiert werden — der stündliche Sync (siehe
 * startMaintenance) hält sie automatisch aktiv.
 */
export async function syncDnsRecord(): Promise<string> {
  const state = readDomainState();
  if (!state) throw new Error('NOT_CONFIGURED');
  const ip = pickLanIp();
  if (!ip) throw new Error('NO_LAN_IP');
  await duckDnsUpdate({ domains: duckSub(state.domain), token: state.token, ip });
  writeDomainState({ ...state, dnsIp: ip, lastSyncAt: new Date().toISOString() });
  return ip;
}

/** true, wenn der letzte Ausstellungs-Versuch vor kurzem FEHLGESCHLAGEN ist
 * (persistiert in https-domain.json — schützt vor Boot-/Maintenance-Loops,
 * die Let's Encrypts Limit von 5 fehlgeschlagenen Validierungen pro Stunde
 * erschöpfen würden). */
function recentlyFailed(withinMs: number): boolean {
  const state = readDomainState();
  if (!state || !state.lastError) return false;
  if (!state.lastAttemptIso) return false;
  const ts = Date.parse(state.lastAttemptIso);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < withinMs;
}

// ===================== Let's-Encrypt-Zertifikat laden/speichern =====================

/**
 * acme-client laden (CJS/ESM-Interop wie node-forge in server.ts: dynamischer
 * Import + .default-Fallback). Läuft in BEIDEN Modul-Graphen (tsx/server.ts
 * und Next-API-Routes) sowie im esbuild-Produktions-Bundle.
 */
async function importAcme(): Promise<typeof import('acme-client') | null> {
  try {
    const imported = (await import('acme-client')) as unknown as
      Partial<typeof import('acme-client')> & { default?: unknown };
    const candidate = (imported.Client ? imported : (imported.default ?? imported)) as typeof import('acme-client');
    return candidate.Client ? candidate : null;
  } catch {
    return null;
  }
}

/**
 * Gültiges LE-Zertifikat von Platte laden (falls vorhanden, zur konfigurierten
 * Domain passend und noch mindestens 2 Tage gültig), sonst null.
 */
export function getLeBundle(): LeCertBundle | null {
  const state = readDomainState();
  if (!state) return null;
  try {
    const dir = certsDir();
    const certPath = join(dir, LE_CERT_FILE);
    const keyPath = join(dir, LE_KEY_FILE);
    const metaPath = join(dir, LE_META_FILE);
    if (!existsSync(certPath) || !existsSync(keyPath) || !existsSync(metaPath)) return null;
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as { domain?: string; expiresAt?: string };
    if (meta.domain !== state.domain) return null;
    if (!meta.expiresAt) return null;
    if (Date.parse(meta.expiresAt) - Date.now() < 2 * 24 * 60 * 60 * 1000) return null;
    return {
      cert: readFileSync(certPath, 'utf8'),
      key: readFileSync(keyPath, 'utf8'),
      expiresAt: meta.expiresAt,
      domain: meta.domain,
    };
  } catch {
    return null;
  }
}

/** ACME-Account-Key laden oder einmalig erzeugen (stabil über alle Ausstellungen). */
async function loadOrCreateAccountKey(): Promise<string> {
  const dir = certsDir();
  const p = join(dir, ACME_ACCOUNT_FILE);
  try {
    if (existsSync(p)) return readFileSync(p, 'utf8');
  } catch { /* neu erzeugen */ }
  const acme = await importAcme();
  if (!acme) throw new Error('ACME_CLIENT_UNAVAILABLE');
  // acme-client liefert einen Buffer (PrivateKeyBuffer) — PEM-String für
  // Persistenz + acme.Client-AccountKey (akzeptiert String wie Buffer).
  const keyBuffer = await acme.crypto.createPrivateKey(2048);
  const pem = Buffer.isBuffer(keyBuffer) ? keyBuffer.toString('utf8') : String(keyBuffer);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(p, pem);
  } catch { /* Persistenz best effort — ohne sie wird der Key pro Ausstellung neu erzeugt */ }
  return pem;
}

// ===================== Zertifikats-Ausstellung (ACME / DNS-01) =====================

/**
 * Let's-Encrypt-Zertifikat für die konfigurierte Domain ausstellen.
 * Läuft synchron (10–60 s: CSR, TXT-Record setzen, ACME-Validierung,
 * Finalize) und wirft bei Misserfolg mit technischer Fehlermeldung
 * (letzter Fehler landet zusätzlich in https-domain.json → Settings-UI).
 *
 * Erfolgreiche Ausstellungen benachrichtigen alle registrierten Swap-Handler
 * (server.ts: httpsServer.setSecureContext — laufende Verbindungen bleiben
 * bestehen, neue bekommen das echte Zertifikat).
 */
export async function issueCertificate(options?: { force?: boolean }): Promise<LeCertBundle> {
  const s = shared();
  if (s.issuing) throw new Error('ALREADY_ISSUING');
  const state = readDomainState();
  if (!state) throw new Error('NOT_CONFIGURED');
  // Rate-Limit-Schutz: Let's Encrypt sperrt nach 5 fehlgeschlagenen
  // Validierungen pro Account/Domain/Stunde — mindestens 60 s Abstand
  // (in-memory) und 10 min nach dem letzten FEHLGESCHLAGENEN Versuch
  // (persistiert — schützt auch über Server-Neustarts hinweg, z. B. gegen
  // Dev-Boot-Loops). force = manuelle Aktivierung über die Settings-UI.
  if (!options?.force) {
    if (Date.now() - s.lastAttemptAt < 60_000) {
      throw new Error('RATE_LIMITED_RETRY_LATER');
    }
    if (recentlyFailed(10 * 60 * 1000)) {
      throw new Error('RATE_LIMITED_RETRY_LATER');
    }
  }
  s.issuing = true;
  s.lastAttemptAt = Date.now();
  // Versuch persistieren (Cooldown-Grundlage für Boot/Maintenance).
  try {
    writeDomainState({ ...state, lastAttemptIso: new Date().toISOString() });
  } catch { /* State-Datei nicht schreibbar — in-memory-Guard greift weiterhin */ }

  // Der eigentliche Flow läuft als eigenständiges Promise — auch dann weiter,
  // wenn der aufrufende HTTP-Request bereits mit ISSUE_TIMEOUT geantwortet
  // hat (R57: „Todesliste“-Feedback — kein Endlos-Spinner ohne Feedback mehr,
  // aber ein Späterfolg wird trotzdem persistiert + live geswappt).
  const flow: Promise<LeCertBundle> = (async () => {
    try {
      // 1) DNS-A-Record auf die aktuelle LAN-IP synchronisieren (best effort —
      //    für die Ausstellung selbst nicht nötig, aber der Nutzer erwartet,
      //    dass nach dem Setup sofort alles greift).
      let dnsIp: string | null = null;
      try {
        dnsIp = await syncDnsRecord();
      } catch { /* A-Record-Fehler soll die Zertifikats-Ausstellung nicht blockieren */ }

      // 2) ACME-Flow (acme-client.auto: Account, Order, DNS-01-Challenge,
      //    Validierung, Finalize, Chain-Download — battle-tested).
      const acme = await importAcme();
      if (!acme) throw new Error('ACME_CLIENT_UNAVAILABLE');
      const directoryUrl = process.env.KARAOKE_ACME_DIRECTORY
        || acme.directory.letsencrypt.production;
      const accountKey = await loadOrCreateAccountKey();
      const client = new acme.Client({
        directoryUrl,
        accountKey,
        // R57: Retry-Backoff begrenzen. acme-clients Standard (10 Versuche,
        // bis 30 s Abstand) führte beim Nutzer zu einem ~5-Minuten-Marathon
        // ohne Feedback. Mit TXT-Poll in challengeCreateFn wird der Verify
        // ohnehin im ersten Versuch bestehen — das Cap ist reine Sicherheit.
        backoffAttempts: 4,
        backoffMin: 5000,
        backoffMax: 20000,
      });
      // createCsr liefert [PrivateKeyBuffer (Buffer), CsrBuffer] — Key als
      // PEM-String für Persistenz/LeCertBundle/setSecureContext.
      const [csrKeyBuf, csr] = await acme.crypto.createCsr({ commonName: state.domain });
      const csrKey = Buffer.isBuffer(csrKeyBuf) ? csrKeyBuf.toString('utf8') : String(csrKeyBuf);
      const cert = await client.auto({
        csr,
        termsOfServiceAgreed: true,
        challengePriority: ['dns-01'],
        challengeCreateFn: async (_authz, _challenge, keyAuthorization) => {
          // TXT-ONLY-Aufruf OHNE ip (acme.sh/lego-Muster — siehe
          // duckDnsUpdate). keyAuthorization ist für dns-01 bereits
          // base64url(sha256(...)) — acme-client hasht in
          // getChallengeKeyAuthorization selbst (client.js:455).
          await duckDnsUpdate({
            domains: duckSub(state.domain),
            token: state.token,
            txt: keyAuthorization,
          });
          // Sichtbarkeit abwarten, BEVOR acme-client seinen eigenen Verify
          // startet — verhindert den Endlos-Retry und sorgt für klare Fehler.
          await waitForTxtRecord(`_acme-challenge.${state.domain}`, keyAuthorization, 60_000);
        },
        challengeRemoveFn: async () => {
          // TXT wieder entfernen — txt= (leer) + clear=true, exakt wie das
          // acme.sh-Plugin (dns_duckdns) es macht. Best effort.
          try {
            await duckDnsUpdate({
              domains: duckSub(state.domain),
              token: state.token,
              txt: '',
              clear: 'true',
            });
          } catch { /* Aufräumen ist optional */ }
          // A-Record sofort wieder auf die LAN-IP setzen: Falls DuckDNS bei
          // Aufrufen ohne ip den A-Record auf die öffentliche IP des Aufrufers
          // umgestellt haben sollte (undokumentiertes Verhalten), ist er damit
          // wieder im Heimnetz — die Handys erreichen den Server sofort.
          try {
            const ip = pickLanIp();
            if (ip) await duckDnsUpdate({ domains: duckSub(state.domain), token: state.token, ip });
          } catch { /* best effort — der stündliche Sync repariert den Rest */ }
        },
      });

      // 3) Persistieren + Meta (Ablaufdatum für Renewal-Entscheidung & UI).
      const info = acme.crypto.readCertificateInfo(cert);
      const expiresAt = (info.notAfter instanceof Date ? info.notAfter : new Date(info.notAfter)).toISOString();
      const dir = certsDir();
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, LE_CERT_FILE), cert);
      writeFileSync(join(dir, LE_KEY_FILE), csrKey);
      writeFileSync(join(dir, LE_META_FILE), JSON.stringify({
        domain: state.domain,
        issuedAt: new Date().toISOString(),
        expiresAt,
      }, null, 2));
      // Frisch lesen — enthält das gerade persistierte lastAttemptIso.
      const fresh = readDomainState() ?? state;
      writeDomainState({
        ...fresh,
        lastIssuedAt: new Date().toISOString(),
        lastError: undefined,
        dnsIp: dnsIp ?? fresh.dnsIp,
      });

      const bundle: LeCertBundle = { cert, key: csrKey, expiresAt, domain: state.domain };

      // 4) Live-Swap benachrichtigen (setSecureContext + globals aktualisieren).
      for (const handler of [...s.swapHandlers]) {
        try { handler(bundle); } catch { /* Handler-Fehler nicht ausbreiten lassen */ }
      }
      return bundle;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try {
        const current = readDomainState();
        if (current) writeDomainState({ ...current, lastError: message.slice(0, 500) });
      } catch { /* Status-Datei defekt — Fehler nur werfen */ }
      throw err;
    }
  })();

  // issuing-Flag erst freigeben, wenn der Flow WIRKLICH endet — auch wenn der
  // HTTP-Request schon mit ISSUE_TIMEOUT geantwortet hat (Status-Endpunkt
  // meldet derweil issuing:true — die UI zeigt „läuft noch“ statt falscher
  // Fehler und wechselt bei Späterfolg automatisch auf die grüne Karte).
  const release = (): void => { s.issuing = false; };
  flow.then(release, release);

  // Gesamt-Cap (4 min): Der realistische Ablauf ist 20–90 s; pathological
  // Fälle (träger Recursive-Resolver) werden abgeschlossen gemeldet, der
  // Flow läuft im Hintergrund weiter.
  let capTimer: ReturnType<typeof setTimeout> | undefined;
  const cap: Promise<never> = new Promise((_resolve, reject) => {
    capTimer = setTimeout(() => reject(new Error('ISSUE_TIMEOUT')), 4 * 60 * 1000);
  });
  try {
    return await Promise.race([flow, cap]);
  } finally {
    if (capTimer) clearTimeout(capTimer);
  }
}

// ===================== Konfiguration verwalten (Settings-UI) =====================

/** DuckDNS-Konfiguration speichern (validiert Domain + Token). */
export function saveDomainConfig(domainInput: string, tokenInput: string): string {
  const domain = normalizeDuckDomain(domainInput);
  const token = (tokenInput || '').trim();
  if (!isValidToken(token)) throw new Error('INVALID_TOKEN');
  writeDomainState({ domain, token });
  return domain;
}

/** DuckDNS-Konfiguration (+ Zertifikat) entfernen — zurück zur lokalen CA. */
export function clearDomainConfig(): void {
  const dir = certsDir();
  for (const f of [STATE_FILE, LE_CERT_FILE, LE_KEY_FILE, LE_META_FILE]) {
    try { unlinkSync(join(dir, f)); } catch { /* nicht vorhanden — ok */ }
  }
}

// ===================== Status & Maintenance =====================

/** Kompakter Status für die Settings-UI und die status-API (ohne Token). */
export function getHttpsDomainStatus(): HttpsDomainStatus {
  const state = readDomainState();
  const bundle = getLeBundle();
  return {
    configured: !!state,
    domain: state?.domain ?? null,
    issuing: shared().issuing,
    certActive: !!bundle,
    certExpiresAt: bundle?.expiresAt ?? null,
    lastError: state?.lastError ?? null,
    dnsIp: state?.dnsIp ?? null,
    lastSyncAt: state?.lastSyncAt ?? null,
  };
}

/**
 * Swap-Handler registrieren (server.ts/standalone-server: aktualisiert
 * setSecureContext + globalThis-Status). Idempotent pro Funktion.
 */
export function registerCertSwapHandler(handler: (bundle: LeCertBundle) => void): void {
  const s = shared();
  if (!s.swapHandlers.includes(handler)) s.swapHandlers.push(handler);
}

/**
 * Hintergrund-Maintenance starten (idempotent über beide Modul-Graphen):
 *  - stündlich: DNS-A-Record auf aktuelle LAN-IP (IP-Wechsel, DuckDNS aktiv halten)
 *  - täglich + 30 s nach Boot: Renewal-Check (fehlendes Zertifikat ausstellen,
 *    Ablauf < 30 Tage → erneuern). Ohne konfigurierte Domain no-op.
 */
export function startMaintenance(): void {
  const s = shared();
  if (s.maintenanceTimer || s.dnsSyncTimer) return;
  s.dnsSyncTimer = setInterval(() => {
    void syncDnsRecord().catch(() => { /* offline? nächster Versuch in 1 h */ });
  }, 60 * 60 * 1000);
  s.maintenanceTimer = setInterval(() => {
    void checkRenewal().catch(() => { /* Fehler steht in https-domain.json */ });
  }, 24 * 60 * 60 * 1000);
  // Erster Check kurz nach dem Boot (Server soll nicht auf die erste
  // Tages-Wende warten, wenn das Zertifikat fehlt/bald abläuft).
  setTimeout(() => {
    void checkRenewal().catch(() => { /* ignoriert */ });
  }, 30_000);
}

async function checkRenewal(): Promise<void> {
  const state = readDomainState();
  if (!state || shared().issuing) return;
  // Persistierter Cooldown (10 min nach Fehlschlag) — verhindert, dass
  // Boot-/Stunden-Loops Let's Encrypts Fehler-Validierungs-Limit (5/h)
  // erschöpfen. Ohne force greift zusätzlich der 60-s-In-Memory-Guard.
  if (recentlyFailed(10 * 60 * 1000)) return;
  const bundle = getLeBundle();
  if (!bundle) {
    await issueCertificate();
    return;
  }
  const daysLeft = (Date.parse(bundle.expiresAt) - Date.now()) / (24 * 60 * 60 * 1000);
  if (daysLeft < 30) {
    await issueCertificate();
  }
}
