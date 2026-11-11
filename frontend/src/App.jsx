import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Routes, Route } from 'react-router-dom'
import { Clock, User as UserIcon, LogIn, UserPlus, LogOut, ChevronDown } from 'lucide-react'
import logoImage from './assets/GardenBookingLogo.png'
import AuthPage from './AuthPage'
import UserPage from './UserPage'

const THEME = {
  primary: '#556B2F',
  accent: '#8FA31E',
  textDark: '#1e293b',
  textMuted: '#64748b',
  white: '#ffffff',
  bgSoft: '#f8fafc',
  borderDefault: '#cbd5e1',
  borderHover: '#475569',
  borderDivider: '#e2e8f0'
}

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

export default function App() {
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('garden_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
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
        if (Array.isArray(data)) {
          const now = new Date()
          const active = data.some((r) => {
            const end = new Date(r.endDate || r.endTime)
            return (
              (isNaN(end) || end >= now) &&
              r.status !== 'CANCELLED' &&
              r.status !== 'COMPLETED'
            )
          })
          setHasActiveReservations(active)
        }
      })
      .catch(() => setHasActiveReservations(false))
  }, [currentUser])

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('garden_user')
    navigate('/')
  }

  const [rebookPrefill, setRebookPrefill] = useState(null)

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomeView
            currentUser={currentUser}
            hasActiveReservations={hasActiveReservations}
            onLogout={handleLogout}
            rebookPrefill={rebookPrefill}
            onClearRebook={() => setRebookPrefill(null)}
          />
        }
      />
      <Route
        path="/auth"
        element={
          <AuthPage
            onLoginSuccess={(user) => {
              setCurrentUser(user)
              localStorage.setItem('garden_user', JSON.stringify(user))
              navigate('/')
            }}
          />
        }
      />
      <Route
        path="/user"
        element={
          <UserPage
            currentUser={currentUser}
            onUserUpdate={(updated) => {
              setCurrentUser(updated)
              localStorage.setItem('garden_user', JSON.stringify(updated))
            }}
            onRebookItem={(item) => {
              setRebookPrefill(item)
            }}
          />
        }
      />
    </Routes>
  )
}

