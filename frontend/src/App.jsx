import { useEffect, useState, useMemo, useRef } from 'react'
import { Routes, Route, useNavigate, Link } from 'react-router-dom'
import { 
  Phone, 
  MessageSquare, 
  Bell, 
  CalendarCheck, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus,
  ChevronDown
} from 'lucide-react'
import logoImage from './assets/GardenBookingLogo.png'
import AuthPage from './AuthPage'
import UserPage from './UserPage'
import ItemPage from './ItemPage'

const THEME = {
  primary: '#556B2F',
  accent: '#8FA31E',
  lightGreen: '#C6D870',
  surface: '#f8fafc',
  textDark: '#1e293b',
  textMuted: '#64748b',
  white: '#ffffff',
  borderDefault: '#cbd5e1',
  borderHover: '#475569',
  borderDivider: '#e2e8f0'
}

function isServiceItem(item) {
  if (!item) return false
  const catName = (item.category?.name || '').toLowerCase()
  const itemName = (item.name || '').toLowerCase()
  const catId = item.category?.id || 0
  return (
    catId >= 10 ||
    catName.includes('usług') ||
    catName.includes('koszenie') ||
    catName.includes('pielęgnacja') ||
    catName.includes('przygotowanie') ||
    catName.includes('karczowanie') ||
    itemName.startsWith('usługa:')
  )
}

