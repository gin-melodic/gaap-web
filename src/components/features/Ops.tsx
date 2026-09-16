'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobal } from '@/context/GlobalContext';
import { useOpsConsole, useOpsReconcile } from '@/lib/hooks/useOps';
import {
  OpsDependencyState,
  OpsDependencyStatus,
  OpsEventStats,
  OpsStatus,
} from '@/lib/services/opsService';
import { ApiError } from '@/lib/network/errors';

const Ops = () => {
  const { t } = useTranslation(['ops', 'common']);
  const { isLoggedIn } = useGlobal();
  const router = useRouter();
  const status = useOpsConsole();
  const reconcile = useOpsReconcile();

  // Unauthenticated: the ops API answers 401 (proto or JSON) - send the
  // visitor to the login page.
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return <RedirectingPanel message={t('ops:loading')} />;
  }

  if (status.isError) {
    const err = status.error instanceof ApiError ? status.error : new ApiError(String(status.error), 500);
    if (err.code === 401) {
      return <RedirectingPanel message={t('ops:unauthenticated')} />;
    }
    if (err.code === 403) {
      return (
        <Shell title={t('ops:title')} subtitle={t('ops:subtitle')}>
          <Card>
            <CardHeader>
              <CardTitle>{t('ops:forbiddenTitle')}</CardTitle>
              <CardDescription>{t('ops:forbiddenBody')}</CardDescription>
            </CardHeader>
          </Card>
        </Shell>
      );
    }
    if (err.code === 404) {
      return (
        <Shell title={t('ops:title')} subtitle={t('ops:subtitle')}>
          <Card>
            <CardHeader>
              <CardTitle>{t('ops:notFoundTitle')}</CardTitle>
              <CardDescription>{t('ops:notFoundBody')}</CardDescription>
            </CardHeader>
          </Card>
        </Shell>
      );
    }
    return (
      <Shell title={t('ops:title')} subtitle={t('ops:subtitle')}>
        <Card>
          <CardHeader>
            <CardTitle>{t('ops:errorTitle')}</CardTitle>
            <CardDescription>
              {err.code === 429 ? t('ops:rateLimited') : `${t('ops:errorBody')}: ${err.message}`}
            </CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  if (status.isLoading || !status.data) {
    return (
      <Shell title={t('ops:title')} subtitle={t('ops:subtitle')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </Shell>
    );
  }

  const data = status.data;
  const updatedAt = new Date(status.dataUpdatedAt).toLocaleTimeString();

  return (
    <Shell title={t('ops:title')} subtitle={`${t('ops:subtitle')} · ${updatedAt}`}>
      <div className="grid gap-4 lg:grid-cols-2">
        <ServerCard data={data} />
        <DependenciesCard data={data} />
        <HttpCard data={data} />
        <AleAuthCard data={data} />
        <ReconciliationCard data={data} reconcile={reconcile} />
        <UsersCard data={data} />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t('ops:recentEvents')}</CardTitle>
          <CardDescription>{t('ops:recentEventsHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentEvents.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t('ops:noEvents')}</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {data.recentEvents.slice(0, 25).map((ev, i) => (
                <li key={i} className="flex items-start gap-3 py-2 text-sm">
                  <span className={`shrink-0 ${ev.level === 'error' ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                    {ev.level === 'error' ? <AlertTriangle size={16} /> : <Activity size={16} />}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
                    {new Date(ev.time).toLocaleTimeString()}
                  </span>
                  <span className="font-mono text-xs">{ev.event}</span>
                  {ev.detail && <span className="min-w-0 truncate text-[var(--text-muted)]">{ev.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
};

function Shell(props: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      {(props.title || props.subtitle) && (
        <div className="mb-6">
          {props.title && (
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">{props.title}</h1>
          )}
          {props.subtitle && <p className="text-sm text-[var(--text-muted)]">{props.subtitle}</p>}
        </div>
      )}
      {props.children}
    </div>
  );
}

function RedirectingPanel({ message }: { message: string }) {
  return (
    <Shell>
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
    </Shell>
  );
}

function StatusBadge({ state }: { state: OpsDependencyState }) {
  const { t } = useTranslation('ops');
  const styles: Record<OpsDependencyState, string> = {
    ok: 'bg-emerald-500/15 text-emerald-600',
    error: 'bg-red-500/15 text-red-600',
    not_configured: 'bg-[var(--bg-main)] text-[var(--text-muted)]',
  };
  const labels: Record<OpsDependencyState, string> = {
    ok: t('statusOk'),
    error: t('statusError'),
    not_configured: t('statusNotConfigured'),
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[state]}`}>
      {labels[state]}
    </span>
  );
}

function DependencyRow({ name, status }: { name: string; status: OpsDependencyStatus }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0 truncate">
        {name}
        {status.error && <span className="ml-2 text-xs text-red-500">{status.error}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {status.status === 'ok' && typeof status.latencyMs === 'number' && (
          <span className="tabular-nums text-xs text-[var(--text-muted)]">{status.latencyMs}ms</span>
        )}
        <StatusBadge state={status.status} />
      </span>
    </li>
  );
}

function ServerCard({ data }: { data: OpsStatus }) {
  const { t } = useTranslation('ops');
  const uptime = formatUptime(data.server.uptimeSec);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('server')}</CardTitle>
        <CardDescription>
          {data.server.version} · {data.server.env} · {data.server.goVersion}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">{t('uptime')}</span>
          <span className="tabular-nums">{uptime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">{t('startedAt')}</span>
          <span className="tabular-nums">{new Date(data.server.startedAt).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DependenciesCard({ data }: { data: OpsStatus }) {
  const { t } = useTranslation('ops');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dependencies')}</CardTitle>
        <CardDescription>{t('dependenciesHint')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-[var(--border)]">
          <DependencyRow name={t('database')} status={data.database} />
          {Object.entries(data.redis).map(([group, s]) => (
            <DependencyRow key={group} name={`Redis · ${group}`} status={s} />
          ))}
          <DependencyRow name="RabbitMQ" status={data.rabbitmq} />
          {data.rabbitmq.queues.map((q) => (
            <li key={q.name} className="flex items-center justify-between gap-3 py-1.5 pl-4 text-sm">
              <span className="min-w-0 truncate">
                {q.name}
                {q.error && <span className="ml-2 text-xs text-red-500">{q.error}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="tabular-nums text-xs text-[var(--text-muted)]">
                  {t('queueDepth')}: {q.depth} · {t('consumers')}: {q.consumers}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function StatTable({ title, hint, stats, names }: {
  title: string;
  hint?: string;
  stats: OpsEventStats;
  names: string[];
}) {
  const { t } = useTranslation('ops');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {hint && <CardDescription>{hint}</CardDescription>}
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--text-muted)]">
              <th className="pb-2 font-medium">{t('metric')}</th>
              <th className="pb-2 text-right font-medium">{t('total')}</th>
              <th className="pb-2 text-right font-medium">{t('lastHour')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {names.map((name) => (
              <tr key={name}>
                <td className="py-1.5 font-mono text-xs">{name}</td>
                <td className="py-1.5 text-right tabular-nums">{stats.total[name] ?? 0}</td>
                <td className="py-1.5 text-right tabular-nums">{stats.lastHour[name] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function HttpCard({ data }: { data: OpsStatus }) {
  const { t } = useTranslation('ops');
  return (
    <StatTable
      title={t('httpTraffic')}
      hint={t('httpTrafficHint')}
      stats={data.http}
      names={['http.total', 'http.2xx', 'http.3xx', 'http.4xx', 'http.5xx']}
    />
  );
}

function AleAuthCard({ data }: { data: OpsStatus }) {
  const { t } = useTranslation('ops');
  const aleNames = Object.keys(data.ale.total);
  const authNames = Object.keys(data.auth.total);
  return (
    <div className="space-y-4">
      <StatTable title={t('aleErrors')} hint={t('aleErrorsHint')} stats={data.ale} names={aleNames} />
      <StatTable title={t('authActivity')} hint={t('authActivityHint')} stats={data.auth} names={authNames} />
    </div>
  );
}

function ReconciliationCard({ data, reconcile }: {
  data: OpsStatus;
  reconcile: ReturnType<typeof useOpsReconcile>;
}) {
  const { t } = useTranslation('ops');
  const recon = data.reconciliation;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reconciliation')}</CardTitle>
        <CardDescription>{t('reconciliationHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recon ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              {recon.report.passed ? (
                <CheckCircle2 className="text-emerald-500" size={18} />
              ) : (
                <XCircle className="text-red-500" size={18} />
              )}
              <span className="font-medium">
                {recon.report.passed ? t('reconPassed') : t('reconFailed')}
              </span>
              <span className="text-[var(--text-muted)]">
                · {recon.source === 'startup' ? t('reconSourceStartup') : t('reconSourceManual')}
                · {new Date(recon.at).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-[var(--bg-main)] p-3">
                <div className="text-xs text-[var(--text-muted)]">{t('accountsChecked')}</div>
                <div className="text-lg font-semibold tabular-nums">{recon.report.accountsChecked}</div>
              </div>
              <div className="rounded-lg bg-[var(--bg-main)] p-3">
                <div className="text-xs text-[var(--text-muted)]">{t('transactionsChecked')}</div>
                <div className="text-lg font-semibold tabular-nums">{recon.report.transactionsChecked}</div>
              </div>
            </div>

            {recon.report.differences.length > 0 && (
              <div className="space-y-1.5">
                {recon.report.differences.map((d) => (
                  <div key={d.accountId} className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs">
                    <div className="mb-1 font-medium text-red-600">
                      {d.name} ({d.currency})
                    </div>
                    <div className="grid grid-cols-3 gap-2 tabular-nums">
                      <div>
                        <div className="text-[var(--text-muted)]">{t('actual')}</div>
                        {d.actual}
                      </div>
                      <div>
                        <div className="text-[var(--text-muted)]">{t('expected')}</div>
                        {d.expected}
                      </div>
                      <div>
                        <div className="text-[var(--text-muted)]">{t('difference')}</div>
                        {d.difference}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recon.report.issues.length > 0 && (
              <ul className="space-y-1 text-xs text-amber-600">
                {recon.report.issues.map((issue, i) => (
                  <li key={i}>· {issue}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">{t('reconNoRun')}</p>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => reconcile.mutate()}
          disabled={reconcile.isPending}
        >
          <RefreshCw className={reconcile.isPending ? 'animate-spin' : ''} size={14} />
          {reconcile.isPending ? t('reconRunning') : t('reconRunNow')}
        </Button>
        {reconcile.isError && (
          <p className="text-xs text-red-500">{String(reconcile.error)}</p>
        )}
      </CardContent>
    </Card>
  );
}

function UsersCard({ data }: { data: OpsStatus }) {
  const { t } = useTranslation('ops');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('users')}</CardTitle>
        <CardDescription>{t('usersHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-[var(--text-muted)]" />
          <span className="text-2xl font-semibold tabular-nums">{data.users.total}</span>
          <span className="text-sm text-[var(--text-muted)]">{t('registeredUsers')}</span>
        </div>
        {data.users.recentSignups.length > 0 && (
          <ul className="space-y-1 text-sm">
            {data.users.recentSignups.map((s) => (
              <li key={s.email} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{s.email}</span>
                <span className="shrink-0 tabular-nums text-xs text-[var(--text-muted)]">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default Ops;
