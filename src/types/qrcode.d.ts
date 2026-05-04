declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  function toDataURL(_texttext: string, options?: QRCodeToDataURLOptions): Promise<string>;

  const _default: {
    toDataURL: typeof toDataURL;
  };
  export default _default;
}
