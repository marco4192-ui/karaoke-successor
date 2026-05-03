import type { MobileView } from './mobile-types';

interface BottomNavProps {
  currentView: MobileView;
  onNavigate: (view: MobileView) => void;
}

export function MobileBottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10">
      <div className="flex justify-around py-2">
        <button 
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center p-2 ${currentView === 'home' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-xs mt-1">Home</span>
        </button>
        <button 
          onClick={() => onNavigate('mic')}
          className={`flex flex-col items-center p-2 ${currentView === 'mic' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🎤</span>
          <span className="text-xs mt-1">Sing</span>
        </button>
        <button 
          onClick={() => onNavigate('songs')}
          className={`flex flex-col items-center p-2 ${currentView === 'songs' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🎵</span>
          <span className="text-xs mt-1">Songs</span>
        </button>
        <button 
          onClick={() => onNavigate('remote')}
          className={`flex flex-col items-center p-2 ${currentView === 'remote' ? 'text-purple-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🎮</span>
          <span className="text-xs mt-1">Remote</span>
        </button>
        <button 
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center p-2 ${currentView === 'profile' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">👤</span>
          <span className="text-xs mt-1">Profile</span>
        </button>
      </div>
    </div>
  );
}