function HomeView({ currentUser, hasActiveReservations, onLogout, rebookPrefill, onClearRebook }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [offerType, setOfferType] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [sortBy, setSortBy] = useState('DEFAULT')

  const [selectedItem, setSelectedItem] = useState(null)
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    deliveryType: 'PICKUP',
    street: '',
    city: '',
    postalCode: ''
  })
  const [statusMessage, setStatusMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

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

  useEffect(() => {
    if (rebookPrefill && items.length > 0) {
      const target = items.find((it) => it.id === rebookPrefill.id)
      if (target) {
        setSelectedItem(target)
        setStatusMessage(null)
        if (currentUser) {
          setFormData((prev) => ({
            ...prev,
            guestName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
            guestEmail: currentUser.email || '',
            guestPhone: currentUser.phoneNumber || ''
          }))
        }
      }
      onClearRebook()
    }
  }, [rebookPrefill, items, currentUser, onClearRebook])

  const handleOfferTypeChange = (newType) => {
    setOfferType(newType)
    setSelectedCategory('ALL')
  }

  const currentCategories = useMemo(() => {
    if (offerType === 'SERVICE') return SERVICE_CATEGORIES
    if (offerType === 'EQUIPMENT') return EQUIPMENT_CATEGORIES
    return [
      { id: 'ALL', name: 'Wszystkie kategorie (sprzęt i usługi)' },
      ...EQUIPMENT_CATEGORIES.filter((c) => c.id !== 'ALL'),
      ...SERVICE_CATEGORIES.filter((c) => c.id !== 'ALL')
    ]
  }, [offerType])

  const processedItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const isServiceItem =
        item.category?.name?.toLowerCase().includes('usług') ||
        item.name?.toLowerCase().includes('usługa') ||
        item.description?.toLowerCase().includes('usługa')

      let matchesOfferType = true
      if (offerType === 'EQUIPMENT') matchesOfferType = !isServiceItem
      if (offerType === 'SERVICE') matchesOfferType = isServiceItem

      const matchesCategory =
        selectedCategory === 'ALL' ||
        (item.category && item.category.id === Number(selectedCategory)) ||
        item.categoryId === Number(selectedCategory)

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

  const scrollToCatalog = (type = null) => {
    if (type) handleOfferTypeChange(type)
    const catalogSection = document.getElementById('catalog-section')
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const calculateTotal = () => {
    if (!selectedItem || !formData.startDate || !formData.endDate) return 0
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const diffTime = end - start
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const days = diffDays > 0 ? diffDays : 1
    const deliveryCost = formData.deliveryType === 'DELIVERY' ? 50 : 0
    return days * selectedItem.price + deliveryCost
  }

  const handleSubmitReservation = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setStatusMessage(null)

    const payload = {
      itemId: selectedItem.id,
      userId: currentUser?.userId || currentUser?.id || null,
      startDate: formData.startDate,
      endDate: formData.endDate,
      guestName: formData.guestName,
      guestEmail: formData.guestEmail,
      guestPhone: formData.guestPhone,
      deliveryType: formData.deliveryType,
      street: formData.deliveryType === 'DELIVERY' ? formData.street : '',
      city: formData.deliveryType === 'DELIVERY' ? formData.city : '',
      postalCode: formData.deliveryType === 'DELIVERY' ? formData.postalCode : '',
      paymentType: 'BLIK'
    }

    try {
      const response = await fetch('http://localhost:8080/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        setStatusMessage({ type: 'success', text: result.message || 'Rezerwacja została pomyślnie złożona!' })
      } else {
        setStatusMessage({ type: 'error', text: result.message || 'Wybrany termin koliduje z inną rezerwacją.' })
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Błąd połączenia z serwerem.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100%', 
      margin: 0, 
      padding: 0, 
      backgroundColor: '#f1f5f9', 
      color: THEME.textDark, 
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      <style>{`
        @keyframes pulseRedDot {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
          70% { transform: scale(1.15); box-shadow: 0 0 0 5px rgba(220, 38, 38, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        @keyframes bounceArrow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        .active-reservation-dot {
          position: absolute;
          top: -3px;
          right: -3px;
          width: 9px;
          height: 9px;
          background-color: #dc2626;
          border-radius: 50%;
          border: 1.5px solid #ffffff;
          animation: pulseRedDot 1.8s infinite;
          pointer-events: none;
          z-index: 30;
        }
        .bounce-arrow {
          animation: bounceArrow 1.5s ease-in-out infinite;
          display: inline-flex;
          margin-top: 4px;
        }
        .icon-btn {
          width: 38px;
          height: 38px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background-color: ${THEME.bgSoft};
          border: 1px solid ${THEME.borderDefault};
          border-radius: 4px;
          color: ${THEME.textDark};
          cursor: pointer;
          transition: border-color 0.15s ease, background-color 0.15s ease;
        }
        .icon-btn:hover {
          border-color: ${THEME.borderHover};
          background-color: ${THEME.white};
        }
        @media (max-width: 768px) {
          .brand-text-container {
            display: none !important;
          }
          .icon-btn {
            width: 36px !important;
            height: 36px !important;
          }
          .main-navbar {
            padding: 0 1rem !important;
          }
        }
      `}</style>

      <nav className="main-navbar" style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '65px',
        backgroundColor: THEME.white, 
        borderBottom: `1px solid ${THEME.borderDivider}`, 
        zIndex: 100, 
        padding: '0 2rem', 
        width: '100%', 
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
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
              style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
            />
            <div className="brand-text-container">
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.primary, letterSpacing: '-0.5px', display: 'block', lineHeight: 1.1 }}>
                Garden<span style={{ color: THEME.accent, fontWeight: 700 }}>Booking</span>
              </span>
              <span style={{ fontSize: '0.68rem', display: 'block', color: THEME.textMuted, fontWeight: 600, letterSpacing: '0.5px' }}>
                WYPOŻYCZALNIA SPRZĘTU I USŁUGI OGRODNICZE
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {currentUser ? (
              <>
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <button
                    className="icon-btn"
                    onClick={() => navigate('/user?tab=RESERVATIONS')}
                    title="Bieżące rezerwacje i historia"
                    aria-label="Bieżące rezerwacje i historia"
                  >
                    <Clock size={17} />
                  </button>
                  {hasActiveReservations && <span className="active-reservation-dot" />}
                </div>

                <button
                  className="icon-btn"
                  onClick={() => navigate('/user?tab=PROFILE')}
                  title={`Profil użytkownika (${currentUser.firstName || 'Konto'})`}
                  aria-label="Profil użytkownika"
                >
                  <UserIcon size={17} />
                </button>

                <button
                  className="icon-btn"
                  onClick={onLogout}
                  title="Wyloguj się"
                  aria-label="Wyloguj się"
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <>
                <button 
                  className="icon-btn"
                  onClick={() => navigate('/auth')}
                  title="Zaloguj się"
                  aria-label="Zaloguj się"
                >
                  <LogIn size={17} />
                </button>

                <button 
                  className="icon-btn"
                  onClick={() => navigate('/auth')}
                  title="Zarejestruj się"
                  aria-label="Zarejestruj się"
                  style={{ backgroundColor: THEME.primary, color: THEME.white, borderColor: THEME.primary }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = THEME.borderHover; e.currentTarget.style.borderColor = THEME.borderHover }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = THEME.primary; e.currentTarget.style.borderColor = THEME.primary }}
                >
                  <UserPlus size={17} color={THEME.white} />
                </button>
              </>
            )}
          </div>

        </div>
      </nav>

      <div style={{ 
        minHeight: '100vh',
        paddingTop: '65px',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        backgroundColor: THEME.primary,
        boxSizing: 'border-box'
      }}>

        <div style={{ height: '1rem' }}></div>

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
          <p style={{ fontSize: '0.98rem', color: '#e2e8f0', margin: '0 0 2rem 0' }}>
            Wypożycz maszynę do samodzielnej pracy lub zleć wykonanie zadania w ogrodzie.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>

            <div 
              onClick={() => scrollToCatalog('EQUIPMENT')}
              style={{
                backgroundColor: THEME.white,
                borderRadius: '4px',
                padding: '2rem 1.5rem',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                border: `1px solid ${THEME.borderDefault}`,
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
            >
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: THEME.textDark, margin: '0 0 0.4rem 0' }}>
                Wypożycz sprzęt
              </h2>
              <span style={{ fontSize: '0.88rem', color: THEME.textMuted }}>
                Kosiarki, aeratory, glebogryzarki i inne maszyny
              </span>
            </div>

            <div 
              onClick={() => scrollToCatalog('SERVICE')}
              style={{
                backgroundColor: THEME.white,
                borderRadius: '4px',
                padding: '2rem 1.5rem',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                border: `1px solid ${THEME.borderDefault}`,
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
            >
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: THEME.textDark, margin: '0 0 0.4rem 0' }}>
                Zamów usługę
              </h2>
              <span style={{ fontSize: '0.88rem', color: THEME.textMuted }}>
                Koszenie, aeracja oraz kompleksowe prace ogrodowe
              </span>
            </div>

          </div>
        </div>

        <div 
          onClick={() => scrollToCatalog('ALL')}
          style={{ 
            textAlign: 'center', 
            paddingBottom: '2.5rem', 
            cursor: 'pointer',
            color: '#f8fafc',
            userSelect: 'none'
          }}
        >
          <div style={{ fontSize: '0.84rem', fontWeight: 600, letterSpacing: '0.5px' }}>
            lub przeglądaj całą ofertę
          </div>
          <div className="bounce-arrow">
            <ChevronDown size={22} />
          </div>
        </div>

      </div>

      <main id="catalog-section" style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: '3rem 1.25rem 2.5rem 1.25rem', 
        width: '100%', 
        boxSizing: 'border-box' 
      }}>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: `1px solid ${THEME.borderDivider}`, paddingBottom: '0.75rem', overflowX: 'auto' }}>
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  border: `1px solid ${isActive ? THEME.borderHover : THEME.borderDefault}`,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: isActive ? THEME.primary : THEME.bgSoft,
                  color: isActive ? THEME.white : THEME.textDark,
                  whiteSpace: 'nowrap',
                  transition: 'border-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = THEME.borderHover
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = THEME.borderDefault
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div style={{ 
          backgroundColor: THEME.white, 
          padding: '1.25rem', 
          borderRadius: '4px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', 
          border: `1px solid ${THEME.borderDefault}`, 
          marginBottom: '2rem', 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
              Wyszukaj po nazwie
            </label>
            <input
              type="text"
              placeholder="np. kosiarka spalinowa, aeracja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 10px', 
                borderRadius: '4px', 
                border: `1px solid ${THEME.borderDefault}`, 
                fontSize: '0.88rem',
                backgroundColor: THEME.white,
                color: THEME.textDark,
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
              onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
              Kategoria {offerType === 'EQUIPMENT' ? '(sprzęt)' : offerType === 'SERVICE' ? '(usługi)' : ''}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '4px',
                border: `1px solid ${THEME.borderDefault}`, 
                fontSize: '0.88rem',
                backgroundColor: THEME.white,
                color: THEME.textDark,
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
              onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
            >
              {currentCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
              Sortuj według
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '4px',
                border: `1px solid ${THEME.borderDefault}`, 
                fontSize: '0.88rem',
                backgroundColor: THEME.white,
                color: THEME.textDark,
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
              onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
            >
              <option value="DEFAULT">Domyślnie</option>
              <option value="PRICE_ASC">Cena: rosnąco</option>
              <option value="PRICE_DESC">Cena: malejąco</option>
              <option value="NAME_ASC">Nazwa: A - Z</option>
              <option value="NAME_DESC">Nazwa: Z - A</option>
            </select>
          </div>

        </div>

        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: THEME.textDark }}>
            {offerType === 'EQUIPMENT' ? 'Sprzęt ogrodniczy' : offerType === 'SERVICE' ? 'Usługi ogrodnicze' : 'Wszystkie pozycje'} ({processedItems.length})
          </h2>
        </div>

        {loading && <p style={{ textAlign: 'center', padding: '3rem', color: THEME.textMuted }}>Ładowanie katalogu...</p>}
        {error && <p style={{ color: '#dc2626', background: '#fef2f2', padding: '1rem', borderRadius: '4px', border: `1px solid #fecaca` }}>Błąd pobierania: {error}</p>}

        {!loading && processedItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: THEME.white, borderRadius: '4px', border: `1px dashed ${THEME.borderDefault}` }}>
            <p style={{ margin: 0, color: THEME.textMuted, fontSize: '0.9rem' }}>Brak ofert spełniających wybrane kryteria.</p>
          </div>
        )}

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
          gap: '1.25rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {processedItems.map((item) => (
            <div 
              key={item.id} 
              style={{ 
                backgroundColor: THEME.white, 
                border: `1px solid ${THEME.borderDefault}`, 
                borderRadius: '4px', 
                overflow: 'hidden', 
                display: 'flex', 
                flexDirection: 'column', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'border-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
            >
              <div style={{ position: 'relative', width: '100%', height: '190px', backgroundColor: '#f1f5f9' }}>
                <img
                  src={`http://localhost:8080${item.imageUrl}`}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = 'https://placehold.co/400x250?text=GardenBooking' }}
                />
                <span style={{ 
                  position: 'absolute', 
                  top: '8px', 
                  right: '8px', 
                  backgroundColor: item.isAvailable ? '#f0fdf4' : '#fef2f2', 
                  color: item.isAvailable ? '#15803d' : '#b91c1c', 
                  border: `1px solid ${item.isAvailable ? '#bbf7d0' : '#fecaca'}`,
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  padding: '2px 6px', 
                  borderRadius: '3px' 
                }}>
                  {item.isAvailable ? 'Dostępny' : 'Zajęty'}
                </span>
              </div>

              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', fontWeight: 700, color: THEME.textDark }}>{item.name}</h3>
                <p style={{ margin: '0 0 0.9rem 0', fontSize: '0.8rem', color: THEME.textMuted, flex: 1, lineHeight: 1.45 }}>
                  {item.description || 'Profesjonalna pozycja gotowa do rezerwacji.'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: `1px solid ${THEME.borderDivider}` }}>
                  <div>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700, color: THEME.textDark }}>{item.price} zł</span>
                    <span style={{ fontSize: '0.78rem', color: THEME.textMuted }}> / doba</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedItem(item)
                      setStatusMessage(null)
                      if (currentUser) {
                        setFormData((prev) => ({
                          ...prev,
                          guestName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
                          guestEmail: currentUser.email || '',
                          guestPhone: currentUser.phoneNumber || ''
                        }))
                      }
                    }}
                    disabled={!item.isAvailable}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: item.isAvailable ? THEME.primary : '#94a3b8',
                      color: THEME.white,
                      border: `1px solid ${THEME.borderDefault}`,
                      padding: '6px 14px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: item.isAvailable ? 'pointer' : 'not-allowed',
                      transition: 'border-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (item.isAvailable) e.currentTarget.style.borderColor = THEME.borderHover
                    }}
                    onMouseLeave={(e) => {
                      if (item.isAvailable) e.currentTarget.style.borderColor = THEME.borderDefault
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

      <footer style={{ 
        backgroundColor: THEME.white, 
        color: THEME.textDark, 
        padding: '2.5rem 1.25rem 1.5rem 1.25rem', 
        marginTop: '3.5rem',
        borderTop: `1px solid ${THEME.borderDivider}`,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
              <img src={logoImage} alt="GardenBooking" style={{ height: '30px' }} />
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: THEME.primary }}>GardenBooking</span>
            </div>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.5, margin: 0, color: THEME.textMuted }}>
              Zintegrowany system rezerwacji maszyn i usług ogrodniczych.
            </p>
          </div>

          <div>
            <h4 style={{ color: THEME.textDark, fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.8rem 0' }}>Kontakt z nami</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', lineHeight: 1.8, color: THEME.textMuted }}>
              <li>ul. Ogrodowa 15, 90-001 Łódź</li>
              <li>Tel: +48 123 456 789</li>
              <li>E-mail: kontakt@gardenbooking.pl</li>
              <li>Pon. - Sob.: 7:00 - 19:00</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: THEME.textDark, fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.8rem 0' }}>Informacje</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', lineHeight: 1.8, color: THEME.textMuted }}>
              <li>• Regulamin wypożyczalni</li>
              <li>• Polityka prywatności i RODO</li>
              <li>• Cennik transportu maszyn</li>
              <li>• Protokół zdawczo-odbiorczy</li>
            </ul>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${THEME.borderDivider}`, paddingTop: '1.25rem', textAlign: 'center', fontSize: '0.75rem', color: THEME.textMuted }}>
          © {new Date().getFullYear()} GardenBooking. Wszelkie prawa zastrzeżone.
        </div>
      </footer>

      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: '1rem', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: THEME.white, borderRadius: '4px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: THEME.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Formularz rezerwacji</span>
                <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.15rem', color: THEME.textDark }}>{selectedItem.name}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: THEME.textMuted }}>✕</button>
            </div>

            {statusMessage && (
              <div style={{ 
                padding: '9px 12px', 
                borderRadius: '4px', 
                marginBottom: '1rem', 
                backgroundColor: statusMessage.type === 'success' ? '#f0fdf4' : '#fef2f2', 
                color: statusMessage.type === 'success' ? '#15803d' : '#b91c1c', 
                border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                fontSize: '0.82rem', 
                fontWeight: 600 
              }}>
                {statusMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmitReservation} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted }}>
                  Data odbioru:
                  <input
                    type="datetime-local"
                    required
                    style={{ width: '100%', padding: '7px 9px', marginTop: '3px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, boxSizing: 'border-box', outline: 'none' }}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted }}>
                  Data zwrotu:
                  <input
                    type="datetime-local"
                    required
                    style={{ width: '100%', padding: '7px 9px', marginTop: '3px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, boxSizing: 'border-box', outline: 'none' }}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                  />
                </label>
              </div>

              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted }}>
                Imię i nazwisko:
                <input
                  type="text"
                  required
                  value={formData.guestName}
                  placeholder="np. Jan Kowalski"
                  style={{ width: '100%', padding: '7px 9px', marginTop: '3px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, boxSizing: 'border-box', outline: 'none' }}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted }}>
                  Adres e-mail:
                  <input
                    type="email"
                    required
                    value={formData.guestEmail}
                    placeholder="kontakt@domena.pl"
                    style={{ width: '100%', padding: '7px 9px', marginTop: '3px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, boxSizing: 'border-box', outline: 'none' }}
                    onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                    onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted }}>
                  Numer telefonu:
                  <input
                    type="tel"
                    required
                    value={formData.guestPhone}
                    placeholder="600 700 800"
                    style={{ width: '100%', padding: '7px 9px', marginTop: '3px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, boxSizing: 'border-box', outline: 'none' }}
                    onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                    onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                  />
                </label>
              </div>

              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted }}>
                Opcja transportu:
                <select
                  style={{ width: '100%', padding: '7px 9px', marginTop: '3px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, boxSizing: 'border-box', outline: 'none' }}
                  value={formData.deliveryType}
                  onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                  onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                >
                  <option value="PICKUP">Odbiór osobisty w punkcie (0 zł)</option>
                  <option value="DELIVERY">Dowóz sprzętu na wskazany adres (+50 zł)</option>
                </select>
              </label>

              {formData.deliveryType === 'DELIVERY' && (
                <div style={{ backgroundColor: THEME.bgSoft, padding: '9px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '6px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}>
                  <input
                    type="text"
                    placeholder="Ulica i numer posesji"
                    required
                    style={{ padding: '7px 9px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, boxSizing: 'border-box', outline: 'none' }}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Miejscowość"
                      required
                      style={{ padding: '7px 9px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, boxSizing: 'border-box', outline: 'none' }}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                    />
                    <input
                      type="text"
                      placeholder="Kod pocztowy"
                      required
                      style={{ padding: '7px 9px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, boxSizing: 'border-box', outline: 'none' }}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                    />
                  </div>
                </div>
              )}

              <div style={{ backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, padding: '10px', borderRadius: '4px', textAlign: 'right', marginTop: '2px' }}>
                <span style={{ fontSize: '0.82rem', color: THEME.textMuted, fontWeight: 600 }}>Łączny szacowany koszt: </span>
                <strong style={{ fontSize: '1.15rem', color: THEME.textDark }}>{calculateTotal()} zł</strong>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', fontWeight: 600, cursor: 'pointer', color: THEME.textDark }}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: THEME.primary, color: THEME.white, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Przetwarzanie...' : 'Zatwierdź rezerwację'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}