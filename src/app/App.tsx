import styles from './App.module.css'

const TELEMETRY_FIELDS = [
  { label: 'Altitude', unit: 'm' },
  { label: 'Ground speed', unit: 'm/s' },
  { label: 'Heading', unit: '°' },
  { label: 'Battery', unit: '%' },
  { label: 'GPS satellites', unit: '' },
  { label: 'Link quality', unit: '%' },
] as const

export function App() {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mini GCS</h1>
        <p className={styles.status} role="status">
          <span className={styles.statusDot} aria-hidden="true" />
          Disconnected
        </p>
      </header>
      <main className={styles.main}>
        <section className={styles.map} aria-labelledby="map-title">
          <h2 id="map-title" className={styles.panelTitle}>
            Map
          </h2>
          <p className={styles.placeholder}>Map view is coming in phase 1</p>
        </section>
        <aside className={styles.telemetry} aria-labelledby="telemetry-title">
          <h2 id="telemetry-title" className={styles.panelTitle}>
            Telemetry
          </h2>
          <dl className={styles.readouts}>
            {TELEMETRY_FIELDS.map(({ label, unit }) => (
              <div key={label} className={styles.readout}>
                <dt>{label}</dt>
                <dd>—{unit ? <span className={styles.unit}>{unit}</span> : null}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </main>
    </div>
  )
}
