'use client';

// Re-export the MobileClientView component as the /mobile page.
// This ensures the companion app always uses the latest implementation
// (with all fixes from Fixes 15-24) regardless of whether the user
// enters via /mobile or ?mobile=1.
import { MobileClientView } from '@/components/screens/mobile-client-view';

export default function MobilePage() {
  return <MobileClientView />;
}
