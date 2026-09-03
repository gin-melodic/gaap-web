'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { format } from 'date-fns';
import { enUS, ja, zhCN, zhTW } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface TrendDateRange {
  from: Date;
  to: Date;
}

export function createInitialTrendDateState(): {
  range: TrendDateRange;
  earliestDate: Date;
  latestDate: Date;
} {
  const now = new Date();
  const latestDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const earliestDate = new Date(latestDate);
  earliestDate.setFullYear(earliestDate.getFullYear() - 2);
  const from = new Date(latestDate);
  from.setDate(from.getDate() - 59);
  return { range: { from, to: latestDate }, earliestDate, latestDate };
}

interface TrendDateRangePickerProps {
  value: TrendDateRange;
  earliestDate: Date;
  latestDate: Date;
  onChange: (range: TrendDateRange) => void;
}

const DATE_LOCALES = {
  en: enUS,
  ja,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
} as const;

export function toLocalDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromLocalDateValue(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) || toLocalDateValue(date) !== value ? undefined : date;
}

export function getEarliestSelectableDate(
  accounts: Array<{ date: string; createdAt?: Date; isGroup?: boolean }>,
  rollingEarliestDate: Date,
): Date {
  let earliestAccountDate: Date | undefined;
  accounts.forEach((account) => {
    if (account.isGroup) return;
    const candidate = fromLocalDateValue(account.date) ?? (account.createdAt
      ? new Date(account.createdAt.getFullYear(), account.createdAt.getMonth(), account.createdAt.getDate())
      : undefined);
    if (candidate && (!earliestAccountDate || candidate < earliestAccountDate)) {
      earliestAccountDate = candidate;
    }
  });
  if (!earliestAccountDate || earliestAccountDate < rollingEarliestDate) {
    return rollingEarliestDate;
  }
  return earliestAccountDate;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function clampCalendarStartMonth(date: Date, earliestDate: Date, latestDate: Date): Date {
  const earliestMonth = startOfMonth(earliestDate);
  const latestFirstMonth = addMonths(startOfMonth(latestDate), -1);
  const minimumFirstMonth = earliestMonth < latestFirstMonth ? earliestMonth : latestFirstMonth;
  const requestedMonth = startOfMonth(date);
  if (requestedMonth < minimumFirstMonth) return minimumFirstMonth;
  if (requestedMonth > latestFirstMonth) return latestFirstMonth;
  return requestedMonth;
}

export default function TrendDateRangePicker({
  value,
  earliestDate,
  latestDate,
  onChange,
}: TrendDateRangePickerProps) {
  const { t, i18n } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange>({ from: value.from, to: value.to });
  const [visibleMonth, setVisibleMonth] = useState(() => clampCalendarStartMonth(value.from, earliestDate, latestDate));
  const [portalTheme, setPortalTheme] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const language = i18n.resolvedLanguage ?? i18n.language;
  const locale = DATE_LOCALES[language as keyof typeof DATE_LOCALES] ?? enUS;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraftRange({ from: undefined, to: undefined });
      setVisibleMonth(clampCalendarStartMonth(value.from, earliestDate, latestDate));
      if (triggerRef.current) {
        const styles = getComputedStyle(triggerRef.current);
        const primary = styles.getPropertyValue('--primary');
        const background = styles.getPropertyValue('--bg-main');
        const card = styles.getPropertyValue('--bg-card');
        const text = styles.getPropertyValue('--text-main');
        const muted = styles.getPropertyValue('--text-muted');
        const border = styles.getPropertyValue('--border');
        setPortalTheme({
          '--primary': primary,
          '--primary-foreground': '#ffffff',
          '--bg-main': background,
          '--bg-card': card,
          '--text-main': text,
          '--text-muted': muted,
          '--border': border,
          '--popover': card,
          '--popover-foreground': text,
          '--accent': background,
          '--accent-foreground': text,
          '--muted-foreground': muted,
          '--ring': primary,
          backgroundColor: card,
          color: text,
        } as CSSProperties);
      }
    }
  };

  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from) return;
    if (!draftRange.from || draftRange.to) {
      setDraftRange({ from: range.from, to: undefined });
      return;
    }
    setDraftRange(range);
    if (range.to) {
      onChange({ from: range.from, to: range.to });
      setOpen(false);
    }
  };

  const rangeLabel = `${format(value.from, 'PP', { locale })} – ${format(value.to, 'PP', { locale })}`;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          className="w-full justify-start text-left font-normal sm:w-auto"
          aria-label={t('select_trend_date_range')}
        >
          <CalendarDays className="size-4" />
          <span>{rangeLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto max-w-[calc(100vw-2rem)] border-[var(--border)] p-3"
        style={portalTheme}
      >
        <Calendar
          mode="range"
          selected={draftRange}
          onSelect={handleSelect}
          month={visibleMonth}
          onMonthChange={(month) => setVisibleMonth(clampCalendarStartMonth(month, earliestDate, latestDate))}
          startMonth={startOfMonth(earliestDate) < addMonths(startOfMonth(latestDate), -1)
            ? startOfMonth(earliestDate)
            : addMonths(startOfMonth(latestDate), -1)}
          endMonth={latestDate}
          disabled={[{ before: earliestDate }, { after: latestDate }]}
          showOutsideDays
          numberOfMonths={2}
          captionLayout="dropdown"
          locale={locale}
          footer={<p className="pt-3 text-xs text-muted-foreground">{t('date_range_hint')}</p>}
        />
      </PopoverContent>
    </Popover>
  );
}
