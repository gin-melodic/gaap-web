import { secureRequest } from '../network/secure-client';
import {
  DownloadExportReq,
  DownloadExportRes,
  ExportDataReq,
  ExportDataRes,
  GetExportStatusReq,
  GetExportStatusRes,
  ImportDataReq,
  ImportDataRes,
} from '../proto/data/v1/data';

export const dataService = {
  exportData: (params: { startDate: string; endDate: string }): Promise<ExportDataRes> => secureRequest(
    '/data/export-data',
    { params },
    ExportDataReq,
    ExportDataRes,
  ),

  importData: (fileContent: Uint8Array, fileName: string): Promise<ImportDataRes> => secureRequest(
    '/data/import-data',
    { fileContent, fileName },
    ImportDataReq,
    ImportDataRes,
  ),

  downloadExport: async (taskId: string): Promise<Blob> => {
    const response = await secureRequest(
      '/data/download-export',
      { taskId },
      DownloadExportReq,
      DownloadExportRes,
    );
    return new Blob([response.fileContent as BlobPart], { type: 'application/json' });
  },

  getExportStatus: (taskId: string): Promise<GetExportStatusRes> => secureRequest(
    '/data/get-export-status',
    { taskId },
    GetExportStatusReq,
    GetExportStatusRes,
  ),
};
