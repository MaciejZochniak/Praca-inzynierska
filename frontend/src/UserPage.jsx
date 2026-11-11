import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  User, 
  Clock, 
  RotateCcw, 
  ArrowLeft, 
  Edit3, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Wrench,
  Sprout,
  XCircle,
  Clock3,
  ChevronDown,
  ChevronUp,
  Truck,
  Store,
  CreditCard
} from 'lucide-react'
import logoImage from './assets/GardenBookingLogo.png'

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

// Sprawdzanie usługi
function isServiceReservation(res) {
  const name = (res.itemName || '').toLowerCase()
  return (
    name.includes('usługa') ||
    name.includes('koszenie') ||
    name.includes('aeracja') ||
    name.includes('wertykulacja') ||
    name.includes('cięcie') ||
    name.includes('wycinka') ||
    name.includes('zakładanie') ||
    name.includes('karczowanie')
  )
}

// Kolory statusów (zielony, czerwony, standardowy szary)
function getStatusConfig(status, isService) {
  switch (status) {
    case 'COMPLETED':
      return {
        label: isService ? 'Ukończone' : 'Zakończone',
        Icon: CheckCircle2,
        bg: '#f0fdf4',
        color: '#16a34a',
        border: '#bbf7d0'
      }
    case 'CANCELLED':
      return {
        label: 'Anulowane',
        Icon: XCircle,
        bg: '#fef2f2',
        color: '#dc2626',
        border: '#fecaca'
      }
    case 'CONFIRMED':
    case 'IN_PROGRESS':
      return {
        label: 'W trakcie',
        Icon: Clock3,
        bg: '#f1f5f9',
        color: '#475569',
        border: '#cbd5e1'
      }
    case 'PENDING':
    default:
      return {
        label: 'Oczekujące',
        Icon: Clock3,
        bg: '#f1f5f9',
        color: '#475569',
        border: '#cbd5e1'
      }
  }
}

// Typ dostawy
function formatDelivery(res) {
  const type = res.deliveryType || res.delivery?.deliveryType
  if (type === 'DELIVERY') return { label: 'Dowóz', Icon: Truck }
  return { label: 'Odbiór osobisty', Icon: Store }
}

// Format płatności
function formatPayment(res) {
  const method = res.paymentType || res.paymentMethod || res.payment?.paymentType
  let label = 'Gotówka'
  if (method === 'BLIK') label = 'BLIK'
  else if (method === 'CARD' || method === 'KARTA') label = 'Karta'
  else if (method === 'TRANSFER' || method === 'PRZELEW') label = 'Przelew'

  const isPaid = res.paymentStatus === 'PAID' || res.isPaid === true
  return { label, isPaid }
}

