import { useEffect, useState, useMemo } from 'react'
import logoImage from './assets/GardenBookingLogo.png'

const THEME = {
  primary: '#556B2F',
  accent: '#8FA31E',
  border: '#C6D870',
  surface: '#EFF5D2',
  textDark: '#1e293b',
  textMuted: '#64748b',
  white: '#ffffff'
}

// Rozdzielone słowniki kategorii dla sprzętu i usług
const EQUIPMENT_CATEGORIES = [
  { id: 'ALL', name: 'Wszystkie kategorie sprzętu' },
  { id: '1', name: 'Kosiarki i aeratory' },
  { id: '2', name: 'Glebogryzarki i zagęszczarki' },
  { id: '3', name: 'Pilarki i nożyce' },
  { id: '4', name: 'Narzędzia ogrodowe i myjki' }
]

const SERVICE_CATEGORIES = [
  { id: 'ALL', name: 'Wszystkie kategorie usług' },
  { id: '10', name: 'Koszenie i wertykulacja' },
  { id: '11', name: 'Cięcie i pielęgnacja drzew/krzewów' },
  { id: '12', name: 'Przygotowanie terenu i siew' },
  { id: '13', name: 'Karczowanie i porządkowanie działki' }
]

function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filtrowanie i wyszukiwanie
  const [offerType, setOfferType] = useState('ALL') // 'ALL' | 'EQUIPMENT' | 'SERVICE'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [sortBy, setSortBy] = useState('DEFAULT')

  // Pobieranie danych z backendu Spring Boot
  useEffect(() => {
    fetch('http://localhost:8080/api/items')
      .then((res) => {
        if (!res.ok) throw new Error(`Błąd HTTP: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setItems(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleOfferTypeChange = (newType) => {
    setOfferType(newType)
    setSelectedCategory('ALL')
  }

  // Dostępne kategorie zależnie od wybranego trybu
  const currentCategories = useMemo(() => {
    if (offerType === 'SERVICE') return SERVICE_CATEGORIES
    if (offerType === 'EQUIPMENT') return EQUIPMENT_CATEGORIES
    return [
      { id: 'ALL', name: 'Wszystkie kategorie (sprzęt i usługi)' },
      ...EQUIPMENT_CATEGORIES.filter(c => c.id !== 'ALL'),
      ...SERVICE_CATEGORIES.filter(c => c.id !== 'ALL')
    ]
  }, [offerType])

  // Filtrowanie i sortowanie ofert
  const processedItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const isServiceItem = item.category?.name?.toLowerCase().includes('usług') || 
                            item.name?.toLowerCase().includes('usługa') ||
                            item.description?.toLowerCase().includes('usługa')

      let matchesOfferType = true
      if (offerType === 'EQUIPMENT') matchesOfferType = !isServiceItem
      if (offerType === 'SERVICE') matchesOfferType = isServiceItem

      const matchesCategory = selectedCategory === 'ALL' || 
                              (item.category && item.category.id === Number(selectedCategory)) ||
                              (item.categoryId === Number(selectedCategory))

      return matchesSearch && matchesOfferType && matchesCategory
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'PRICE_ASC') return a.price - b.price
      if (sortBy === 'PRICE_DESC') return b.price - a.price
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name)
      if (sortBy === 'NAME_DESC') return b.name.localeCompare(a.name)
      return 0
    })
  }, [items, searchQuery, offerType, selectedCategory, sortBy])

  // Płynne przewijanie do katalogu
  const scrollToCatalog = (type = null) => {
    if (type) handleOfferTypeChange(type)
    const catalogSection = document.getElementById('catalog-section')
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100%', 
      margin: 0, 
      padding: 0, 
      backgroundColor: '#fafaf9', 
      color: THEME.textDark, 
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>

      {/* RESPONSYWNOŚĆ DO NAVBARA */}
      <style>{`
        @media (max-width: 640px) {
          .brand-text-container {
            display: none !important;
          }
          .nav-buttons-container button {
            padding: 6px 12px !important;
            font-size: 0.8rem !important;
          }
          .main-navbar {
            padding: 0 1rem !important;
          }
        }
      `}</style>

      {/* 1. NAVBAR */}
      <nav className="main-navbar" style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '70px',
        backgroundColor: THEME.white, 
        borderBottom: `2px solid ${THEME.surface}`, 
        zIndex: 100, 
        padding: '0 2rem', 
        width: '100%', 
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ 
          maxWidth: '1280px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%' 
        }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img 
              src={logoImage} 
              alt="GardenBooking Logo" 
              style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
            />
            <div className="brand-text-container">
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: THEME.primary, letterSpacing: '-0.5px', display: 'block', lineHeight: 1.1 }}>
                Garden<span style={{ color: THEME.accent, fontWeight: 700 }}>Booking</span>
              </span>
              <span style={{ fontSize: '0.68rem', display: 'block', color: THEME.textMuted, fontWeight: 600, letterSpacing: '0.5px' }}>
                WYPOŻYCZALNIA SPRZĘTU I USŁUGI OGRODNICZE
              </span>
            </div>
          </div>

          <div className="nav-buttons-container" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => alert('Moduł logowania w przygotowaniu')}
              style={{ 
                backgroundColor: THEME.white, 
                color: THEME.primary, 
                border: `1.5px solid ${THEME.primary}`, 
                padding: '8px 16px', 
                borderRadius: '6px', 
                fontSize: '0.88rem', 
                fontWeight: 700, 
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Zaloguj się
            </button>
            <button 
              onClick={() => alert('Moduł rejestracji w przygotowaniu')}
              style={{ 
                backgroundColor: THEME.primary, 
                color: THEME.white, 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '6px', 
                fontSize: '0.88rem', 
                fontWeight: 700, 
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Zarejestruj się
            </button>
          </div>

        </div>
      </nav>

      {/* 2. EKRAN POWITALNY */}
      <div style={{ 
        minHeight: '100vh',
        paddingTop: '70px',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        backgroundColor: THEME.primary,
        boxSizing: 'border-box'
      }}>

        <div style={{ height: '1.5rem' }}></div>

        <div style={{ 
          maxWidth: '960px', 
          margin: '0 auto', 
          width: '100%', 
          padding: '1rem 1.5rem', 
          textAlign: 'center',
          boxSizing: 'border-box'
        }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: THEME.white, margin: '0 0 0.5rem 0' }}>
            Wybierz czego potrzebujesz
          </h1>
          <p style={{ fontSize: '1rem', color: THEME.surface, margin: '0 0 2rem 0' }}>
            Wypożycz maszynę do samodzielnej pracy lub zleć wykonanie zadania w ogrodzie.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>

            {/* Kafel -> Sprzęt */}
            <div 
              onClick={() => scrollToCatalog('EQUIPMENT')}
              style={{
                backgroundColor: THEME.white,
                borderRadius: '16px',
                padding: '2.2rem 1.5rem',
                cursor: 'pointer',
                boxShadow: '0 12px 25px rgba(0,0,0,0.18)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                border: `3px solid transparent`,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: THEME.primary, margin: '0 0 0.5rem 0' }}>
                Wypożycz sprzęt
              </h2>
              <span style={{ fontSize: '0.9rem', color: THEME.textMuted }}>
                Kosiarki, aeratory, glebogryzarki i inne maszyny
              </span>
            </div>

            {/* Kafel -> Usługi */}
            <div 
              onClick={() => scrollToCatalog('SERVICE')}
              style={{
                backgroundColor: THEME.white,
                borderRadius: '16px',
                padding: '2.2rem 1.5rem',
                cursor: 'pointer',
                boxShadow: '0 12px 25px rgba(0,0,0,0.18)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                border: `3px solid transparent`,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: THEME.primary, margin: '0 0 0.5rem 0' }}>
                Zamów usługę
              </h2>
              <span style={{ fontSize: '0.9rem', color: THEME.textMuted }}>
                Koszenie, aeracja oraz kompleksowe prace ogrodowe
              </span>
            </div>

          </div>
        </div>

        <div 
          onClick={() => scrollToCatalog('ALL')}
          style={{ 
            textAlign: 'center', 
            paddingBottom: '2rem', 
            cursor: 'pointer',
            color: THEME.surface,
            userSelect: 'none'
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>
            lub przeglądaj całą ofertę
          </div>
          <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>
            ↓
          </div>
        </div>

      </div>

      {/* 3. KATALOG OFERT */}
      <main id="catalog-section" style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: '3.5rem 1.25rem 2.5rem 1.25rem', 
        width: '100%', 
        boxSizing: 'border-box' 
      }}>

        {/* Zakładki */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: `2px solid ${THEME.surface}`, paddingBottom: '0.75rem', overflowX: 'auto' }}>
          {[
            { id: 'ALL', label: 'Wszystkie pozycje' },
            { id: 'EQUIPMENT', label: 'Sprzęt ogrodniczy' },
            { id: 'SERVICE', label: 'Usługi ogrodnicze' }
          ].map((tab) => {
            const isActive = offerType === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleOfferTypeChange(tab.id)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: isActive ? THEME.primary : THEME.surface,
                  color: isActive ? THEME.white : THEME.primary,
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Panel filtrów i wyszukiwarki */}
        <div style={{ 
          backgroundColor: THEME.white, 
          padding: '1.25rem', 
          borderRadius: '12px', 
          boxShadow: '0 1px 5px rgba(85, 107, 47, 0.08)', 
          border: `1.5px solid ${THEME.surface}`, 
          marginBottom: '2rem', 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}>

          {/* Wyszukiwarka */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
              Wyszukaj po nazwie
            </label>
            <input
              type="text"
              placeholder="np. kosiarka spalinowa, aeracja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '9px 12px', 
                borderRadius: '7px', 
                border: `1.5px solid ${THEME.border}`, 
                fontSize: '0.9rem',
                backgroundColor: THEME.white,
                color: THEME.textDark,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Kategorie */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
              Kategoria {offerType === 'EQUIPMENT' ? '(sprzęt)' : offerType === 'SERVICE' ? '(usługi)' : ''}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '7px',
                border: `1.5px solid ${THEME.border}`,
                fontSize: '0.9rem',
                backgroundColor: THEME.white,
                color: THEME.textDark,
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              {currentCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sortowanie */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
              Sortuj według
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '7px',
                border: `1.5px solid ${THEME.border}`,
                fontSize: '0.9rem',
                backgroundColor: THEME.white,
                color: THEME.textDark,
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="DEFAULT">Domyślnie (polecane)</option>
              <option value="PRICE_ASC">Cena: od najniższej</option>
              <option value="PRICE_DESC">Cena: od najwyższej</option>
              <option value="NAME_ASC">Nazwa: A - Z</option>
              <option value="NAME_DESC">Nazwa: Z - A</option>
            </select>
          </div>

        </div>

        {/* Nagłówek katalogu */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: THEME.primary }}>
            {offerType === 'EQUIPMENT' ? 'Sprzęt ogrodniczy' : offerType === 'SERVICE' ? 'Usługi ogrodnicze' : 'Wszystkie pozycje'} ({processedItems.length})
          </h2>
        </div>

        {loading && <p style={{ textAlign: 'center', padding: '3rem', color: THEME.textMuted }}>Ładowanie katalogu...</p>}
        {error && <p style={{ color: '#dc2626', background: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>Błąd pobierania: {error}</p>}

        {!loading && processedItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: THEME.white, borderRadius: '10px', border: `1.5px dashed ${THEME.border}` }}>
            <p style={{ margin: 0, color: THEME.textMuted, fontSize: '0.95rem' }}>Brak ofert spełniających wybrane kryteria.</p>
          </div>
        )}

        {/* Siatka kart */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
          gap: '1.5rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {processedItems.map((item) => (
            <div 
              key={item.id} 
              style={{ 
                backgroundColor: THEME.white, 
                border: `1.5px solid ${THEME.surface}`, 
                borderRadius: '12px', 
                overflow: 'hidden', 
                display: 'flex', 
                flexDirection: 'column', 
                boxShadow: '0 2px 5px rgba(85, 107, 47, 0.06)' 
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '200px', backgroundColor: THEME.surface }}>
                <img
                  src={`http://localhost:8080${item.imageUrl}`}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = 'https://placehold.co/400x250?text=GardenBooking' }}
                />
                <span style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  backgroundColor: item.isAvailable ? THEME.surface : '#fee2e2', 
                  color: item.isAvailable ? THEME.primary : '#991b1b', 
                  border: `1px solid ${item.isAvailable ? THEME.border : '#fca5a5'}`,
                  fontSize: '0.72rem', 
                  fontWeight: 800, 
                  padding: '3px 8px', 
                  borderRadius: '10px' 
                }}>
                  {item.isAvailable ? 'Dostępny' : 'Zajęty'}
                </span>
              </div>

              <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem', fontWeight: 700, color: THEME.textDark }}>{item.name}</h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: THEME.textMuted, flex: 1, lineHeight: 1.5 }}>
                  {item.description || 'Profesjonalna pozycja gotowa do rezerwacji.'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '0.8rem', borderTop: `1px solid ${THEME.surface}` }}>
                  <div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.primary }}>{item.price} zł</span>
                    <span style={{ fontSize: '0.8rem', color: THEME.textMuted }}> / doba</span>
                  </div>
                  <button
                    onClick={() => alert(`Rezerwacja pozycji: ${item.name}`)}
                    disabled={!item.isAvailable}
                    style={{
                      backgroundColor: item.isAvailable ? THEME.primary : '#cbd5e1',
                      color: THEME.white,
                      border: 'none',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: item.isAvailable ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Zarezerwuj
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 4. FOOTER */}
      <footer style={{ 
        backgroundColor: THEME.primary, 
        color: THEME.surface, 
        padding: '2.5rem 1.25rem 1.5rem 1.25rem', 
        marginTop: '3.5rem',
        borderTop: `2px solid ${THEME.border}`,
        boxSizing: 'border-box',
        width: '100%'
      }}>
        <div style={{ 
          maxWidth: '1280px', 
          margin: '0 auto', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '2rem', 
          marginBottom: '2rem' 
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.8rem' }}>
              <img src={logoImage} alt="GardenBooking" style={{ height: '32px', filter: 'brightness(0) invert(1)' }} />
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.white }}>GardenBooking</span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5, margin: 0, color: THEME.surface }}>
              Zintegrowany system rezerwacji maszyn i usług ogrodniczych.
            </p>
          </div>

          <div>
            <h4 style={{ color: THEME.white, fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.8rem 0' }}>Kontakt z nami</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', lineHeight: 1.8 }}>
              <li>ul. Ogrodowa 15, 90-001 Łódź</li>
              <li>Tel: +48 123 456 789</li>
              <li>E-mail: kontakt@gardenbooking.pl</li>
              <li>Pon. - Sob.: 7:00 - 19:00</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: THEME.white, fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.8rem 0' }}>Informacje</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', lineHeight: 1.8 }}>
              <li>• Regulamin wypożyczalni</li>
              <li>• Polityka prywatności i RODO</li>
              <li>• Cennik transportu maszyn</li>
              <li>• Protokół zdawczo-odbiorczy</li>
            </ul>
          </div>
        </div>

        <div style={{ borderTop: `1px solid rgba(239, 245, 210, 0.25)`, paddingTop: '1.25rem', textAlign: 'center', fontSize: '0.75rem', color: THEME.surface }}>
          © {new Date().getFullYear()} GardenBooking. Wszelkie prawa zastrzeżone.
        </div>
      </footer>
    </div>
  )
}

export default App