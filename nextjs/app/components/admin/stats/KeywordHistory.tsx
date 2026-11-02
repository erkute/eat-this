import { auth } from '@/lib/firebase/config';
import type { Range } from '@/lib/admin/stats.server';
import { useEffect, useMemo, useState } from 'react';
import { keywordPeriods, type SearchSummary } from '@/lib/admin/searchConsole';
import { Card } from './charts';
import { NUMBER, shortDay, longDay } from './format';
import { SearchRows } from './reports/Days';
import styles from '../StatsDashboard.module.css';
export default function KeywordHistory({ data, range }: { data: SearchSummary; range: Range }) {
  const [history, setHistory] = useState<SearchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setHistory(null);
    setError(null);
    const load = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const response = await fetch(
          `/api/admin/stats?only=keywords&from=${range.start}&to=${range.end}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (!result.search?.ok) throw new Error('Google liefert den Keyword-Verlauf gerade nicht.');
        if (!cancelled) setHistory(result.search.data);
      } catch (cause) {
        if (!cancelled) setError((cause as Error).message);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [range.start, range.end]);
  if (error)
    return (
      <p role="alert" className={styles.error}>
        {error}
      </p>
    );
  if (!history)
    return (
      <p role="status" className={styles.notice}>
        Keyword-Verlauf wird geladen · endgültige Daten bis {longDay(data.range.end)} …
      </p>
    );
  return <KeywordTable data={history} />;
}
function KeywordTable({ data }: { data: SearchSummary }) {
  const [unit, setUnit] = useState<'day' | 'week'>('week');
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const periods = useMemo(
    () => keywordPeriods(data.keywordHistory, unit),
    [data.keywordHistory, unit]
  );
  const current = periods.find((p) => p.start === selected) ?? periods[0];
  const columns = periods.slice(0, 8).reverse();
  const totals = new Map<string, number>();
  for (const row of data.keywordHistory)
    totals.set(row.query, (totals.get(row.query) ?? 0) + row.clicks);
  const keywords = [...totals]
    .filter(([key]) => key.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12);
  const max = Math.max(1, ...columns.flatMap((p) => p.queries.map((q) => q.clicks)));
  return (
    <>
      <Card
        title="Suchbegriffe nach Tagen und Wochen"
        span={3}
        sub={`Google-Daten vom ${longDay(data.keywordHistoryStart)} bis ${longDay(data.range.end)}. Wochen beginnen montags; Randwochen können unvollständig sein.`}
      >
        <div className={styles.cardTools}>
          <label>
            Ansicht{' '}
            <select
              className={styles.select}
              aria-label="Keyword-Zeiteinheit"
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value as 'day' | 'week');
                setSelected('');
              }}
            >
              <option value="day">Tage</option>
              <option value="week">Wochen</option>
            </select>
          </label>
          <label>
            Zeitraum{' '}
            <select
              className={styles.select}
              aria-label="Keyword-Zeitraum"
              value={current?.start ?? ''}
              onChange={(e) => setSelected(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p.start} value={p.start}>
                  {unit === 'week' ? `${shortDay(p.start)}–${shortDay(p.end)}` : longDay(p.start)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Suchbegriff{' '}
            <input
              className={styles.select}
              type="search"
              aria-label="Keyword suchen"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {current ? (
          <SearchRows
            rows={current.queries
              .filter((row) =>
                row.key.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de'))
              )
              .slice(0, 25)}
            empty="Keine ausgewiesenen Suchbegriffe in dieser Auswahl."
          />
        ) : (
          <p className={styles.empty}>
            Google hat für diesen Zeitraum keine täglichen Suchbegriffe ausgewiesen.
          </p>
        )}
        <p className={styles.note}>
          Klicks sind Suchklicks, keine eindeutigen Besucher. Anonymisierte und von Google nicht
          ausgegebene Begriffe fehlen. Die Liste muss deshalb nicht die gesamte Klickzahl ergeben.
        </p>
        {data.keywordHistoryTruncated && (
          <p className={styles.countWarning}>
            Google lieferte die maximale Zeilenzahl. Die Tages-/Wochenlisten sind unvollständig; ein
            kürzerer Zeitraum zeigt mehr Detail.
          </p>
        )}
      </Card>
      {columns.length > 0 && (
        <Card
          title="Welche Keywords bleiben oder wechseln?"
          span={3}
          sub="Bis zu acht Tage oder Wochen nebeneinander. Dunklere Zellen bedeuten mehr ausgewiesene Klicks; ein Strich heißt: von Google nicht ausgewiesen."
        >
          <div
            className={styles.scroll}
            role="region"
            aria-label="Keyword-Verlauf horizontal scrollen"
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Suchbegriff</th>
                  {columns.map((p) => (
                    <th scope="col" key={p.start}>
                      {shortDay(p.start)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keywords.map(([keyword]) => (
                  <tr key={keyword}>
                    <th scope="row" className={styles.cellKey}>
                      {keyword}
                    </th>
                    {columns.map((p) => {
                      const row = p.queries.find((r) => r.key === keyword);
                      return (
                        <td
                          key={p.start}
                          className={styles.cellNum}
                          style={
                            row?.clicks
                              ? {
                                  background: `color-mix(in srgb, var(--et-link) ${Math.round(8 + (22 * row.clicks) / max)}%, transparent)`,
                                }
                              : undefined
                          }
                        >
                          {row ? NUMBER.format(row.clicks) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
