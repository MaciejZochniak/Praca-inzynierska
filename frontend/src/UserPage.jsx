import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  User, 
  Clock, 
  RotateCcw, 
  ArrowLeft, 
  Save, 
  Edit3, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  KeyRound
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

  // Tryby edycji
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

  // Pobieranie rezerwacji
  useEffect(() => {
    if (activeTab === 'RESERVATIONS' && currentUser?.userId) {
      setResLoading(true)
      fetch(`http://localhost:8080/api/reservations/user/${currentUser.userId}`)
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

  // Zapis zmian
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

    try {
      const res = await fetch(`http://localhost:8080/api/auth/profile/${currentUser.userId}`, {
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

  // Pomocnik do wyciągania przedmiotu
  const getItemFromRes = (r) => {
    return r.itemId || r.item || r.reservationItems?.[0]?.item || null
  }

  // Filtrowanie
  const now = new Date()

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (reservationCategory === 'ALL') return true
      const item = getItemFromRes(r)
      const itemName = item?.name?.toLowerCase() || ''
      const isService = itemName.includes('usługa') || itemName.includes('koszenie') || itemName.includes('aeracja') || itemName.includes('cięcie')
      if (reservationCategory === 'SERVICE') return isService
      if (reservationCategory === 'EQUIPMENT') return !isService
      return true
    })
  }, [reservations, reservationCategory])

  const activeReservations = useMemo(() => {
    return filteredReservations.filter((r) => {
      const end = new Date(r.endTime || r.endDate)
      return (isNaN(end) || end >= now) && r.status !== 'CANCELLED' && r.status !== 'COMPLETED'
    })
  }, [filteredReservations, now])

  const historyReservations = useMemo(() => {
    return filteredReservations.filter((r) => {
      const end = new Date(r.endTime || r.endDate)
      return (!isNaN(end) && end < now) || r.status === 'CANCELLED' || r.status === 'COMPLETED'
    })
  }, [filteredReservations, now])

  const handleRebook = (item) => {
    if (onRebookItem) onRebookItem(item)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

      {/* Kontener */}
      <main style={{ maxWidth: '920px', margin: '2rem auto', padding: '0 1rem' }}>
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
                gap: '8px',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'PROFILE') e.currentTarget.style.backgroundColor = '#f1f5f9'
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'PROFILE') e.currentTarget.style.backgroundColor = 'transparent'
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
                gap: '8px',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'RESERVATIONS') e.currentTarget.style.backgroundColor = '#f1f5f9'
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'RESERVATIONS') e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Clock size={16} />
              Rezerwacje i historia
            </button>
          </div>

          <div style={{ padding: '2rem' }}>
            {/* Powiadomienie */}
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

            {/* ZAKŁADKA 1: DANE PROFILU */}
            {activeTab === 'PROFILE' && (
              <div>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', color: THEME.textDark }}>
                  Twoje dane osobowe
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Wiersz 1: Imię i nazwisko */}
                  <div style={{
                    padding: '1rem',
                    backgroundColor: THEME.bgSoft,
                    border: `1px solid ${THEME.borderDefault}`,
                    borderRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block' }}>
                          Imię i nazwisko
                        </span>
                        {editingField !== 'NAME' && (
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: THEME.textDark }}>
                            {formData.firstName || formData.lastName
                              ? `${formData.firstName} ${formData.lastName}`.trim()
                              : 'Brak danych'}
                          </span>
                        )}
                      </div>

                      {editingField !== 'NAME' ? (
                        <button
                          onClick={() => { setEditingField('NAME'); setProfileMsg(null) }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            color: THEME.textDark,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'border-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                        >
                          <Edit3 size={14} /> Edytuj
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.primary,
                              color: THEME.white,
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {loading ? 'Zapis...' : 'Zapisz'}
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.white,
                              color: THEME.textDark,
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Anuluj
                          </button>
                        </div>
                      )}
                    </div>

                    {editingField === 'NAME' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '0.8rem' }}>
                        <input
                          type="text"
                          placeholder="Imię"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            outline: 'none',
                            fontSize: '0.9rem'
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                        />
                        <input
                          type="text"
                          placeholder="Nazwisko"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            outline: 'none',
                            fontSize: '0.9rem'
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Wiersz 2: Adres Email */}
                  <div style={{
                    padding: '1rem',
                    backgroundColor: THEME.bgSoft,
                    border: `1px solid ${THEME.borderDefault}`,
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block' }}>
                      Adres e-mail
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: THEME.textDark }}>
                      {currentUser.email}
                    </span>
                  </div>

                  {/* Wiersz 3: Numer telefonu */}
                  <div style={{
                    padding: '1rem',
                    backgroundColor: THEME.bgSoft,
                    border: `1px solid ${THEME.borderDefault}`,
                    borderRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block' }}>
                          Numer telefonu
                        </span>
                        {editingField !== 'PHONE' && (
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: formData.phoneNumber ? THEME.textDark : THEME.textMuted }}>
                            {formData.phoneNumber || 'Brak numeru telefonu'}
                          </span>
                        )}
                      </div>

                      {editingField !== 'PHONE' ? (
                        <button
                          onClick={() => { setEditingField('PHONE'); setProfileMsg(null) }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            color: THEME.textDark,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'border-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                        >
                          {formData.phoneNumber ? (
                            <><Edit3 size={14} /> Edytuj</>
                          ) : (
                            <><Plus size={14} /> Dodaj</>
                          )}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.primary,
                              color: THEME.white,
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {loading ? 'Zapis...' : 'Zapisz'}
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.white,
                              color: THEME.textDark,
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Anuluj
                          </button>
                        </div>
                      )}
                    </div>

                    {editingField === 'PHONE' && (
                      <div style={{ marginTop: '0.8rem' }}>
                        <input
                          type="tel"
                          placeholder="np. 600700800"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            outline: 'none',
                            fontSize: '0.9rem',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Wiersz 4: Zmiana hasła */}
                  <div style={{
                    padding: '1.25rem',
                    backgroundColor: THEME.bgSoft,
                    border: `1px solid ${THEME.borderDefault}`,
                    borderRadius: '4px',
                    marginTop: '0.5rem'
                  }}>
                    {!isChangingPassword ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <KeyRound size={17} color={THEME.textMuted} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: THEME.textDark }}>
                            Chcesz zmienić hasło?
                          </span>
                        </div>
                        <button
                          onClick={() => { setIsChangingPassword(true); setProfileMsg(null) }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            color: THEME.textDark,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'border-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                        >
                          Kliknij, aby zmienić
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.2rem' }}>
                          <KeyRound size={17} color={THEME.primary} />
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: THEME.textDark }}>
                            Zmiana hasła
                          </span>
                        </div>

                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: THEME.textMuted }}>
                          Obecne hasło do konta:
                          <input
                            type="password"
                            required
                            placeholder="Wpisz obecne hasło"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              marginTop: '4px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.white,
                              outline: 'none',
                              fontSize: '0.9rem',
                              boxSizing: 'border-box'
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                          />
                        </label>

                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: THEME.textMuted }}>
                          Nowe hasło:
                          <input
                            type="password"
                            required
                            placeholder="Wpisz nowe hasło"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              marginTop: '4px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.white,
                              outline: 'none',
                              fontSize: '0.9rem',
                              boxSizing: 'border-box'
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                          />
                        </label>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '0.3rem' }}>
                          <button
                            type="submit"
                            disabled={loading}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.primary,
                              color: THEME.white,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {loading ? 'Zapisywanie...' : 'Zapisz nowe hasło'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsChangingPassword(false)
                              setFormData((prev) => ({ ...prev, currentPassword: '', password: '' }))
                            }}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.white,
                              color: THEME.textDark,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Anuluj
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* ZAKŁADKA 2: REZERWACJE I HISTORIA */}
            {activeTab === 'RESERVATIONS' && (
              <div>
                {/* Kategorie */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: 'Wszystkie' },
                    { id: 'EQUIPMENT', label: 'Sprzęt' },
                    { id: 'SERVICE', label: 'Usługi' }
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
                      onMouseEnter={(e) => {
                        if (reservationCategory !== cat.id) e.currentTarget.style.borderColor = THEME.borderHover
                      }}
                      onMouseLeave={(e) => {
                        if (reservationCategory !== cat.id) e.currentTarget.style.borderColor = THEME.borderDefault
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

                {/* Bieżące */}
                {activeReservations.length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', color: THEME.textDark, fontWeight: 700 }}>
                      Bieżące i nadchodzące ({activeReservations.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {activeReservations.map((res) => renderCard(res, getItemFromRes(res), handleRebook))}
                    </div>
                  </div>
                )}

                {/* Archiwum */}
                {historyReservations.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', color: THEME.textMuted, fontWeight: 700 }}>
                      Zakończone ({historyReservations.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {historyReservations.map((res) => renderCard(res, getItemFromRes(res), handleRebook))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// Karta rezerwacji
function renderCard(res, item, onRebook) {
  const startVal = res.startTime || res.startDate
  const endVal = res.endTime || res.endDate
  const startDate = startVal ? new Date(startVal).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Brak daty'
  const endDate = endVal ? new Date(endVal).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Brak daty'

  return (
    <div
      key={res.id}
      style={{
        borderRadius: '4px',
        padding: '1rem',
        backgroundColor: '#f8fafc',
        border: `1px solid ${THEME.borderDefault}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        transition: 'border-color 0.15s ease'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: THEME.textDark }}>
            {item ? item.name : `Zamówienie #${res.id}`}
          </span>
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '3px',
            fontWeight: 700,
            border: `1px solid ${res.status === 'COMPLETED' ? '#bbf7d0' : THEME.borderDefault}`,
            backgroundColor: res.status === 'COMPLETED' ? '#dcfce7' : '#e2e8f0',
            color: res.status === 'COMPLETED' ? '#15803d' : THEME.textDark
          }}>
            {res.status}
          </span>
        </div>

        <div style={{ fontSize: '0.8rem', color: THEME.textMuted, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={13} /> {startDate} — {endDate}
          </div>
          <div>
            Koszt: <strong>{res.totalPrice} zł</strong>
          </div>
        </div>
      </div>

      {item && (
        <button
          onClick={() => onRebook(item)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '7px 12px',
            borderRadius: '4px',
            border: `1px solid ${THEME.borderDefault}`,
            backgroundColor: THEME.primary,
            color: THEME.white,
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'border-color 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
        >
          <RotateCcw size={14} />
          Ponów
        </button>
      )}
    </div>
  )
}