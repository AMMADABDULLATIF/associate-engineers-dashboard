export {};

declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }

  interface Window {
    firebase?: any;
    XLSX?: any;
    jspdf?: {
      jsPDF?: new (options?: {
        orientation?: string;
        unit?: string;
        format?: string;
      }) => any;
    };
    jsPDF?: new (options?: {
      orientation?: string;
      unit?: string;
      format?: string;
    }) => any;
    __AE_SW_READY__?: boolean;
  }
}
