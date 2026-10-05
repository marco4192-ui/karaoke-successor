// ===================== i18n-Hilfsfunktion (R33-Konvention) =====================
// t(key) === key bedeutet "nicht übersetzt" → deutschen Fallback nutzen.
// R54: Aus mobile-client-view.tsx hierher ausgelagert, damit auch die
// ausgelagerten Companion-Komponenten (mic-status-card, cert-setup, …)
// dieselbe Logik nutzen — vorher war tOr in 10+ Dateien dupliziert.
export function tOr(t: (key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}
