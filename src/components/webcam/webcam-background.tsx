'use client';

import { useRef, useEffect } from 'react';
import { WebcamBackgroundConfig, WebcamFilter } from './types';

// Filter styles helper
function getFilterStyle(filter: WebcamFilter): string {
  switch (filter) {
    case 'grayscale':
      return 'grayscale(100%)';
    case 'sepia':
      return 'sepia(80%)';
    case 'contrast':
      return 'contrast(150%)';
    case 'brightness':
      return 'brightness(130%)';
    case 'saturate':
      return 'saturate(180%)';
    case 'blur':
      return 'blur(3px)';
    case 'none':
    default:
      return 'none';
  }
}

interface WebcamBackgroundProps {
  config: WebcamBackgroundConfig;
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  className?: string;
}

export function WebcamBackground({ 
  config, 
  stream, 
  isLoading, 
  error, 
  className 
}: WebcamBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Connect stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  // Calculate position and size based on mode
  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      opacity: config.opacity,
      zIndex: config.zIndex,
      overflow: 'hidden',
      objectFit: 'cover',
      filter: getFilterStyle(config.filter),
      backgroundColor: '#000',
    };
    
    // Size map for strip modes
    const sizeMap: Record<string, string> = {
      'fullscreen': '100%',
      '2:10': '20%',
      '3:10': '30%',
      '4:10': '40%',
    };
    
    const sizeValue = sizeMap[config.sizeMode] || '20%';
    
    if (config.sizeMode === 'fullscreen') {
      return {
        ...base,
        inset: 0,
        width: '100%',
        height: '100%',
        borderRadius: 0,
        border: 'none',
        boxShadow: 'none',
      };
    }
    
    // Apply border styles if enabled
    const borderStyles = config.showBorder ? {
      borderRadius: `${config.borderRadius}px`,
      border: `2px solid ${config.borderColor}`,
      boxShadow: `0 0 20px ${config.borderColor}`,
    } : {};
    
    // For horizontal strips (top/bottom)
    if (config.position === 'top' || config.position === 'bottom') {
      return {
        ...base,
        ...borderStyles,
        width: '100%',
        height: sizeValue,
        left: 0,
        right: 0,
        top: config.position === 'top' ? 0 : 'auto',
        bottom: config.position === 'bottom' ? 0 : 'auto',
        ...(config.position === 'top' ? { 
          borderRadius: config.showBorder ? `0 0 ${config.borderRadius}px ${config.borderRadius}px` : 0 
        } : { 
          borderRadius: config.showBorder ? `${config.borderRadius}px ${config.borderRadius}px 0 0` : 0 
        }),
      };
    }
    
    // For vertical strips (left/right)
    return {
      ...base,
      ...borderStyles,
      height: '100%',
      width: sizeValue,
      top: 0,
      bottom: 0,
      left: config.position === 'left' ? 0 : 'auto',
      right: config.position === 'right' ? 0 : 'auto',
      ...(config.position === 'left' ? { 
        borderRadius: config.showBorder ? `0 ${config.borderRadius}px ${config.borderRadius}px 0` : 0 
      } : { 
        borderRadius: config.showBorder ? `${config.borderRadius}px 0 0 ${config.borderRadius}px` : 0 
      }),
    };
  };
  
  if (!config.enabled) {
    return null;
  }
  
  return (
    <div className={className}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          ...getPositionStyles(),
          transform: config.mirrored ? 'scaleX(-1)' : 'none',
        }}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/50"
          style={{ zIndex: config.zIndex + 1 }}
        >
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center"
          style={{ zIndex: config.zIndex + 1 }}
        >
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
