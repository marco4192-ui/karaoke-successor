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

  function _toDataURL(_text: string, options?: QRCodeToDataURLOptions): Promise<string>;

  const _default: {
    toDataURL: typeof _toDataURL;
  };
  export default _default;
}
