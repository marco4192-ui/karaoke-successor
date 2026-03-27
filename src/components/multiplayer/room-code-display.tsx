'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyIcon, CheckIcon, LinkIcon } from './lobby-icons';

// Generate QR code URL
function generateQRCode(data: string, size: number = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

interface RoomCodeDisplayProps {
  roomCode: string;
}

export function RoomCodeDisplay({ roomCode }: RoomCodeDisplayProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyRoomLink = async () => {
    const link = `${window.location.origin}?room=${roomCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Room Code */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Room Code</label>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-mono font-bold tracking-widest">
                {roomCode.slice(0, 3)} {roomCode.slice(3)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyRoomCode}
                className="text-white/60 hover:text-white"
              >
                {copiedCode ? (
                  <CheckIcon className="w-5 h-5 text-green-400" />
                ) : (
                  <CopyIcon className="w-5 h-5" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomLink}
                className="border-white/20 text-sm"
              >
                {copiedLink ? (
                  <CheckIcon className="w-4 h-4 mr-1 text-green-400" />
                ) : (
                  <LinkIcon className="w-4 h-4 mr-1" />
                )}
                Copy Link
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-lg">
              <img
                src={generateQRCode(`${window.location.origin}?room=${roomCode}`)}
                alt="Room QR Code"
                className="w-32 h-32"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
