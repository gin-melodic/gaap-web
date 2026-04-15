import apiRequest, { API_BASE_PATH } from '../api';
import { 
    ExportDataReq, ExportDataRes, 
    ImportDataReq, ImportDataRes, 
    DownloadExportReq, DownloadExportRes, 
    GetExportStatusReq, GetExportStatusRes 
} from '../proto/data/v1/data';

export const dataService = {
    exportData: async (params: { startDate: string; endDate: string }): Promise<ExportDataRes> => {
        return apiRequest(`${API_BASE_PATH}/data/export-data`, {
            method: 'POST',
            body: JSON.stringify({ params }),
        });
    },

    importData: async (fileContent: Uint8Array, fileName: string): Promise<ImportDataRes> => {
        // Note: For file uploads, the backend might still expect multipart/form-data 
        // but based on the proto definition ImportDataReq uses bytes.
        // If the API is strictly Protobuf over HTTP POST, we use JSON representation of the proto for simplicity 
        // as apiRequest handles the wrapper. However, usually file uploads are handled via FormData.
        // Given the current implementation in DataExportSettings.tsx uses FormData, 
        // and typical GoFrame/Protobuf setups for files often keep multipart for the actual upload.
        // But to follow "protobuf request" requirement:
        return apiRequest(`${API_BASE_PATH}/data/import-data`, {
            method: 'POST',
            body: JSON.stringify({ fileContent, fileName }), 
        });
    },

    downloadExport: async (taskId: string): Promise<Blob> => {
        const response = await fetch(`${API_BASE_PATH}/data/download-export`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ taskId }),
        });

        if (!response.ok) throw new Error('Download failed');
        return await response.blob();
    },

    getExportStatus: async (taskId: string): Promise<GetExportStatusRes> => {
        return apiRequest(`${API_BASE_PATH}/data/get-export-status`, {
            method: 'POST',
            body: JSON.stringify({ taskId }),
        });
    },
};
