import { ExportLibrary } from '../../../wailsjs/go/platform/Service';

export interface DesktopExportRequest {
  suggestedFileName: string;
  content: string;
  mimeType: string;
}

export interface DesktopExportResult {
  state: string;
  path?: string;
}

type WailsPlatformService = {
  ExportFile?: (request: {
    suggestedFileName: string;
    content: string;
    mimeType: string;
  }) => Promise<DesktopExportResult>;
};

function readWailsPlatformService(): WailsPlatformService | null {
  const go = (window as unknown as {
    go?: { platform?: { Service?: WailsPlatformService } };
  }).go;
  return go?.platform?.Service ?? null;
}

export async function exportDesktopFile(request: DesktopExportRequest): Promise<DesktopExportResult> {
  const platform = readWailsPlatformService();
  if (platform?.ExportFile) {
    return platform.ExportFile({
      suggestedFileName: request.suggestedFileName,
      content: request.content,
      mimeType: request.mimeType,
    });
  }

  if (request.mimeType === 'application/json') {
    return ExportLibrary({
      suggestedFileName: request.suggestedFileName,
      documentJson: request.content,
    });
  }

  const blob = new Blob([request.content], { type: request.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = request.suggestedFileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return { state: 'saved' };
}
