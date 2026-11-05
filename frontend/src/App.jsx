import { useEffect, useState } from 'react'

function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('http://localhost:8080/api/items')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Błąd HTTP: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        setItems(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Błąd pobierania danych:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
        <h1 style={{ color: '#2e7d32', margin: 0, fontSize: '1.8rem' }}>
          🌱 Ogrod-Backend: Wypożyczalnia Sprzętu Ogrodniczego
        </h1>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
          Katalog maszyn i narzędzi (WF-01) pobierany w czasie rzeczywistym z REST API
        </p>
      </header>

      {loading && <p style={{ fontSize: '1.1rem' }}>Ładowanie sprzętu z bazy danych...</p>}

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <strong>Nie udało się połączyć z backendem:</strong> {error}
          <br />
          <small>Upewnij się, że serwer Spring Boot działa w oknie obok na porcie 8080.</small>
        </div>
      )}

      {!loading && !error && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '16px',
                background: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <img
                  src={`http://localhost:8080${item.imageUrl}`}
                  alt={item.name}
                  style={{
                    width: '100%',
                    height: '180px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9'
                  }}
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/280x180?text=Brak+zdjecia'
                  }}
                />
                <h3 style={{ fontSize: '1.25rem', margin: '12px 0 6px 0', color: '#0f172a' }}>
                  {item.name}
                </h3>
                <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  {item.description}
                </p>
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#166534', marginBottom: '10px' }}>
                  {item.price} zł <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>/ doba</span>
                </div>
                <button
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: '#2e7d32',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onClick={() => alert(`Wybrano sprzęt: ${item.name} (ID: ${item.id}). Przejdźmy do formularza rezerwacji!`)}
                >
                  Zarezerwuj
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App