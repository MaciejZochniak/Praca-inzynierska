import { useEffect, useState, useMemo } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { 
  Phone, 
  MessageSquare, 
  Bell, 
  CalendarDays, 
  User as UserIcon, 
  LogOut, 
  LogIn 
} from 'lucide-react'
import logoImage from './assets/GardenBookingLogo.png'
import AuthPage from './AuthPage'
import UserPage from './UserPage'

const THEME = {
  primary: '#556B2F',
  accent: '#8FA31E',
  border: '#C6D870',
  surface: '#EFF5D2',
  textDark: '#1e293b',
  textMuted: '#64748b',
  white: '#ffffff'
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

function HomePage({ currentUser, onLogout }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filtrowanie i wyszukiwanie
  const [offerType, setOfferType] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [sortBy, setSortBy] = useState('DEFAULT')

  // Stan rezerwacji (Modal)
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

  const handleOfferTypeChange = (newType) => {
    setOfferType(newType)
    setSelectedCategory('ALL')
  }

  const currentCategories = useMemo(() => {
    if (offerType === 'SERVICE') return SERVICE_CATEGORIES
    if (offerType === 'EQUIPMENT') return EQUIPMENT_CATEGORIES
    return [
      { id: 'ALL', name: 'Wszystkie kategorie (sprzęt i usługi)' },
      ...EQUIPMENT_CATEGORIES.filter(c => c.id !== 'ALL'),
      ...SERVICE_CATEGORIES.filter(c => c.id !== 'ALL')
    ]
  }, [offerType])

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

  const scrollToCatalog = (type = null) => {
    if (type) handleOfferTypeChange(type)
    const catalogSection = document.getElementById('catalog-section')
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-section')
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' })
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
    return (days * selectedItem.price) + deliveryCost
  }

  const handleSubmitReservation = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setStatusMessage(null)

    const payload = {
      itemId: selectedItem.id,
      startDate: formData.startDate,
      endDate: formData.endDate,
      userId: currentUser ? currentUser.userId : null,
      guestName: currentUser ? null : formData.guestName,
      guestEmail: currentUser ? null : formData.guestEmail,
      guestPhone: currentUser ? null : formData.guestPhone,
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
    <div style={{ minHeight: '100vh', width: '100%', margin: 0, padding: 0, backgroundColor: '#fafaf9', color: THEME.textDark, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* STYLE RWD: NA TELEFONIE UKRYWAMY NAZWĘ FIRMY I ZMNIEJSZAMY MARGINESY */}
      <style>{`
        @media (max-width: 640px) {
          .brand-text-container {
            display: none !important;
          }
          .main-navbar {
            padding: 0 0.75rem !important;
          }
          .nav-icons-container {
            gap: 0.35rem !important;
          }
          .nav-icon-btn {
            width: 35px !important;
            height: 35px !important;
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
        padding: '0 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)' 
      }}>
        <div style={{ maxWidth: '1380px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          
          {/* Logo i nazwa firmy (tekst znika automatycznie na telefonach) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', flexShrink: 0 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logoImage} alt="GardenBooking Logo" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
            <div className="brand-text-container">
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.primary, letterSpacing: '-0.5px', display: 'block', lineHeight: 1.1 }}>
                Garden<span style={{ color: THEME.accent, fontWeight: 700 }}>Booking</span>
              </span>
              <span style={{ fontSize: '0.65rem', display: 'block', color: THEME.textMuted, fontWeight: 600 }}>
                WYPOŻYCZALNIA SPRZĘTU I USŁUGI OGRODNICZE
              </span>
            </div>
          </div>

          {/* Przyciski ikonowe w navbarze */}
          <div className="nav-icons-container" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            {/* Kontakt (telefon) */}
            <button
              onClick={scrollToContact}
              title="Przejdź do kontaktu"
              className="nav-icon-btn"
              style={{
                backgroundColor: 'transparent',
                color: THEME.primary,
                border: `1.5px solid ${THEME.primary}`,
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Phone size={18} />
            </button>

            {currentUser ? (
              <>
                {/* Czat */}
                <button
                  onClick={() => alert('Moduł Czatu: bezpośrednia komunikacja z obsługą.')}
                  title="Czat z obsługą"
                  className="nav-icon-btn"
                  style={{
                    backgroundColor: THEME.surface,
                    color: THEME.primary,
                    border: `1px solid ${THEME.border}`,
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <MessageSquare size={18} />
                </button>

                {/* Powiadomienia */}
                <button
                  onClick={() => alert('Powiadomienia i przypomnienia terminów.')}
                  title="Powiadomienia i przypomnienia"
                  className="nav-icon-btn"
                  style={{
                    backgroundColor: THEME.surface,
                    color: THEME.primary,
                    border: `1px solid ${THEME.border}`,
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Bell size={18} />
                </button>

                {/* Bieżące rezerwacje */}
                <button
                  onClick={() => alert('Bieżące rezerwacje: historia i aktywne zlecenia.')}
                  title="Bieżące rezerwacje"
                  className="nav-icon-btn"
                  style={{
                    backgroundColor: THEME.surface,
                    color: THEME.primary,
                    border: `1px solid ${THEME.border}`,
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <CalendarDays size={18} />
                </button>

                {/* Zarządzanie kontem */}
                <button
                  onClick={() => navigate('/user')}
                  type="button"
                  title={`Zarządzaj kontem (${currentUser.firstName || currentUser.email})`}
                  className="nav-icon-btn"
                  style={{
                    backgroundColor: THEME.primary,
                    color: THEME.white,
                    border: 'none',
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <UserIcon size={18} />
                </button>

                {/* Wyloguj */}
                <button
                  onClick={onLogout}
                  title="Wyloguj się"
                  className="nav-icon-btn"
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fca5a5',
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button 
                onClick={() => navigate('/auth')}
                title="Zaloguj się lub zarejestruj"
                className="nav-icon-btn"
                style={{ 
                  backgroundColor: THEME.primary, 
                  color: THEME.white, 
                  border: 'none', 
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <LogIn size={18} />
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* 2. EKRAN POWITALNY */}
      <div style={{ minHeight: '100vh', paddingTop: '70px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: THEME.primary, boxSizing: 'border-box' }}>
        <div style={{ height: '1.5rem' }}></div>
        <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', padding: '1rem 1.5rem', textAlign: 'center', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: THEME.white, margin: '0 0 0.5rem 0' }}>Wybierz czego potrzebujesz</h1>
          <p style={{ fontSize: '1rem', color: THEME.surface, margin: '0 0 2rem 0' }}>Wypożycz maszynę do samodzielnej pracy lub zleć wykonanie zadania w ogrodzie.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div onClick={() => scrollToCatalog('EQUIPMENT')} style={{ backgroundColor: THEME.white, borderRadius: '16px', padding: '2.2rem 1.5rem', cursor: 'pointer', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: THEME.primary, margin: '0 0 0.5rem 0' }}>Wypożycz sprzęt</h2>
              <span style={{ fontSize: '0.9rem', color: THEME.textMuted }}>Kosiarki, aeratory, glebogryzarki i inne maszyny</span>
            </div>
            <div onClick={() => scrollToCatalog('SERVICE')} style={{ backgroundColor: THEME.white, borderRadius: '16px', padding: '2.2rem 1.5rem', cursor: 'pointer', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: THEME.primary, margin: '0 0 0.5rem 0' }}>Zamów usługę</h2>
              <span style={{ fontSize: '0.9rem', color: THEME.textMuted }}>Koszenie, aeracja oraz kompleksowe prace ogrodowe</span>
            </div>
          </div>
        </div>

        <div onClick={() => scrollToCatalog('ALL')} style={{ textAlign: 'center', paddingBottom: '2rem', cursor: 'pointer', color: THEME.surface }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>lub przeglądaj całą ofertę</div>
          <div style={{ fontSize: '1.5rem' }}>↓</div>
        </div>
      </div>

      {/* 3. KATALOG OFERT */}
      <main id="catalog-section" style={{ maxWidth: '1280px', margin: '0 auto', padding: '3.5rem 1.25rem 2.5rem 1.25rem', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: `2px solid ${THEME.surface}`, paddingBottom: '0.75rem', overflowX: 'auto' }}>
          {[
            { id: 'ALL', label: 'Wszystkie pozycje' },
            { id: 'EQUIPMENT', label: 'Sprzęt ogrodniczy' },
            { id: 'SERVICE', label: 'Usługi ogrodnicze' }
          ].map((tab) => (
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
                backgroundColor: offerType === tab.id ? THEME.primary : THEME.surface,
                color: offerType === tab.id ? THEME.white : THEME.primary,
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel filtrów */}
        <div style={{ backgroundColor: THEME.white, padding: '1.25rem', borderRadius: '12px', border: `1.5px solid ${THEME.surface}`, marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', boxSizing: 'border-box' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>Wyszukaj po nazwie</label>
            <input
              type="text"
              placeholder="np. kosiarka spalinowa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: `1.5px solid ${THEME.border}`, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>Kategoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: `1.5px solid ${THEME.border}`, outline: 'none', boxSizing: 'border-box' }}
            >
              {currentCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>Sortuj według</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: `1.5px solid ${THEME.border}`, outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="DEFAULT">Domyślnie</option>
              <option value="PRICE_ASC">Cena: rosnąco</option>
              <option value="PRICE_DESC">Cena: malejąco</option>
              <option value="NAME_ASC">Nazwa: A - Z</option>
              <option value="NAME_DESC">Nazwa: Z - A</option>
            </select>
          </div>
        </div>

        {loading && <p style={{ textAlign: 'center', padding: '3rem', color: THEME.textMuted }}>Ładowanie katalogu...</p>}
        {error && <p style={{ color: '#dc2626', background: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>Błąd: {error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem', boxSizing: 'border-box' }}>
          {processedItems.map((item) => (
            <div key={item.id} style={{ backgroundColor: THEME.white, border: `1.5px solid ${THEME.surface}`, borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', width: '100%', height: '200px', backgroundColor: THEME.surface }}>
                <img src={`http://localhost:8080${item.imageUrl}`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://placehold.co/400x250?text=GardenBooking' }} />
                <span style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: item.isAvailable ? THEME.surface : '#fee2e2', color: item.isAvailable ? THEME.primary : '#991b1b', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '10px' }}>
                  {item.isAvailable ? 'Dostępny' : 'Zajęty'}
                </span>
              </div>
              <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem', fontWeight: 700 }}>{item.name}</h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: THEME.textMuted, flex: 1 }}>{item.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '0.8rem', borderTop: `1px solid ${THEME.surface}` }}>
                  <div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.primary }}>{item.price} zł</span>
                    <span style={{ fontSize: '0.8rem', color: THEME.textMuted }}> / doba</span>
                  </div>
                  <button onClick={() => { setSelectedItem(item); setStatusMessage(null) }} disabled={!item.isAvailable} style={{ backgroundColor: item.isAvailable ? THEME.primary : '#cbd5e1', color: THEME.white, border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: item.isAvailable ? 'pointer' : 'not-allowed' }}>
                    Zarezerwuj
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 4. MODAL REZERWACJI */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(30, 41, 59, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: '1rem', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: THEME.white, borderRadius: '14px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: THEME.primary, fontWeight: 700, textTransform: 'uppercase' }}>
                  {currentUser ? 'Rezerwacja dla klienta' : 'Formularz rezerwacji (Gość)'}
                </span>
                <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem' }}>{selectedItem.name}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            {statusMessage && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '1rem', backgroundColor: statusMessage.type === 'success' ? THEME.surface : '#fee2e2', color: statusMessage.type === 'success' ? THEME.primary : '#991b1b', fontSize: '0.88rem', fontWeight: 600 }}>
                {statusMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmitReservation} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Data odbioru:
                  <input type="datetime-local" required style={{ width: '100%', padding: '7px', marginTop: '3px', borderRadius: '6px', border: `1px solid ${THEME.border}`, boxSizing: 'border-box' }} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                </label>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Data zwrotu:
                  <input type="datetime-local" required style={{ width: '100%', padding: '7px', marginTop: '3px', borderRadius: '6px', border: `1px solid ${THEME.border}`, boxSizing: 'border-box' }} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                </label>
              </div>

              {!currentUser ? (
                <>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Imię i nazwisko:
                    <input type="text" required placeholder="np. Jan Kowalski" style={{ width: '100%', padding: '7px', marginTop: '3px', borderRadius: '6px', border: `1px solid ${THEME.border}`, boxSizing: 'border-box' }} onChange={(e) => setFormData({ ...formData, guestName: e.target.value })} />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Adres e-mail:
                      <input type="email" required placeholder="kontakt@domena.pl" style={{ width: '100%', padding: '7px', marginTop: '3px', borderRadius: '6px', border: `1px solid ${THEME.border}`, boxSizing: 'border-box' }} onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })} />
                    </label>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Numer telefonu:
                      <input type="tel" required placeholder="123 456 789" style={{ width: '100%', padding: '7px', marginTop: '3px', borderRadius: '6px', border: `1px solid ${THEME.border}`, boxSizing: 'border-box' }} onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })} />
                    </label>
                  </div>
                </>
              ) : (
                <div style={{ padding: '8px 12px', backgroundColor: THEME.surface, borderRadius: '6px', border: `1px solid ${THEME.border}`, fontSize: '0.85rem' }}>
                  Dane rezerwującego: <strong>{currentUser.firstName} {currentUser.lastName}</strong> ({currentUser.email})
                </div>
              )}

              <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Opcja transportu:
                <select style={{ width: '100%', padding: '7px', marginTop: '3px', borderRadius: '6px', border: `1px solid ${THEME.border}`, boxSizing: 'border-box' }} value={formData.deliveryType} onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}>
                  <option value="PICKUP">Odbiór osobisty w punkcie (0 zł)</option>
                  <option value="DELIVERY">Dowóz sprzętu na wskazany adres (+50 zł)</option>
                </select>
              </label>

              {formData.deliveryType === 'DELIVERY' && (
                <div style={{ background: THEME.surface, padding: '9px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px', border: `1px solid ${THEME.border}`, boxSizing: 'border-box' }}>
                  <input type="text" placeholder="Ulica i numer posesji" required style={{ padding: '7px', borderRadius: '4px', border: `1px solid ${THEME.border}`, boxSizing: 'border-box' }} onChange={(e) => setFormData({ ...formData, street: e.target.value })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '6px' }}>
                    <input type="text" placeholder="Miejscowość" required style={{ padding: '7px', borderRadius: '4px', border: `1px solid ${THEME.border}`, boxSizing: 'border-box' }} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                    <input type="text" placeholder="Kod pocztowy" required style={{ padding: '7px', borderRadius: '4px', border: `1px solid ${THEME.border}`, boxSizing: 'border-box' }} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} />
                  </div>
                </div>
              )}

              <div style={{ backgroundColor: THEME.surface, border: `1.5px solid ${THEME.border}`, padding: '10px', borderRadius: '6px', textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', color: THEME.primary, fontWeight: 600 }}>Łączny szacowany koszt: </span>
                <strong style={{ fontSize: '1.25rem', color: THEME.primary }}>{calculateTotal()} zł</strong>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
                <button type="button" onClick={() => setSelectedItem(null)} style={{ flex: 1, padding: '9px', backgroundColor: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: '6px', fontWeight: 600, cursor: 'pointer', color: THEME.primary }}>
                  Anuluj
                </button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '9px', backgroundColor: THEME.primary, color: THEME.white, border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>
                  {submitting ? 'Przetwarzanie...' : 'Zatwierdź rezerwację'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. STOPKA DOLNA Z DEDYKOWANĄ SEKCJĄ KONTAKTOWĄ */}
      <footer id="contact-section" style={{ 
        backgroundColor: THEME.primary, 
        color: THEME.surface, 
        padding: '3rem 1.5rem 1.5rem 1.5rem', 
        marginTop: '4rem',
        borderTop: `3px solid ${THEME.accent}`,
        boxSizing: 'border-box'
      }}>
        <div style={{ 
          maxWidth: '1280px', 
          margin: '0 auto', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: '2.5rem',
          paddingBottom: '2.5rem',
          borderBottom: '1px solid rgba(239, 245, 210, 0.2)'
        }}>
          {/* Kolumna 1: Informacje o firmie */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
              <img src={logoImage} alt="GardenBooking" style={{ height: '36px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: THEME.white }}>
                GardenBooking
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: THEME.surface, margin: '0 0 1rem 0' }}>
              Internetowy system rezerwacji maszyn i usług ogrodniczych. Wygodny wynajem sprzętu z opcją dowozu lub odbiorem osobistym.
            </p>
          </div>

          {/* Kolumna 2: Dane kontaktowe */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: THEME.white, marginBottom: '0.9rem', borderLeft: `3px solid ${THEME.accent}`, paddingLeft: '8px' }}>
              Kontakt z nami
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.88rem', lineHeight: 2 }}>
              <li><strong>Adres:</strong> ul. Ogrodnicza 12, 90-001 Łódź</li>
              <li><strong>Infolinia:</strong> +48 42 600 700 800</li>
              <li><strong>E-mail:</strong> kontakt@gardenbooking.pl</li>
              <li><strong>Godziny pracy:</strong> Pon - Pt: 7:00 - 18:00, Sob: 8:00 - 15:00</li>
            </ul>
          </div>

          {/* Kolumna 3: Szybkie linki i moduły */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: THEME.white, marginBottom: '0.9rem', borderLeft: `3px solid ${THEME.accent}`, paddingLeft: '8px' }}>
              Oferta i pomoc
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.88rem', lineHeight: 2 }}>
              <li style={{ cursor: 'pointer' }} onClick={() => scrollToCatalog('EQUIPMENT')}>• Katalog maszyn spalinowych</li>
              <li style={{ cursor: 'pointer' }} onClick={() => scrollToCatalog('SERVICE')}>• Cennik usług i koszenia</li>
              <li style={{ cursor: 'pointer' }}>• Warunki dowozu i kaucji</li>
              <li style={{ cursor: 'pointer' }}>• Cyfrowy protokół zdawczo-odbiorczy</li>
            </ul>
          </div>
        </div>

        {/* Pasek praw autorskich */}
        <div style={{ 
          maxWidth: '1280px', 
          margin: '1.5rem auto 0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '0.8rem', 
          fontSize: '0.78rem',
          color: THEME.surface 
        }}>
          <span>© {new Date().getFullYear()} GardenBooking. Wszelkie prawa zastrzeżone.</span>
          <span>Projekt systemu rezerwacji maszyn i usług ogrodniczych – Praca inżynierska</span>
        </div>
      </footer>

    </div>
  )
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('garden_user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogout = () => {
    localStorage.removeItem('garden_user')
    setCurrentUser(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage currentUser={currentUser} onLogout={handleLogout} />} />
        <Route path="/auth" element={<AuthPage onLoginSuccess={(user) => setCurrentUser(user)} />} />
        <Route path="/user" element={
            <UserPage 
              currentUser={currentUser} 
              onUserUpdate={(updated) => {
                setCurrentUser(updated)
                localStorage.setItem('garden_user', JSON.stringify(updated))
              }}
              onRebookItem={(item) => {
                setRebookItem(item)
              }}
            />
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}