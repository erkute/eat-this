import { useState } from 'react';
import type { StatsSummary } from '@/lib/admin/stats.server';
import Days from './Days';
import Content from './Content';
import Cards from './Cards';
import Revenue from './Revenue';
import Measurement from './Measurement';
import FunnelReport from './FunnelReport';
import EventsReport from './EventsReport';
import styles from '../../StatsDashboard.module.css';
function Choices({
  values,
  value,
  onChange,
  label,
}: {
  values: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  label: string;
}) {
  return (
    <div className={styles.reportTabs} role="group" aria-label={label}>
      {values.map((item) => (
        <button
          type="button"
          key={item.key}
          className={`et-btn et-btn-sm${value === item.key ? '' : ' et-btn-alt'}`}
          aria-pressed={value === item.key}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
export function Visitors({ data, onDay }: { data: StatsSummary; onDay: (day: string) => void }) {
  const [tab, setTab] = useState('pages');
  return (
    <>
      <Choices
        label="Besucherbericht"
        value={tab}
        onChange={setTab}
        values={[
          { key: 'pages', label: 'Alle Seiten' },
          { key: 'day', label: 'Tagesbericht' },
        ]}
      />
      {tab === 'pages' ? (
        <Content data={data} />
      ) : (
        <>
          <div className={styles.reportTabs}>
            <label>
              Tag auswählen{' '}
              <input
                className={styles.dateInput}
                type="date"
                aria-label="Berichtstag"
                value={data.range.end}
                max={data.range.today}
                onChange={(e) => {
                  if (e.target.value) onDay(e.target.value);
                }}
              />
            </label>
          </div>
          <Days data={data} />
        </>
      )}
    </>
  );
}
export function AccountsReport({ data }: { data: StatsSummary }) {
  const [tab, setTab] = useState('accounts');
  return (
    <>
      <Choices
        label="Kontenbericht"
        value={tab}
        onChange={setTab}
        values={[
          { key: 'accounts', label: 'Konten & Karten' },
          { key: 'revenue', label: 'Käufe & Katalogwerte' },
        ]}
      />
      {tab === 'accounts' ? <Cards data={data} /> : <Revenue data={data} />}
    </>
  );
}
export function MeasurementReport({ data }: { data: StatsSummary }) {
  const [tab, setTab] = useState('quality');
  return (
    <>
      <Choices
        label="Messdetails"
        value={tab}
        onChange={setTab}
        values={[
          { key: 'quality', label: 'Zahlenqualität' },
          { key: 'actions', label: 'Produktaktionen' },
          { key: 'events', label: 'Alle Ereignisse' },
        ]}
      />
      {tab === 'quality' ? (
        <Measurement data={data} />
      ) : tab === 'actions' ? (
        <FunnelReport data={data} />
      ) : (
        <EventsReport data={data} />
      )}
    </>
  );
}
