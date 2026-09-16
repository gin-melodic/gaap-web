// Shared transaction-date formatting helpers.
//
// Transactions keep full date/time semantics end-to-end (DEF-027): the API
// returns RFC3339 timestamps in the `date` field, forms send local
// "YYYY-MM-DDTHH:mm:ss" values and lists display hour/minute/second precision.

/** Builds the current local wall-clock time as a datetime-local value. */
export const getCurrentDateTime = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/** Converts an API date value to a datetime-local input value in local time. */
export const formatDateForInput = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch {
    return dateStr;
  }
};

/** Formats an API date value for list display with second precision. */
export const formatDateForDisplay = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d).replace(/\//g, '-');
  } catch {
    return dateStr;
  }
};