function HomeCatalog({ currentUser, hasActiveReservations, handleLogout }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [mainType, setMainType] = useState('ALL')
  const [selectedCategory, setSelectedCategory] = useState('WSZYSTKIE')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('DEFAULT')

  const catalogSectionRef = useRef(null)

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
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const scrollToCatalog = (typeFilter) => {
    setMainType(typeFilter)
    setSelectedCategory('WSZYSTKIE')
    if (catalogSectionRef.current) {
      catalogSectionRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const availableCategories = useMemo(() => {
    const relevantItems = items.filter((item) => {
      if (mainType === 'EQUIPMENT') return !isServiceItem(item)
      if (mainType === 'SERVICE') return isServiceItem(item)
      return true
    })
    const unique = new Set(relevantItems.map((i) => i.category?.name).filter(Boolean))
    return ['WSZYSTKIE', ...Array.from(unique)]
  }, [items, mainType])

  const filteredAndSortedItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const isService = isServiceItem(item)
      if (mainType === 'EQUIPMENT' && isService) return false
      if (mainType === 'SERVICE' && !isService) return false

      const matchesCategory = selectedCategory === 'WSZYSTKIE' || item.category?.name === selectedCategory
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchesCategory && matchesSearch
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'PRICE_ASC') return Number(a.price) - Number(b.price)
      if (sortBy === 'PRICE_DESC') return Number(b.price) - Number(a.price)
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name, 'pl')
      if (sortBy === 'NAME_DESC') return b.name.localeCompare(a.name, 'pl')
      return 0
    })
  }, [items, mainType, selectedCategory, searchQuery, sortBy])

  const navIconBtnStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '38px',
    height: '38px',
    borderRadius: '4px',
    border: `1px solid ${THEME.borderDefault}`,
    backgroundColor: THEME.white,
    color: THEME.textDark,
    cursor: 'pointer',
    padding: 0,
    transition: 'border-color 0.15s ease, background-color 0.15s ease'
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: THEME.white,
      color: THEME.textDark,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes bounceArrow {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(7px); }
          60% { transform: translateY(3px); }
        }
        .scroll-arrow-anim {
          animation: bounceArrow 1.8s infinite;
        }
        @media (max-width: 640px) {
          .brand-text-container {
            display: none !important;
          }
          .navbar-inner {
            padding: 0 0.75rem !important;
          }
        }
      `}</style>

      <nav
        className="navbar-inner"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '70px',
          backgroundColor: THEME.white,
          padding: '0 2rem',
          borderBottom: `1px solid ${THEME.borderDivider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          boxSizing: 'border-box'
        }}
      >
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <img
            src={logoImage}
            alt="GardenBooking Logo"
            style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
          />
          <div className="brand-text-container">
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: THEME.primary, letterSpacing: '-0.5px' }}>
              Garden<span style={{ color: THEME.accent }}>Booking</span>
            </span>
            <span style={{ display: 'block', fontSize: '0.7rem', color: THEME.textMuted, fontWeight: 500 }}>
              SPRZĘT I USŁUGI OGRODNICZE
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            title="Kontakt"
            aria-label="Kontakt"
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            style={navIconBtnStyle}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
          >
            <Phone size={18} />
          </button>

          {currentUser ? (
            <>
              <button
                type="button"
                title="Wiadomości (Czat)"
                aria-label="Wiadomości (Czat)"
                onClick={() => alert('Moduł czatu z obsługą będzie dostępny wkrótce.')}
                style={navIconBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
              >
                <MessageSquare size={18} />
              </button>

              <button
                type="button"
                title="Powiadomienia"
                aria-label="Powiadomienia"
                onClick={() => alert('Brak nowych powiadomień.')}
                style={navIconBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
              >
                <Bell size={18} />
              </button>

              <button
                type="button"
                title="Bieżące rezerwacje i historia"
                aria-label="Bieżące rezerwacje i historia"
                onClick={() => navigate('/user?tab=RESERVATIONS')}
                style={navIconBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
              >
                <CalendarCheck size={18} />
                {hasActiveReservations && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    border: '2px solid #ffffff'
                  }} />
                )}
              </button>

              <button
                type="button"
                title={`Profil użytkownika (${currentUser.firstName || currentUser.email})`}
                aria-label="Profil użytkownika"
                onClick={() => navigate('/user?tab=PROFILE')}
                style={navIconBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
              >
                <User size={18} />
              </button>

              <button
                type="button"
                title="Wyloguj się"
                aria-label="Wyloguj się"
                onClick={handleLogout}
                style={navIconBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                title="Zaloguj się"
                aria-label="Zaloguj się"
                onClick={() => navigate('/auth?mode=LOGIN')}
                style={navIconBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
              >
                <LogIn size={18} />
              </button>

              <button
                type="button"
                title="Zarejestruj się"
                aria-label="Zarejestruj się"
                onClick={() => navigate('/auth?mode=REGISTER')}
                style={{
                  ...navIconBtnStyle,
                  backgroundColor: THEME.primary,
                  color: THEME.white,
                  border: `1px solid ${THEME.primary}`
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.primary }}
              >
                <UserPlus size={18} />
              </button>
            </>
          )}
        </div>
      </nav>

      <section style={{
        minHeight: '100vh',
        width: '100%',
        paddingTop: '70px',
        background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.accent} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxSizing: 'border-box'
      }}>
        <div style={{ height: '1rem' }} />

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
          <p style={{ fontSize: '1rem', color: '#f1f5f9', margin: '0 0 2rem 0' }}>
            Wypożycz maszynę do samodzielnej pracy lub zleć wykonanie zadania w ogrodzie.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div
              onClick={() => scrollToCatalog('EQUIPMENT')}
              style={{
                backgroundColor: THEME.white,
                borderRadius: '4px',
                padding: '2.2rem 1.5rem',
                cursor: 'pointer',
                border: `1px solid ${THEME.borderDefault}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'border-color 0.15s ease, transform 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = THEME.borderHover
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = THEME.borderDefault
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: THEME.textDark, margin: '0 0 0.5rem 0' }}>
                Wypożycz sprzęt
              </h2>
              <span style={{ fontSize: '0.9rem', color: THEME.textMuted }}>
                Kosiarki, aeratory, glebogryzarki i inne maszyny
              </span>
            </div>

            <div
              onClick={() => scrollToCatalog('SERVICE')}
              style={{
                backgroundColor: THEME.white,
                borderRadius: '4px',
                padding: '2.2rem 1.5rem',
                cursor: 'pointer',
                border: `1px solid ${THEME.borderDefault}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'border-color 0.15s ease, transform 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = THEME.borderHover
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = THEME.borderDefault
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: THEME.textDark, margin: '0 0 0.5rem 0' }}>
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
            paddingBottom: '1.8rem',
            cursor: 'pointer',
            textAlign: 'center',
            color: THEME.white,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <span style={{ fontSize: '0.88rem', fontWeight: 600, letterSpacing: '0.3px' }}>
            Przewiń w dół, aby zobaczyć pełną ofertę
          </span>
          <div className="scroll-arrow-anim" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ChevronDown size={22} />
          </div>
        </div>
      </section>

      <main
        ref={catalogSectionRef}
        style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          padding: '5.5rem 1.5rem 3rem 1.5rem',
          flex: 1,
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `Cała oferta (${items.length})` },
            { id: 'EQUIPMENT', label: `Sprzęt do wypożyczenia (${items.filter((i) => !isServiceItem(i)).length})` },
            { id: 'SERVICE', label: `Usługi ogrodnicze (${items.filter((i) => isServiceItem(i)).length})` }
          ].map((tab) => {
            const active = mainType === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { setMainType(tab.id); setSelectedCategory('WSZYSTKIE') }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: `1px solid ${active ? THEME.borderHover : THEME.borderDefault}`,
                  backgroundColor: active ? THEME.primary : THEME.surface,
                  color: active ? THEME.white : THEME.textDark,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div style={{
          backgroundColor: THEME.surface,
          padding: '1.25rem',
          borderRadius: '4px',
          border: `1px solid ${THEME.borderDefault}`,
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          alignItems: 'end'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '6px' }}>
              Szukaj w ofercie
            </label>
            <input
              type="text"
              placeholder="Wpisz nazwę, firmę (np. STIHL) lub zastosowanie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '4px',
                border: `1px solid ${THEME.borderDefault}`,
                backgroundColor: THEME.white,
                color: THEME.textDark,
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '6px' }}>
              Kategoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '4px',
                border: `1px solid ${THEME.borderDefault}`,
                backgroundColor: THEME.white,
                color: THEME.textDark,
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'WSZYSTKIE' ? 'Wszystkie kategorie' : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '6px' }}>
              Sortuj według
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '4px',
                border: `1px solid ${THEME.borderDefault}`,
                backgroundColor: THEME.white,
                color: THEME.textDark,
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="DEFAULT">Domyślne</option>
              <option value="PRICE_ASC">Cena: od najniższej</option>
              <option value="PRICE_DESC">Cena: od najwyższej</option>
              <option value="NAME_ASC">Nazwa: A - Z</option>
              <option value="NAME_DESC">Nazwa: Z - A</option>
            </select>
          </div>
        </div>

        {loading && <p style={{ textAlign: 'center', padding: '2rem', color: THEME.textMuted }}>Ładowanie katalogu...</p>}
        {error && (
          <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '4px', border: '1px solid #fecaca' }}>
            Błąd pobierania: {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '1.5rem'
          }}>
            {filteredAndSortedItems.map((item) => {
              const service = isServiceItem(item)
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: '4px',
                    border: `1px solid ${THEME.borderDefault}`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = THEME.borderHover
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = THEME.borderDefault
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div>
                    <div style={{ position: 'relative', height: '190px', backgroundColor: '#f1f5f9', borderBottom: `1px solid ${THEME.borderDivider}` }}>
                      <img
                        src={`http://localhost:8080${item.imageUrl}`}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://placehold.co/400x260/f1f5f9/475569?text=GardenBooking' }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        backgroundColor: THEME.white,
                        color: THEME.textDark,
                        border: `1px solid ${THEME.borderDefault}`,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        {service ? 'Usługa' : 'Sprzęt'}
                      </span>

                      {!service && item.brand && (
                        <span style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          backgroundColor: '#dcfce7',
                          color: '#14532d',
                          border: '1px solid #86efac',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800
                        }}>
                          {item.brand}
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '1.15rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: THEME.textMuted, fontWeight: 600 }}>
                          {item.category?.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: THEME.primary, fontWeight: 700 }}>
                          Dostępne: {item.quantity ?? 1} szt.
                        </span>
                      </div>

                      <h3 style={{ margin: '0.3rem 0 0.5rem 0', fontSize: '1.05rem', color: THEME.textDark }}>
                        {item.name}
                      </h3>
                      <p style={{ color: THEME.textMuted, fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    padding: '0.9rem 1.15rem',
                    backgroundColor: THEME.surface,
                    borderTop: `1px solid ${THEME.borderDivider}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: THEME.textMuted, display: 'block' }}>
                        {service ? 'Koszt usługi' : 'Cena za dobę'}
                      </span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: THEME.textDark }}>
                        {item.price} zł
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/item/${item.id}`)
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '4px',
                        border: `1px solid ${THEME.primary}`,
                        backgroundColor: THEME.primary,
                        color: THEME.white,
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Szczegóły i kalendarz →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer style={{
        backgroundColor: THEME.surface,
        color: THEME.textDark,
        padding: '2.5rem 2rem 1.5rem 2rem',
        marginTop: 'auto',
        width: '100%',
        borderTop: `1px solid ${THEME.borderDefault}`,
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: `1px solid ${THEME.borderDivider}`
        }}>
          <div>
            <h3 style={{ margin: '0 0 0.6rem 0', color: THEME.textDark, fontSize: '1.1rem' }}>
              GardenBooking
            </h3>
            <p style={{ color: THEME.textMuted, fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
              Internetowy system rezerwacji usług ogrodniczych oraz wypożyczalnia profesjonalnego sprzętu ogrodniczego.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.6rem 0', color: THEME.textDark, fontSize: '0.95rem' }}>Kontakt</h4>
            <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: THEME.textMuted }}>ul. Ogrodowa 15, 00-001 Warszawa</p>
            <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: THEME.textMuted }}>Tel.: +48 123 456 789</p>
            <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: THEME.textMuted }}>E-mail: kontakt@gardenbooking.pl</p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.6rem 0', color: THEME.textDark, fontSize: '0.95rem' }}>Godziny otwarcia</h4>
            <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: THEME.textMuted }}>Poniedziałek - Piątek: 08:00 - 18:00</p>
            <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: THEME.textMuted }}>Sobota: 08:00 - 14:00</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', paddingTop: '1.2rem', fontSize: '0.78rem', color: THEME.textMuted }}>
          © {new Date().getFullYear()} GardenBooking — Praca Inżynierska.
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('garden_user')
    return saved ? JSON.parse(saved) : null
  })
  const [hasActiveReservations, setHasActiveReservations] = useState(false)

  useEffect(() => {
    const uid = currentUser?.userId || currentUser?.id
    if (!uid) {
      setHasActiveReservations(false)
      return
    }
    fetch(`http://localhost:8080/api/reservations/user/${uid}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!Array.isArray(data)) return
        const now = new Date()
        const active = data.some((r) => {
          const end = new Date(r.endDate || r.endTime)
          return (isNaN(end) || end >= now) && r.status !== 'CANCELLED' && r.status !== 'COMPLETED'
        })
        setHasActiveReservations(active)
      })
      .catch(() => setHasActiveReservations(false))
  }, [currentUser])

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData)
    localStorage.setItem('garden_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setHasActiveReservations(false)
    localStorage.removeItem('garden_user')
    navigate('/')
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomeCatalog
            currentUser={currentUser}
            hasActiveReservations={hasActiveReservations}
            handleLogout={handleLogout}
          />
        }
      />
      <Route
        path="/item/:id"
        element={<ItemPage currentUser={currentUser} />}
      />
      <Route
        path="/auth"
        element={<AuthPage onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        path="/user"
        element={
          <UserPage
            currentUser={currentUser}
            onUserUpdate={handleLoginSuccess}
            onRebookItem={(item) => {
              if (item?.id) {
                navigate(`/item/${item.id}`)
              }
            }}
          />
        }
      />
    </Routes>
  )
}