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
  ExportLibrary?: (request: {
    suggestedFileName: string;
    documentJson: string;
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
  if (platform?.ExportLibrary && request.mimeType === 'application/json') {
    return platform.ExportLibrary({
      suggestedFileName: request.suggestedFileName,
      documentJson: request.content,
    });
  }

  if (platform?.ExportFile) {
    return platform.ExportFile({
      suggestedFileName: request.suggestedFileName,
      content: request.content,
      mimeType: request.mimeType,
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

