import { useId, useMemo, useState } from 'react';
import { PAGE_GROUPS, pageInfo, pageRows, type PageCount } from '@/lib/admin/pageStats';
import { NUMBER, percent } from './format';
import styles from '../StatsDashboard.module.css';

interface Props {
  paths: PageCount[];
  entryPaths: PageCount[];
  visitors: number;
  pageviews: number;
}

/** Jeder Tagesbesucher hat genau einen Einstieg; Aufrufe derselben Seite zählen erneut. */
export function VisitorBreakdown({ paths, entryPaths, visitors, pageviews }: Props) {
  const rows = pageRows(paths, entryPaths);
  const entries = rows.reduce((sum, row) => sum + row.entries, 0);
  const views = rows.reduce((sum, row) => sum + row.views, 0);
  const unassigned = Math.max(0, visitors - entries);
  return (
    <div className={styles.pageBreakdown}>
      <p className={styles.note}>
        Jeder Tagesbesucher zählt bei seiner ersten Seite genau einmal – auch beim alleinigen Besuch
        der Startseite. Mehrere Aufrufe zählen rechts erneut.
      </p>
      <table className={styles.pageTable}>
        <caption>Alle gezählten Besucher nach ihrer Einstiegsseite</caption>
        <thead>
          <tr>
            <th scope="col">Erste Seite</th>
            <th scope="col">Besucher</th>
            <th scope="col">Aufrufe</th>
          </tr>
        </thead>
        <tbody>
          {PAGE_GROUPS.map(([group, label]) => {
            const items = rows.filter((row) => row.group === group);
            const entered = items.reduce((sum, row) => sum + row.entries, 0);
            const viewed = items.reduce((sum, row) => sum + row.views, 0);
            if (entered === 0 && viewed === 0 && group !== 'home') return null;
            return (
              <tr key={group}>
                <th scope="row">{label}</th>
                <td>{entered === 0 && entries !== visitors ? '—' : NUMBER.format(entered)}</td>
                <td>{NUMBER.format(viewed)}</td>
              </tr>
            );
          })}
          {unassigned > 0 && (
            <tr>
              <th scope="row">Einstieg nicht gespeichert</th>
              <td>{NUMBER.format(unassigned)}</td>
              <td>—</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Gesamt</th>
            <td>{NUMBER.format(visitors)}</td>
            <td>{NUMBER.format(pageviews)}</td>
          </tr>
        </tfoot>
      </table>
      <p
        className={
          entries === visitors && views === pageviews ? styles.countMatch : styles.countWarning
        }
      >
        {entries === visitors && views === pageviews
          ? `${NUMBER.format(entries)} von ${NUMBER.format(visitors)} Tagesbesuchern zugeordnet. Alle ${NUMBER.format(views)} Seitenaufrufe enthalten.`
          : `Abgleich: ${NUMBER.format(entries)} gespeicherte Einstiege bei ${NUMBER.format(visitors)} Tagesbesuchern; ${NUMBER.format(views)} aufgeschlüsselte von ${NUMBER.format(pageviews)} Seitenaufrufen. Fehlende Daten lassen sich nicht nachträglich zuordnen.`}
      </p>
    </div>
  );
}

/** Alle gespeicherten Seiten sind durchsuchbar, auch mit nur einem Aufruf. */
export function PageTable({ paths, entryPaths, visitors, pageviews }: Props) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [locale, setLocale] = useState('all');
  const [sort, setSort] = useState<'views' | 'entries'>('views');
  const [page, setPage] = useState(0);
  const rows = useMemo(() => pageRows(paths, entryPaths), [paths, entryPaths]);
  const filtered = rows
    .filter(
      (row) =>
        (group === 'all' || row.group === group) &&
        (locale === 'all' || row.locale === locale) &&
        `${row.key} ${pageInfo(row.key).label}`
          .toLocaleLowerCase('de')
          .includes(query.toLocaleLowerCase('de'))
    )
    .sort((a, b) => b[sort] - a[sort] || a.key.localeCompare(b.key));
  const storedEntries = rows.reduce((sum, row) => sum + row.entries, 0);
  const incompleteEntries = storedEntries !== visitors;
  const size = 15;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / size) - 1));
  const visible = filtered.slice(currentPage * size, (currentPage + 1) * size);
  const entries = filtered.reduce((sum, row) => sum + row.entries, 0);
  const views = filtered.reduce((sum, row) => sum + row.views, 0);
  return (
    <div className={styles.pageBreakdown}>
      <div className={styles.pageFilters}>
        <label htmlFor={`${id}-search`}>
          Seite suchen
          <input
            id={`${id}-search`}
            type="search"
            placeholder="Startseite, Artikel oder URL …"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label htmlFor={`${id}-type`}>
          Seitentyp
          <select
            id={`${id}-type`}
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Alle Seitentypen</option>
            {PAGE_GROUPS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-locale`}>
          Sprache
          <select
            id={`${id}-locale`}
            value={locale}
            onChange={(e) => {
              setLocale(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">DE und EN</option>
            <option value="de">Deutsch</option>
            <option value="en">Englisch</option>
          </select>
        </label>
        <label htmlFor={`${id}-sort`}>
          Sortierung
          <select
            id={`${id}-sort`}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as 'views' | 'entries');
              setPage(0);
            }}
          >
            <option value="views">Meiste Aufrufe</option>
            <option value="entries">Meiste Einstiege</option>
          </select>
        </label>
      </div>
      <p className={styles.note} role="status">
        {NUMBER.format(filtered.length)} von {NUMBER.format(rows.length)} Seiten ·{' '}
        {NUMBER.format(entries)} Einstiege · {NUMBER.format(views)} Aufrufe in dieser Auswahl.
      </p>
      <p className={styles.note}>
        Einstiege: erste Seite eines Tagesbesuchers. Aufrufe: alle Besuche einer Seite
        einschließlich Wiederholungen. Eine 0 bedeutet: kein Einstieg gespeichert. Bei
        unvollständigen Daten bleibt unbekannt, ob die Seite die erste war. Prozentwerte beziehen
        sich auf alle Tagesbesucher beziehungsweise Aufrufe im Zeitraum, vor dem Filtern.
      </p>
      {incompleteEntries && (
        <p className={styles.countWarning}>
          Einstiegsdaten unvollständig oder widersprüchlich: {NUMBER.format(storedEntries)}{' '}
          gespeicherte Einstiege bei {NUMBER.format(visitors)} Tagesbesuchern. Ein Strich bedeutet
          unbekannt; positive Zahlen zeigen gespeicherte Einstiege. Besucheranteile werden für diese
          Daten nicht berechnet.
        </p>
      )}
      {visible.length === 0 ? (
        <p className={styles.empty}>Keine gezählte Seite passt zu dieser Auswahl.</p>
      ) : (
        <table className={styles.pageTable}>
          <caption>Jede gezählte Seite im Zeitraum</caption>
          <thead>
            <tr>
              <th scope="col">Seite</th>
              <th scope="col">Einstiege</th>
              <th scope="col">Aufrufe</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const info = pageInfo(row.key);
              return (
                <tr key={row.key}>
                  <th scope="row">
                    <span>
                      {info.label} · {row.locale.toUpperCase()}
                    </span>
                    <code className={styles.pagePath}>{row.key}</code>
                  </th>
                  <td>
                    {row.entries === 0 && incompleteEntries ? '—' : NUMBER.format(row.entries)}
                    <small>
                      {visitors > 0 && !incompleteEntries
                        ? percent(row.entries / visitors, 1)
                        : '—'}
                    </small>
                  </td>
                  <td>
                    {NUMBER.format(row.views)}
                    <small>{pageviews > 0 ? percent(row.views / pageviews, 1) : '—'}</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Gesamte Auswahl</th>
              <td>{entries === 0 && incompleteEntries ? '—' : NUMBER.format(entries)}</td>
              <td>{NUMBER.format(views)}</td>
            </tr>
          </tfoot>
        </table>
      )}
      {filtered.length > size && (
        <div className={styles.pagePagination}>
          <button
            type="button"
            className="et-btn et-btn-sm et-btn-alt"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Vorherige Seiten
          </button>
          <span>
            Seite {currentPage + 1} von {Math.ceil(filtered.length / size)}
          </span>
          <button
            type="button"
            className="et-btn et-btn-sm et-btn-alt"
            disabled={(currentPage + 1) * size >= filtered.length}
            onClick={() => setPage(currentPage + 1)}
          >
            Weitere Seiten
          </button>
        </div>
      )}
    </div>
  );
}