export default function UserPage({ currentUser, onUserUpdate, onRebookItem }) {
  const navigate = useNavigate()

  // Autoryzacja
  useEffect(() => {
    if (!currentUser) {
      navigate('/auth')
    }
  }, [currentUser, navigate])

  const [activeTab, setActiveTab] = useState('PROFILE')
  const [reservationCategory, setReservationCategory] = useState('ALL')

  // Zwijanie tabel
  const [activeOpen, setActiveOpen] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(true)

  // Edycja danych
  const [editingField, setEditingField] = useState(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Formularz profilu
  const [formData, setFormData] = useState({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    phoneNumber: currentUser?.phoneNumber || '',
    currentPassword: '',
    password: ''
  })
  const [profileMsg, setProfileMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  // Rezerwacje
  const [reservations, setReservations] = useState([])
  const [resLoading, setResLoading] = useState(false)

  // Pobieranie
  useEffect(() => {
    const uid = currentUser?.userId || currentUser?.id
    if (activeTab === 'RESERVATIONS' && uid) {
      setResLoading(true)
      fetch(`http://localhost:8080/api/reservations/user/${uid}`)
        .then((res) => {
          if (!res.ok) throw new Error('Błąd pobierania')
          return res.json()
        })
        .then((data) => {
          setReservations(Array.isArray(data) ? data : [])
          setResLoading(false)
        })
        .catch(() => {
          setReservations([])
          setResLoading(false)
        })
    }
  }, [activeTab, currentUser])

  // Zapis zmian profilu
  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setProfileMsg(null)

    if (isChangingPassword) {
      if (!formData.currentPassword || !formData.password) {
        setProfileMsg({ type: 'error', text: 'Wpisz obecne oraz nowe hasło.' })
        setLoading(false)
        return
      }
    }

    const uid = currentUser?.userId || currentUser?.id
    try {
      const res = await fetch(`http://localhost:8080/api/auth/profile/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (res.ok) {
        setProfileMsg({ type: 'success', text: 'Zaktualizowano pomyślnie.' })
        setEditingField(null)
        setIsChangingPassword(false)
        setFormData((prev) => ({ ...prev, currentPassword: '', password: '' }))
        if (onUserUpdate) onUserUpdate(data)
      } else {
        setProfileMsg({ type: 'error', text: data.message || 'Błąd zapisu.' })
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Błąd połączenia z serwerem.' })
    } finally {
      setLoading(false)
    }
  }

  // Filtrowanie
  const now = new Date()

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (reservationCategory === 'ALL') return true
      const isService = isServiceReservation(r)
      if (reservationCategory === 'SERVICE') return isService
      if (reservationCategory === 'EQUIPMENT') return !isService
      return true
    })
  }, [reservations, reservationCategory])

  const activeReservations = useMemo(() => {
    return filteredReservations.filter((r) => {
      const end = new Date(r.endDate || r.endTime)
      return (isNaN(end) || end >= now) && r.status !== 'CANCELLED' && r.status !== 'COMPLETED'
    })
  }, [filteredReservations, now])

  const historyReservations = useMemo(() => {
    return filteredReservations.filter((r) => {
      const end = new Date(r.endDate || r.endTime)
      return (!isNaN(end) && end < now) || r.status === 'CANCELLED' || r.status === 'COMPLETED'
    })
  }, [filteredReservations, now])

  const handleRebook = (res) => {
    if (onRebookItem) {
      onRebookItem({ id: res.itemId, name: res.itemName })
    }
    navigate('/')
  }

  if (!currentUser) return null

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#f1f5f9',
      color: THEME.textDark,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* width do mobile */}
      <style>{`
        @media (max-width: 900px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: flex !important; }
          .panel-container { padding: 1rem 0.5rem !important; margin: 1rem auto !important; }
          .panel-header-btn { font-size: 0.85rem !important; padding: 10px 12px !important; }
        }
        @media (min-width: 901px) {
          .desktop-table { display: table !important; }
          .mobile-cards { display: none !important; }
        }
      `}</style>

      {/* Nawigacja */}
      <nav style={{
        height: '65px',
        backgroundColor: THEME.white,
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${THEME.borderDivider}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <img src={logoImage} alt="GardenBooking" style={{ height: '38px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.primary }}>
              Garden<span style={{ color: THEME.accent }}>Booking</span>
            </span>
          </Link>
          <span style={{ fontSize: '0.85rem', color: THEME.textMuted }}>
            / Panel klienta
          </span>
        </div>

        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            color: THEME.textDark,
            fontWeight: 600,
            fontSize: '0.85rem',
            padding: '7px 12px',
            borderRadius: '4px',
            border: `1px solid ${THEME.borderDefault}`,
            backgroundColor: THEME.bgSoft,
            transition: 'border-color 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
        >
          <ArrowLeft size={16} />
          Wróć
        </Link>
      </nav>

      {/* Kontener główny */}
      <main className="panel-container" style={{ maxWidth: '1080px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{
          backgroundColor: THEME.white,
          borderRadius: '4px',
          border: `1px solid ${THEME.borderDefault}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}>
          {/* Zakładki */}
          <div style={{ display: 'flex', backgroundColor: '#f8fafc', borderBottom: `1px solid ${THEME.borderDivider}` }}>
            <button
              onClick={() => setActiveTab('PROFILE')}
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                borderBottom: activeTab === 'PROFILE' ? `2px solid ${THEME.borderHover}` : '2px solid transparent',
                backgroundColor: activeTab === 'PROFILE' ? THEME.white : 'transparent',
                color: activeTab === 'PROFILE' ? THEME.textDark : THEME.textMuted,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <User size={16} />
              Dane profilu
            </button>
            <button
              onClick={() => setActiveTab('RESERVATIONS')}
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                borderBottom: activeTab === 'RESERVATIONS' ? `2px solid ${THEME.borderHover}` : '2px solid transparent',
                backgroundColor: activeTab === 'RESERVATIONS' ? THEME.white : 'transparent',
                color: activeTab === 'RESERVATIONS' ? THEME.textDark : THEME.textMuted,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Clock size={16} />
              Rezerwacje i historia
            </button>
          </div>

          <div style={{ padding: '1.75rem' }}>
            {/* Komunikat */}
            {profileMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '4px',
                marginBottom: '1.5rem',
                backgroundColor: profileMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: profileMsg.type === 'success' ? '#15803d' : '#b91c1c',
                border: `1px solid ${profileMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {profileMsg.text}
              </div>
            )}

            {/* Profil */}
            {activeTab === 'PROFILE' && (
              <div>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', color: THEME.textDark }}>
                  Twoje dane osobowe
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Imię i nazwisko */}
                  <div style={{ padding: '1rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block' }}>Imię i nazwisko</span>
                        {editingField !== 'NAME' && (
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: THEME.textDark }}>
                            {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}`.trim() : 'Brak danych'}
                          </span>
                        )}
                      </div>

                      {editingField !== 'NAME' ? (
                        <button
                          onClick={() => { setEditingField('NAME'); setProfileMsg(null) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <Edit3 size={14} /> Edytuj
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={handleSave} disabled={loading} style={{ padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.primary, color: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                            {loading ? 'Zapis...' : 'Zapisz'}
                          </button>
                          <button onClick={() => setEditingField(null)} style={{ padding: '6px 12px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                            Anuluj
                          </button>
                        </div>
                      )}
                    </div>

                    {editingField === 'NAME' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '0.8rem' }}>
                        <input type="text" placeholder="Imię" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} style={{ padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, outline: 'none' }} />
                        <input type="text" placeholder="Nazwisko" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} style={{ padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, outline: 'none' }} />
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div style={{ padding: '1rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block' }}>Adres e-mail</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: THEME.textDark }}>{currentUser.email}</span>
                  </div>

                  {/* Telefon */}
                  <div style={{ padding: '1rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block' }}>Numer telefonu</span>
                        {editingField !== 'PHONE' && (
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: formData.phoneNumber ? THEME.textDark : THEME.textMuted }}>
                            {formData.phoneNumber || 'Brak numeru telefonu'}
                          </span>
                        )}
                      </div>

                      {editingField !== 'PHONE' ? (
                        <button
                          onClick={() => { setEditingField('PHONE'); setProfileMsg(null) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {formData.phoneNumber ? <><Edit3 size={14} /> Edytuj</> : <><Plus size={14} /> Dodaj</>}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={handleSave} disabled={loading} style={{ padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.primary, color: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                            {loading ? 'Zapis...' : 'Zapisz'}
                          </button>
                          <button onClick={() => setEditingField(null)} style={{ padding: '6px 12px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                            Anuluj
                          </button>
                        </div>
                      )}
                    </div>

                    {editingField === 'PHONE' && (
                      <div style={{ marginTop: '0.8rem' }}>
                        <input type="tel" placeholder="np. 600700800" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    )}
                  </div>

                  {/* Hasło */}
                  <div style={{ padding: '1.25rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', marginTop: '0.5rem' }}>
                    {!isChangingPassword ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <KeyRound size={17} color={THEME.textMuted} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: THEME.textDark }}>Chcesz zmienić hasło?</span>
                        </div>
                        <button
                          onClick={() => { setIsChangingPassword(true); setProfileMsg(null) }}
                          style={{ padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Kliknij, aby zmienić
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <KeyRound size={17} color={THEME.primary} />
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: THEME.textDark }}>Zmiana hasła</span>
                        </div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: THEME.textMuted }}>
                          Obecne hasło:
                          <input type="password" required value={formData.currentPassword} onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })} style={{ width: '100%', padding: '8px 10px', marginTop: '4px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, outline: 'none', boxSizing: 'border-box' }} />
                        </label>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: THEME.textMuted }}>
                          Nowe hasło:
                          <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ width: '100%', padding: '8px 10px', marginTop: '4px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, outline: 'none', boxSizing: 'border-box' }} />
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="submit" disabled={loading} style={{ padding: '8px 16px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.primary, color: THEME.white, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                            {loading ? 'Zapisywanie...' : 'Zapisz nowe hasło'}
                          </button>
                          <button type="button" onClick={() => { setIsChangingPassword(false); setFormData((prev) => ({ ...prev, currentPassword: '', password: '' })) }} style={{ padding: '8px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, color: THEME.textDark, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                            Anuluj
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/*historia zamówień*/}
            {activeTab === 'RESERVATIONS' && (
              <div>
                {/* Filtry kategorii */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: 'Wszystkie pozycje' },
                    { id: 'EQUIPMENT', label: 'Wypożyczenie sprzętu' },
                    { id: 'SERVICE', label: 'Usługi ogrodnicze' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setReservationCategory(cat.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '4px',
                        border: `1px solid ${reservationCategory === cat.id ? THEME.borderHover : THEME.borderDefault}`,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: reservationCategory === cat.id ? THEME.primary : THEME.bgSoft,
                        color: reservationCategory === cat.id ? THEME.white : THEME.textDark,
                        transition: 'border-color 0.15s ease'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {resLoading && <p style={{ color: THEME.textMuted, fontSize: '0.85rem' }}>Ładowanie rezerwacji...</p>}

                {!resLoading && filteredReservations.length === 0 && (
                  <p style={{ color: THEME.textMuted, fontSize: '0.85rem', margin: '2rem 0' }}>Brak zamówień w wybranej kategorii.</p>
                )}

                {/* Bieżące i nadchodzące rezerwacje */}
                <div style={{ marginBottom: '2rem', border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', overflow: 'hidden' }}>
                  <button
                    className="panel-header-btn"
                    onClick={() => setActiveOpen(!activeOpen)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: '#f8fafc',
                      border: 'none',
                      borderBottom: activeOpen ? `1px solid ${THEME.borderDivider}` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: THEME.textDark }}>
                      Bieżące i nadchodzące rezerwacje ({activeReservations.length})
                    </span>
                    {activeOpen ? <ChevronUp size={18} color={THEME.textMuted} /> : <ChevronDown size={18} color={THEME.textMuted} />}
                  </button>

                  {activeOpen && (
                    <div>
                      {activeReservations.length === 0 ? (
                        <p style={{ padding: '1.25rem', color: THEME.textMuted, fontSize: '0.85rem', margin: 0 }}>
                          Brak bieżących lub zaplanowanych zamówień.
                        </p>
                      ) : (
                        <ResponsiveReservationList 
                          reservations={activeReservations} 
                          onRebook={handleRebook} 
                          canRebook={false} 
                          showPayment={true} 
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Historia zamówień */}
                <div style={{ border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', overflow: 'hidden' }}>
                  <button
                    className="panel-header-btn"
                    onClick={() => setHistoryOpen(!historyOpen)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: '#f8fafc',
                      border: 'none',
                      borderBottom: historyOpen ? `1px solid ${THEME.borderDivider}` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: THEME.textDark }}>
                      Historia zamówień zakończonych ({historyReservations.length})
                    </span>
                    {historyOpen ? <ChevronUp size={18} color={THEME.textMuted} /> : <ChevronDown size={18} color={THEME.textMuted} />}
                  </button>

                  {historyOpen && (
                    <div>
                      {historyReservations.length === 0 ? (
                        <p style={{ padding: '1.25rem', color: THEME.textMuted, fontSize: '0.85rem', margin: 0 }}>
                          Brak zrealizowanych zamówień w historii.
                        </p>
                      ) : (
                        <ResponsiveReservationList 
                          reservations={historyReservations} 
                          onRebook={handleRebook} 
                          canRebook={true} 
                          showPayment={false} 
                        />
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// responsywność
function ResponsiveReservationList({ reservations, onRebook, canRebook, showPayment }) {
  return (
    <>
      {/*dekstop */}
      <table className="desktop-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#ffffff', borderBottom: `1px solid ${THEME.borderDivider}`, color: THEME.textMuted }}>
            <th style={{ padding: '10px 12px', fontWeight: 600 }}>Kategoria</th>
            <th style={{ padding: '10px 12px', fontWeight: 600 }}>Nazwa</th>
            <th style={{ padding: '10px 12px', fontWeight: 600 }}>Termin</th>
            <th style={{ padding: '10px 12px', fontWeight: 600 }}>Koszt</th>
            <th style={{ padding: '10px 12px', fontWeight: 600 }}>Dostawa</th>
            {showPayment && <th style={{ padding: '10px 12px', fontWeight: 600 }}>Płatność</th>}
            <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
            {canRebook && <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Akcja</th>}
          </tr>
        </thead>
        <tbody>
          {reservations.map((res) => {
            const isService = isServiceReservation(res)
            const statusCfg = getStatusConfig(res.status, isService)
            const StatusIcon = statusCfg.Icon

            const startVal = res.startDate || res.startTime
            const endVal = res.endDate || res.endTime
            const startDate = startVal ? new Date(startVal).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
            const endDate = endVal ? new Date(endVal).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

            const rawName = res.itemName || `Zamówienie #${res.id || res.reservationId}`
            const cleanName = rawName.replace(/^Usługa:\s*/i, '')

            const delivery = formatDelivery(res)
            const payment = formatPayment(res)

            return (
              <tr
                key={res.id || res.reservationId}
                style={{
                  borderBottom: `1px solid ${THEME.borderDivider}`,
                  backgroundColor: THEME.white,
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = THEME.white }}
              >
                {/* Kategoria */}
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: isService ? '#f1f5f9' : '#f1f5f9',
                    color: isService ? '#334155' : '#334155',
                    border: `1px solid ${isService ? '#cbd5e1' : '#cbd5e1'}`
                  }}>

                    {isService ? 'Usługa' : 'Sprzęt'}
                  </span>
                </td>

                {/* Nazwa */}
                <td style={{ padding: '10px 12px', fontWeight: 700, color: THEME.textDark }}>
                  {cleanName}
                </td>

                {/* Data */}
                <td style={{ padding: '10px 12px', color: THEME.textMuted, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                    <Calendar size={12} />
                    <span>{startDate} — {endDate}</span>
                  </div>
                </td>

                {/* Koszt */}
                <td style={{ padding: '10px 12px', fontWeight: 700, color: THEME.textDark, whiteSpace: 'nowrap' }}>
                  {res.totalPrice} zł
                </td>

                {/* Dostawa */}
                <td style={{ padding: '10px 12px', color: THEME.textDark, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                    <delivery.Icon size={13} color={THEME.textMuted} />
                    <span>{delivery.label}</span>
                  </div>
                </td>

                {/* Płatność */}
                {showPayment && (
                  <td style={{ padding: '10px 12px', color: THEME.textDark, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                        <CreditCard size={12} color={THEME.textMuted} />
                        {payment.label}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: payment.isPaid ? '#16a34a' : '#475569', fontWeight: 600 }}>
                        {payment.isPaid ? 'Opłacone' : 'Do opłaty'}
                      </span>
                    </div>
                  </td>
                )}

                {/* Status */}
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 7px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: statusCfg.bg,
                    color: statusCfg.color,
                    border: `1px solid ${statusCfg.border}`
                  }}>
                    <StatusIcon size={12} />
                    {statusCfg.label}
                  </span>
                </td>

                {/* Przycisk Ponów*/}
                {canRebook && (
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {res.itemId && (
                      <button
                        onClick={() => onRebook(res)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          border: `1px solid ${THEME.borderDefault}`,
                          backgroundColor: THEME.primary,
                          color: THEME.white,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <RotateCcw size={12} />
                        Ponów
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* mobile version*/}
      <div className="mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>
        {reservations.map((res) => {
          const isService = isServiceReservation(res)
          const statusCfg = getStatusConfig(res.status, isService)
          const StatusIcon = statusCfg.Icon

          const startVal = res.startDate || res.startTime
          const endVal = res.endDate || res.endTime
          const startDate = startVal ? new Date(startVal).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
          const endDate = endVal ? new Date(endVal).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

          const rawName = res.itemName || `Zamówienie #${res.id || res.reservationId}`
          const cleanName = rawName.replace(/^Usługa:\s*/i, '')

          const delivery = formatDelivery(res)
          const payment = formatPayment(res)

          return (
            <div
              key={res.id || res.reservationId}
              style={{
                backgroundColor: THEME.white,
                border: `1px solid ${THEME.borderDefault}`,
                borderRadius: '6px',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {/* Kategoria i status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  backgroundColor: isService ? '#f1f5f9' : '#f1f5f9',
                  color: isService ? '#334155' : '#334155',
                  border: `1px solid ${isService ? '#cbd5e1' : '#cbd5e1'}`
                }}>
                  {isService ? 'Usługa' : 'Sprzęt'}
                </span>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 7px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: statusCfg.bg,
                  color: statusCfg.color,
                  border: `1px solid ${statusCfg.border}`
                }}>
                  <StatusIcon size={12} />
                  {statusCfg.label}
                </span>
              </div>

              {/* Nazwa */}
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: THEME.textDark }}>
                {cleanName}
              </div>

              {/* data, koszt, dostawa */}
              <div style={{ fontSize: '0.78rem', color: THEME.textMuted, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} />
                  <span>{startDate} — {endDate}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <delivery.Icon size={13} />
                  <span>Dostawa: <strong>{delivery.label}</strong></span>
                </div>
                {showPayment && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CreditCard size={13} />
                    <span>Płatność: <strong>{payment.label}</strong> ({payment.isPaid ? 'Opłacone' : 'Do opłaty'})</span>
                  </div>
                )}
              </div>

              {/* Dolny pasek karty */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${THEME.borderDivider}`, paddingTop: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: THEME.textDark }}>
                  {res.totalPrice} zł
                </span>

                {canRebook && res.itemId && (
                  <button
                    onClick={() => onRebook(res)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      border: `1px solid ${THEME.borderDefault}`,
                      backgroundColor: THEME.primary,
                      color: THEME.white,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={12} />
                    Ponów rezerwację
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}