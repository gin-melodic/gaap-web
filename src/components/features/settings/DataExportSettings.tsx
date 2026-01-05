'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, Upload, Calendar, Loader2, CheckCircle, AlertCircle, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiRequest, { API_BASE_PATH } from '@/lib/api';

interface DataExportSettingsProps {
  onBack: () => void;
}

type DateRangePreset = '7d' | '30d' | '90d' | '1y' | '3y' | 'custom';

interface TaskStatus {
  taskId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  payload?: {
    startDate: string;
    endDate: string;
  };
  result?: {
    fileName?: string;
    accountsExported?: number;
    transactionsExported?: number;
    accountsImported?: number;
    transactionsImported?: number;
    accountsSkipped?: number;
    transactionsSkipped?: number;
    error?: string;
  };
}

export const DataExportSettings = ({ onBack }: DataExportSettingsProps) => {
  const { t } = useTranslation(['settings', 'common']);

  // Export state
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('7d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [exportTask, setExportTask] = useState<TaskStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTask, setImportTask] = useState<TaskStatus | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  const getDateRange = (): { startDate: string; endDate: string } => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate: Date;

    switch (dateRangePreset) {
      case '7d':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '3y':
        startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 3);
        break;
      case 'custom':
        return { startDate: customStartDate, endDate: customEndDate };
      default:
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate: startDate.toISOString().split('T')[0], endDate };
  };

  const handleExport = async () => {
    setError(null);
    setIsExporting(true);

    try {
      const { startDate, endDate } = getDateRange();

      if (!startDate || !endDate) {
        throw new Error(t('settings:data_export.select_date_range'));
      }

      const response = await apiRequest<{ taskId: string }>(`${API_BASE_PATH}/data/export`, {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate }),
      });

      setExportTask({
        taskId: response.taskId,
        status: 'PENDING',
        progress: 0,
      });

      // Poll for status
      pollTaskStatus(response.taskId, 'export');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings:data_export.export_failed'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setError(t('settings:data_export.select_file'));
      return;
    }

    setError(null);
    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await apiRequest<{ taskId: string }>(`${API_BASE_PATH}/data/import`, {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for multipart
      });

      setImportTask({
        taskId: response.taskId,
        status: 'PENDING',
        progress: 0,
      });

      // Poll for status
      pollTaskStatus(response.taskId, 'import');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings:data_export.import_failed'));
    } finally {
      setIsImporting(false);
    }
  };

  const pollTaskStatus = async (taskId: string, type: 'export' | 'import') => {
    const maxAttempts = 120; // 2 minutes with 1s intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await apiRequest<TaskStatus>(`${API_BASE_PATH}/data/export/${taskId}`);

        if (type === 'export') {
          setExportTask(response);
        } else {
          setImportTask(response);
        }

        if (response.status === 'COMPLETED' || response.status === 'FAILED') {
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        }
      } catch {
        // Stop polling on error
      }
    };

    poll();
  };

  const handleDownload = async () => {
    if (!exportTask?.taskId) return;

    try {
      const response = await fetch(`${API_BASE_PATH}/data/download/${exportTask.taskId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportTask.result?.fileName || 'export.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError(t('settings:data_export.download_failed'));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        setError(t('settings:data_export.invalid_file_type'));
        return;
      }
      setImportFile(file);
      setError(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-xl font-bold text-[var(--text-main)]">
          {t('settings:data_export.title')}
        </h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Export Section */}
      <Card className="bg-[var(--bg-card)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--text-main)]">
            <Download size={20} />
            {t('settings:data_export.export_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings:data_export.date_range')}</Label>
            <Select value={dateRangePreset} onValueChange={(v) => setDateRangePreset(v as DateRangePreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('settings:data_export.last_7_days')}</SelectItem>
                <SelectItem value="30d">{t('settings:data_export.last_30_days')}</SelectItem>
                <SelectItem value="90d">{t('settings:data_export.last_90_days')}</SelectItem>
                <SelectItem value="1y">{t('settings:data_export.last_year')}</SelectItem>
                <SelectItem value="3y">{t('settings:data_export.last_3_years')}</SelectItem>
                <SelectItem value="custom">{t('settings:data_export.custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRangePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('settings:data_export.start_date')}</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('settings:data_export.end_date')}</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          )}

          {exportTask && (
            <div className="p-4 bg-[var(--bg-main)] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">
                  {exportTask.status === 'PENDING' && t('settings:data_export.status_pending')}
                  {exportTask.status === 'RUNNING' && t('settings:data_export.status_running')}
                  {exportTask.status === 'COMPLETED' && t('settings:data_export.status_completed')}
                  {exportTask.status === 'FAILED' && t('settings:data_export.status_failed')}
                </span>
                {exportTask.status === 'COMPLETED' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {exportTask.status === 'FAILED' && <AlertCircle className="h-5 w-5 text-red-500" />}
              </div>

              {exportTask.payload && (
                <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-main)]/50 p-2 rounded border border-[var(--border)]">
                  {t('settings:data_export.date_range')}: {exportTask.payload.startDate} - {exportTask.payload.endDate}
                </div>
              )}

              {exportTask.status === 'RUNNING' && (
                <div className="w-full bg-[var(--border)] rounded-full h-2">
                  <div
                    className="bg-[var(--primary)] h-2 rounded-full transition-all"
                    style={{ width: `${exportTask.progress}%` }}
                  />
                </div>
              )}
              {exportTask.status === 'COMPLETED' && exportTask.result && (
                <div className="text-sm text-[var(--text-muted)]">
                  {t('settings:data_export.export_result', {
                    accounts: exportTask.result.accountsExported,
                    transactions: exportTask.result.transactionsExported,
                  })}
                </div>
              )}
              {exportTask.status === 'FAILED' && exportTask.result?.error && (
                <div className="text-sm text-red-500">{exportTask.result.error}</div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={isExporting || exportTask?.status === 'RUNNING'}
              className="flex-1"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {t('settings:data_export.start_export')}
            </Button>
            {exportTask?.status === 'COMPLETED' && (
              <Button onClick={handleDownload} variant="outline">
                <FileArchive className="mr-2 h-4 w-4" />
                {t('settings:data_export.download')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="bg-[var(--bg-card)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--text-main)]">
            <Upload size={20} />
            {t('settings:data_export.import_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings:data_export.select_file')}</Label>
            <Input
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            {importFile && (
              <p className="text-sm text-[var(--text-muted)]">
                {t('settings:data_export.selected_file')}: {importFile.name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{t('settings:data_export.import_warning')}</span>
          </div>

          {importTask && (
            <div className="p-4 bg-[var(--bg-main)] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">
                  {importTask.status === 'PENDING' && t('settings:data_export.status_pending')}
                  {importTask.status === 'RUNNING' && t('settings:data_export.status_importing')}
                  {importTask.status === 'COMPLETED' && t('settings:data_export.status_completed')}
                  {importTask.status === 'FAILED' && t('settings:data_export.status_failed')}
                </span>
                {importTask.status === 'COMPLETED' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {importTask.status === 'FAILED' && <AlertCircle className="h-5 w-5 text-red-500" />}
              </div>
              {importTask.status === 'RUNNING' && (
                <div className="w-full bg-[var(--border)] rounded-full h-2">
                  <div
                    className="bg-[var(--primary)] h-2 rounded-full transition-all"
                    style={{ width: `${importTask.progress}%` }}
                  />
                </div>
              )}
              {importTask.status === 'COMPLETED' && importTask.result && (
                <div className="text-sm text-[var(--text-muted)]">
                  {(() => {
                    const r = importTask.result;
                    const added = (r.accountsImported || 0) + (r.transactionsImported || 0);
                    const updated = (r.accountsSkipped || 0) + (r.transactionsSkipped || 0);
                    const duplicated = updated;
                    return t('settings:import_result_summary', { added, updated, duplicated });
                  })()}
                </div>
              )}
              {importTask.status === 'FAILED' && importTask.result?.error && (
                <div className="text-sm text-red-500">{importTask.result.error}</div>
              )}
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={isImporting || !importFile || importTask?.status === 'RUNNING'}
            className="w-full"
          >
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {t('settings:data_export.start_import')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
