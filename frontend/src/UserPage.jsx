import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { 
  User, 
  Clock, 
  RotateCcw, 
  ArrowLeft, 
  Edit3, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Wrench,
  Sprout,
  XCircle,
  PlayCircle,
  Clock3,
  ChevronDown,
  ChevronUp
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

function isConsultationRecord(res) {
  const notes = (res.customerNotes || '').toUpperCase()
  return isServiceReservation(res) && notes.startsWith('KONSULTACJA')
}

function getStatusConfig(status, isService) {
  switch (status) {
    case 'COMPLETED':
      return {
        label: isService ? 'Ukończone' : 'Zakończone',
        Icon: CheckCircle2,
        bg: '#f0fdf4',
        color: '#15803d',
        border: '#bbf7d0'
      }
    case 'CANCELLED':
      return {
        label: 'Anulowane',
        Icon: XCircle,
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca'
      }
    case 'CONFIRMED':
    case 'IN_PROGRESS':
      return {
        label: 'W trakcie',
        Icon: PlayCircle,
        bg: '#f1f5f9',
        color: '#334155',
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

const formatDateShort = (val) => {
  if (!val) return '-'
  return new Date(val).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatDateTimeShort = (val) => {
  if (!val) return '-'
  return new Date(val).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getDeliveryLabel = (r, service) => {
  if (service) return 'Dojazd ekipy'
  return r.deliveryType === 'DELIVERY' ? 'Dostawa pod adres' : 'Odbiór osobisty'
}

const getPaymentLabel = (r) => {
  if (r.paymentType === 'BLIK') return 'BLIK'
  if (r.paymentType === 'CARD') return 'Karta płatnicza'
  if (r.paymentType === 'CASH') return 'Gotówka'
  return r.status === 'PENDING' ? 'Przy odbiorze' : 'Opłacone'
}

export default function UserPage({ currentUser, onUserUpdate, onRebookItem }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const isEmployee = currentUser?.role === 'EMPLOYEE'

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth')
    }
  }, [currentUser, navigate])

  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === 'RESERVATIONS' ? 'RESERVATIONS' : 'PROFILE'
  )

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'RESERVATIONS' || t === 'PROFILE') {
      setActiveTab(t)
    }
  }, [searchParams])

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const [reservationCategory, setReservationCategory] = useState('ALL')
  const [employeeTaskFilter, setEmployeeTaskFilter] = useState('ALL')

  const [openCurrentSection, setOpenCurrentSection] = useState(true)
  const [openHistorySection, setOpenHistorySection] = useState(true)

  const [editingField, setEditingField] = useState(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [formData, setFormData] = useState({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    phoneNumber: currentUser?.phoneNumber || '',
    currentPassword: '',
    password: ''
  })
  const [profileMsg, setProfileMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const [reservations, setReservations] = useState([])
  const [resLoading, setResLoading] = useState(false)

  // Formularz wprowadzania szczegółów konsultacji przez pracownika
  const [activeConsultation, setActiveConsultation] = useState(null)
  const [consultForm, setConsultForm] = useState({
    agreedPrice: '',
    estimatedDuration: '1 dzień (ok. 6 godz.)',
    details: ''
  })
  const [consultSaving, setConsultSaving] = useState(false)

  // Okno potwierdzenia zakończenia lub anulowania zadania
  const [confirmAction, setConfirmAction] = useState(null)

  const fetchReservationsOrSchedule = () => {
    const uid = currentUser?.userId || currentUser?.id
    if (!uid) return
    setResLoading(true)
    const url = isEmployee
      ? `http://localhost:8080/api/reservations/schedule/${uid}`
      : `http://localhost:8080/api/reservations/user/${uid}`

    fetch(url)
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

  useEffect(() => {
    if (activeTab === 'RESERVATIONS') {
      fetchReservationsOrSchedule()
    }
  }, [activeTab, currentUser, isEmployee])

  // Zmiana statusu zadania przez pracownika (wykonane / anulowane)
  const handleEmployeeStatusUpdate = async (reservationId, newStatus) => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/reservations/${reservationId}/status?status=${newStatus}`,
        { method: 'PATCH' }
      )
      if (res.ok) {
        fetchReservationsOrSchedule()
      }
    } catch {
      // ignoruj
    }
  }

  // Zatwierdzenie szczegółów konsultacji przez pracownika
  const handleConfirmConsultationSubmit = async (e) => {
    e.preventDefault()
    if (!activeConsultation) return
    setConsultSaving(true)

    const cid = activeConsultation.id || activeConsultation.reservationId
    try {
      const res = await fetch(`http://localhost:8080/api/reservations/${cid}/confirm-consultation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreedPrice: Number(consultForm.agreedPrice),
          estimatedDuration: consultForm.estimatedDuration,
          details: consultForm.details
        })
      })
      if (res.ok) {
        setActiveConsultation(null)
        setConsultForm({ agreedPrice: '', estimatedDuration: '1 dzień (ok. 6 godz.)', details: '' })
        fetchReservationsOrSchedule()
      }
    } finally {
      setConsultSaving(false)
    }
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setProfileMsg(null)

    if (isChangingPassword && (!formData.currentPassword || !formData.password)) {
      setProfileMsg({ type: 'error', text: 'Wpisz obecne oraz nowe hasło.' })
      setLoading(false)
      return
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

  const now = new Date()

  // Dane dla KLIENTA
  const filteredClientReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (reservationCategory === 'ALL') return true
      const isService = isServiceReservation(r)
      if (reservationCategory === 'SERVICE') return isService
      if (reservationCategory === 'EQUIPMENT') return !isService
      return true
    })
  }, [reservations, reservationCategory])

  const activeReservations = useMemo(() => {
    return filteredClientReservations.filter((r) => {
      const end = new Date(r.endDate || r.endTime)
      return (isNaN(end) || end >= now) && r.status !== 'CANCELLED' && r.status !== 'COMPLETED'
    })
  }, [filteredClientReservations, now])

  const historyReservations = useMemo(() => {
    return filteredClientReservations.filter((r) => {
      const end = new Date(r.endDate || r.endTime)
      return (!isNaN(end) && end < now) || r.status === 'CANCELLED' || r.status === 'COMPLETED'
    })
  }, [filteredClientReservations, now])

  // Dane dla PRACOWNIKA (lista zadań do tabeli)
  const employeeTaskRows = useMemo(() => {
    const rows = []

    for (const r of reservations) {
      const service = isServiceReservation(r)
      const isConsult = isConsultationRecord(r)

      if (isConsult) {
        rows.push({
          ...r,
          rowKey: `${r.id}-CONSULT`,
          taskKind: 'CONSULTATION',
          taskLabel: 'Konsultacja telefoniczna',
          displayDate: formatDateTimeShort(r.startDate),
          isDone: r.status === 'COMPLETED',
          isCancelled: r.status === 'CANCELLED'
        })
      } else if (service) {
        rows.push({
          ...r,
          rowKey: `${r.id}-SERVICE`,
          taskKind: 'SERVICE',
          taskLabel: 'Usługa do realizacji',
          displayDate: formatDateShort(r.startDate),
          isDone: r.status === 'COMPLETED',
          isCancelled: r.status === 'CANCELLED'
        })
      } else {
        rows.push({
          ...r,
          rowKey: `${r.id}-OUT`,
          taskKind: 'HANDOVER_OUT',
          taskLabel: 'Wydanie sprzętu',
          displayDate: formatDateShort(r.startDate),
          isDone: r.status === 'CONFIRMED' || r.status === 'COMPLETED',
          isCancelled: r.status === 'CANCELLED'
        })
        rows.push({
          ...r,
          rowKey: `${r.id}-IN`,
          taskKind: 'HANDOVER_IN',
          taskLabel: 'Odbiór sprzętu',
          displayDate: formatDateShort(r.endDate),
          isDone: r.status === 'COMPLETED',
          isCancelled: r.status === 'CANCELLED'
        })
      }
    }

    return rows.filter((row) => {
      if (employeeTaskFilter === 'ALL') return true
      return row.taskKind === employeeTaskFilter
    })
  }, [reservations, employeeTaskFilter])

  const employeeCurrentTasks = useMemo(
    () => employeeTaskRows.filter((r) => !r.isDone && !r.isCancelled),
    [employeeTaskRows]
  )

  const employeeDoneTasks = useMemo(
    () => employeeTaskRows.filter((r) => r.isDone || r.isCancelled),
    [employeeTaskRows]
  )

  const handleRebook = (res) => {
    if (onRebookItem) {
      onRebookItem({ id: res.itemId, name: res.itemName })
    }
    navigate('/')
  }

  if (!currentUser) return null

  const thStyle = {
    padding: '10px 10px',
    fontSize: '0.74rem',
    fontWeight: 700,
    color: THEME.textMuted,
    textTransform: 'uppercase',
    borderBottom: `1px solid ${THEME.borderDivider}`,
    backgroundColor: '#ffffff',
    textAlign: 'left'
  }

  const tdStyle = {
    padding: '10px 10px',
    fontSize: '0.83rem',
    color: THEME.textDark,
    borderBottom: `1px solid ${THEME.borderDivider}`,
    verticalAlign: 'middle'
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#f1f5f9',
      color: THEME.textDark,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        .res-table-wrapper { display: block; width: 100%; overflow-x: auto; }
        .res-mobile-cards { display: none; }
        @media (max-width: 768px) {
          .res-table-wrapper { display: none; }
          .res-mobile-cards { display: flex; flex-direction: column; gap: 0.75rem; }
          .user-page-pad { padding: 1rem !important; }
        }
      `}</style>

      <nav style={{
        height: '65px',
        backgroundColor: THEME.white,
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${THEME.borderDivider}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <img src={logoImage} alt="GardenBooking" style={{ height: '38px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.primary }}>
              Garden<span style={{ color: THEME.accent }}>Booking</span>
            </span>
          </Link>
          <span style={{ fontSize: '0.85rem', color: THEME.textMuted }}>
            / {isEmployee ? 'Panel pracownika' : 'Panel klienta'}
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
            backgroundColor: THEME.bgSoft
          }}
        >
          <ArrowLeft size={16} />
          Wróć
        </Link>
      </nav>

      <main style={{ maxWidth: '1120px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{
          backgroundColor: THEME.white,
          borderRadius: '4px',
          border: `1px solid ${THEME.borderDefault}`,
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', backgroundColor: '#f8fafc', borderBottom: `1px solid ${THEME.borderDivider}` }}>
            <button
              onClick={() => handleTabSwitch('PROFILE')}
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
              onClick={() => handleTabSwitch('RESERVATIONS')}
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
              {isEmployee ? 'Grafik zadań' : 'Rezerwacje i historia'}
            </button>
          </div>

          <div className="user-page-pad" style={{ padding: '1.75rem' }}>
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

            {/* ZAKŁADKA DANYCH PROFILU */}
            {activeTab === 'PROFILE' && (
              <div>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', color: THEME.textDark }}>
                  Twoje dane osobowe ({isEmployee ? 'Pracownik' : 'Klient'})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
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
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <Edit3 size={14} /> Edytuj
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{ padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.primary, color: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {loading ? 'Zapis...' : 'Zapisz'}
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            style={{ padding: '6px 12px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
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
                          style={{ padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                        />
                        <input
                          type="text"
                          placeholder="Nazwisko"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          style={{ padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block' }}>
                      Adres e-mail
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: THEME.textDark }}>
                      {currentUser.email}
                    </span>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
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
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {formData.phoneNumber ? <><Edit3 size={14} /> Edytuj</> : <><Plus size={14} /> Dodaj</>}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{ padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.primary, color: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {loading ? 'Zapis...' : 'Zapisz'}
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            style={{ padding: '6px 12px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
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
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '1.25rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
                    {!isChangingPassword ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <KeyRound size={17} color={THEME.textMuted} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Chcesz zmienić hasło?</span>
                        </div>
                        <button
                          onClick={() => { setIsChangingPassword(true); setProfileMsg(null) }}
                          style={{ padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Kliknij, aby zmienić
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: THEME.textMuted }}>
                          Obecne hasło:
                          <input
                            type="password"
                            required
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            style={{ width: '100%', padding: '8px 10px', marginTop: '4px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, boxSizing: 'border-box' }}
                          />
                        </label>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: THEME.textMuted }}>
                          Nowe hasło:
                          <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            style={{ width: '100%', padding: '8px 10px', marginTop: '4px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, boxSizing: 'border-box' }}
                          />
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="submit"
                            disabled={loading}
                            style={{ padding: '8px 16px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.primary, color: THEME.white, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Zapisz nowe hasło
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsChangingPassword(false); setFormData((prev) => ({ ...prev, currentPassword: '', password: '' })) }}
                            style={{ padding: '8px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
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

            {/* ZAKŁADKA GRAFIKU PRACOWNIKA (TABELA) */}
            {activeTab === 'RESERVATIONS' && isEmployee && (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: 'Wszystkie' },
                    { id: 'CONSULTATION', label: 'Konsultacje' },
                    { id: 'SERVICE', label: 'Usługi do realizacji' },
                    { id: 'HANDOVER_OUT', label: 'Wydania sprzętu' },
                    { id: 'HANDOVER_IN', label: 'Odbiory sprzętu' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setEmployeeTaskFilter(cat.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '4px',
                        border: `1px solid ${employeeTaskFilter === cat.id ? THEME.primary : THEME.borderDefault}`,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: employeeTaskFilter === cat.id ? THEME.primary : THEME.bgSoft,
                        color: employeeTaskFilter === cat.id ? THEME.white : THEME.textDark
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* FORMULARZ WPROWADZANIA SZCZEGÓŁÓW KONSULTACJI PRZEZ PRACOWNIKA */}
                {activeConsultation && (
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: '1.25rem',
                    borderRadius: '4px',
                    border: `1px solid ${THEME.borderHover}`,
                    backgroundColor: THEME.bgSoft
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                        Ustalenia po konsultacji: {(activeConsultation.itemName || '').replace(/^Usługa:\s*/i, '')}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveConsultation(null)}
                        style={{ padding: '4px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Zamknij
                      </button>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: THEME.textMuted, margin: '0 0 1rem 0' }}>
                      Klient: <strong>{activeConsultation.clientName}</strong> (tel. {activeConsultation.clientPhone}) | {activeConsultation.customerNotes}
                    </p>

                    <form onSubmit={handleConfirmConsultationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                            Ustalona kwota (zł)
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            required
                            placeholder="np. 450"
                            value={consultForm.agreedPrice}
                            onChange={(e) => setConsultForm({ ...consultForm, agreedPrice: e.target.value })}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                            Przybliżony czas realizacji
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="np. 1 dzień (ok. 6 godz.)"
                            value={consultForm.estimatedDuration}
                            onChange={(e) => setConsultForm({ ...consultForm, estimatedDuration: e.target.value })}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                          Szczegóły ustalone z klientem (zakres prac, materiały, dojazd)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="np. Koszenie z wywozem trawy + nawożenie, start od jutra"
                          value={consultForm.details}
                          onChange={(e) => setConsultForm({ ...consultForm, details: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="submit"
                          disabled={consultSaving}
                          style={{
                            padding: '9px 20px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.primary}`,
                            backgroundColor: THEME.primary,
                            color: THEME.white,
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {consultSaving ? 'Zapisywanie...' : 'Zatwierdź szczegóły'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {resLoading && <p style={{ color: THEME.textMuted, fontSize: '0.85rem' }}>Ładowanie grafiku...</p>}

                {!resLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* TABELA 1: BIEŻĄCE KONSULTACJE, USŁUGI DO REALIZACJI ORAZ WYDANIA/ODBIORY */}
                    <div style={{ border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setOpenCurrentSection(!openCurrentSection)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: THEME.bgSoft,
                          border: 'none',
                          borderBottom: openCurrentSection ? `1px solid ${THEME.borderDivider}` : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          color: THEME.textDark,
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}
                      >
                        <span>Do wykonania ({employeeCurrentTasks.length})</span>
                        {openCurrentSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      {openCurrentSection && (
                        employeeCurrentTasks.length === 0 ? (
                          <div style={{ padding: '1rem', fontSize: '0.84rem', color: THEME.textMuted }}>
                            Brak bieżących zadań w grafiku.
                          </div>
                        ) : (
                          <div style={{ width: '100%', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={thStyle}>Typ zadania</th>
                                  <th style={thStyle}>Nazwa</th>
                                  <th style={thStyle}>Data / Godzina</th>
                                  <th style={thStyle}>Klient i adres</th>
                                  <th style={thStyle}>Szczegóły / Kwota</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Akcja</th>
                                </tr>
                              </thead>
                              <tbody>
                                {employeeCurrentTasks.map((task) => {
                                  const cleanName = (task.itemName || '').replace(/^Usługa:\s*/i, '')
                                  const resId = task.id || task.reservationId

                                  return (
                                    <tr key={task.rowKey}>
                                      <td style={tdStyle}>
                                        <span style={{
                                          padding: '3px 7px',
                                          borderRadius: '4px',
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          backgroundColor: THEME.bgSoft,
                                          border: `1px solid ${THEME.borderDefault}`,
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {task.taskLabel}
                                        </span>
                                      </td>

                                      <td style={{ ...tdStyle, fontWeight: 700 }}>{cleanName}</td>

                                      <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                        {task.displayDate}
                                      </td>

                                      <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                                        <div><strong>{task.clientName}</strong> (tel. {task.clientPhone || '-'})</div>
                                        <div style={{ color: THEME.textMuted }}>{task.deliveryAddress}</div>
                                      </td>

                                      <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                                        {task.taskKind === 'CONSULTATION' ? (
                                          <span style={{ color: THEME.textMuted }}>{task.customerNotes || 'Konsultacja wstępna'}</span>
                                        ) : (
                                          <div>
                                            <strong>{task.totalPrice} zł</strong>
                                            {task.customerNotes && (
                                              <div style={{ color: THEME.textMuted, fontSize: '0.76rem' }}>{task.customerNotes}</div>
                                            )}
                                          </div>
                                        )}
                                      </td>

                                      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {task.taskKind === 'CONSULTATION' ? (
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveConsultation(task)
                                                setConsultForm({
                                                  agreedPrice: task.totalPrice || '',
                                                  estimatedDuration: '1 dzień (ok. 6 godz.)',
                                                  details: ''
                                                })
                                              }}
                                              style={{
                                                padding: '6px 12px',
                                                borderRadius: '4px',
                                                border: `1px solid ${THEME.primary}`,
                                                backgroundColor: THEME.primary,
                                                color: THEME.white,
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                              }}
                                            >
                                              Wprowadź szczegóły
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setConfirmAction({
                                                  resId,
                                                  nextStatus: 'CANCELLED',
                                                  title: 'Potwierdzenie anulowania',
                                                  message: `Czy na pewno chcesz anulować konsultację „${cleanName}” dla klienta ${task.clientName}?`
                                                })
                                              }}
                                              style={{
                                                padding: '5px 8px',
                                                borderRadius: '4px',
                                                border: `1px solid ${THEME.borderDefault}`,
                                                backgroundColor: THEME.white,
                                                color: THEME.textMuted,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              Anuluj
                                            </button>
                                          </div>
                                        ) : (
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                                              <input
                                                type="checkbox"
                                                checked={false}
                                                onChange={() => {
                                                  const nextStatus = task.taskKind === 'HANDOVER_OUT' ? 'CONFIRMED' : 'COMPLETED'
                                                  setConfirmAction({
                                                    resId,
                                                    nextStatus,
                                                    title: 'Potwierdzenie wykonania zadania',
                                                    message: `Czy na pewno chcesz oznaczyć zadanie „${task.taskLabel}: ${cleanName}” jako wykonane?`
                                                  })
                                                }}
                                                style={{ width: '15px', height: '15px', accentColor: THEME.primary, cursor: 'pointer' }}
                                              />
                                              Zakończone
                                            </label>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setConfirmAction({
                                                  resId,
                                                  nextStatus: 'CANCELLED',
                                                  title: 'Potwierdzenie anulowania',
                                                  message: `Czy na pewno chcesz anulować zlecenie „${cleanName}” dla klienta ${task.clientName}?`
                                                })
                                              }}
                                              style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: `1px solid ${THEME.borderDefault}`,
                                                backgroundColor: THEME.white,
                                                color: THEME.textMuted,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              Anuluj
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </div>

                    {/* TABELA 2: ZAKOŃCZONE I ANULOWANE ZADANIA PRACOWNIKA */}
                    <div style={{ border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setOpenHistorySection(!openHistorySection)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: THEME.bgSoft,
                          border: 'none',
                          borderBottom: openHistorySection ? `1px solid ${THEME.borderDivider}` : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          color: THEME.textDark,
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}
                      >
                        <span>Zakończone i anulowane ({employeeDoneTasks.length})</span>
                        {openHistorySection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      {openHistorySection && (
                        employeeDoneTasks.length === 0 ? (
                          <div style={{ padding: '1rem', fontSize: '0.84rem', color: THEME.textMuted }}>
                            Brak zakończonych zadań.
                          </div>
                        ) : (
                          <div style={{ width: '100%', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={thStyle}>Typ zadania</th>
                                  <th style={thStyle}>Nazwa</th>
                                  <th style={thStyle}>Data</th>
                                  <th style={thStyle}>Klient</th>
                                  <th style={thStyle}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {employeeDoneTasks.map((task) => {
                                  const cleanName = (task.itemName || '').replace(/^Usługa:\s*/i, '')
                                  const statusCfg = getStatusConfig(task.status, task.taskKind === 'SERVICE' || task.taskKind === 'CONSULTATION')

                                  return (
                                    <tr key={task.rowKey}>
                                      <td style={tdStyle}>{task.taskLabel}</td>
                                      <td style={{ ...tdStyle, fontWeight: 700 }}>{cleanName}</td>
                                      <td style={{ ...tdStyle, fontSize: '0.8rem', color: THEME.textMuted }}>{task.displayDate}</td>
                                      <td style={{ ...tdStyle, fontSize: '0.8rem' }}>{task.clientName}</td>
                                      <td style={tdStyle}>
                                        <span style={{
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          fontSize: '0.74rem',
                                          fontWeight: 700,
                                          backgroundColor: statusCfg.bg,
                                          color: statusCfg.color,
                                          border: `1px solid ${statusCfg.border}`
                                        }}>
                                          {task.isCancelled ? 'Anulowane' : 'Zakończone'}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ZAKŁADKA REZERWACJI DLA KLIENTA (CLIENT) */}
            {activeTab === 'RESERVATIONS' && !isEmployee && (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
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
                        border: `1px solid ${reservationCategory === cat.id ? THEME.primary : THEME.borderDefault}`,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: reservationCategory === cat.id ? THEME.primary : THEME.bgSoft,
                        color: reservationCategory === cat.id ? THEME.white : THEME.textDark
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {resLoading && <p style={{ color: THEME.textMuted, fontSize: '0.85rem' }}>Ładowanie rezerwacji...</p>}

                {!resLoading && filteredClientReservations.length === 0 && (
                  <p style={{ color: THEME.textMuted, fontSize: '0.85rem', margin: '2rem 0' }}>
                    Brak zamówień w wybranej kategorii.
                  </p>
                )}

                {!resLoading && filteredClientReservations.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setOpenCurrentSection(!openCurrentSection)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: THEME.bgSoft,
                          border: 'none',
                          borderBottom: openCurrentSection ? `1px solid ${THEME.borderDivider}` : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          color: THEME.textDark,
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}
                      >
                        <span>Bieżące i nadchodzące ({activeReservations.length})</span>
                        {openCurrentSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      {openCurrentSection && (
                        activeReservations.length === 0 ? (
                          <div style={{ padding: '1rem', fontSize: '0.84rem', color: THEME.textMuted }}>
                            Brak bieżących rezerwacji.
                          </div>
                        ) : (
                          <ReservationResponsiveView
                            items={activeReservations}
                            showPayment={true}
                            showRebook={false}
                            onRebook={handleRebook}
                          />
                        )
                      )}
                    </div>

                    <div style={{ border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setOpenHistorySection(!openHistorySection)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          backgroundColor: THEME.bgSoft,
                          border: 'none',
                          borderBottom: openHistorySection ? `1px solid ${THEME.borderDivider}` : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          color: THEME.textDark,
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}
                      >
                        <span>Zakończone ({historyReservations.length})</span>
                        {openHistorySection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      {openHistorySection && (
                        historyReservations.length === 0 ? (
                          <div style={{ padding: '1rem', fontSize: '0.84rem', color: THEME.textMuted }}>
                            Brak zakończonych zamówień.
                          </div>
                        ) : (
                          <ReservationResponsiveView
                            items={historyReservations}
                            showPayment={false}
                            showRebook={true}
                            onRebook={handleRebook}
                          />
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Minimalistyczne okno potwierdzenia zakończenia lub anulowania zadania */}
      {confirmAction && (
        <div
          onClick={() => setConfirmAction(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 200
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: THEME.white,
              border: `1px solid ${THEME.borderDefault}`,
              borderRadius: '4px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '420px'
            }}
          >
            <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '1.05rem', fontWeight: 800, color: THEME.textDark }}>
              {confirmAction.title}
            </h4>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', lineHeight: 1.5, color: THEME.textMuted }}>
              {confirmAction.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '4px',
                  border: `1px solid ${THEME.borderDefault}`,
                  backgroundColor: THEME.white,
                  color: THEME.textDark,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Wróć
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleEmployeeStatusUpdate(confirmAction.resId, confirmAction.nextStatus)
                  setConfirmAction(null)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: `1px solid ${confirmAction.nextStatus === 'CANCELLED' ? '#b91c1c' : THEME.primary}`,
                  backgroundColor: confirmAction.nextStatus === 'CANCELLED' ? '#b91c1c' : THEME.primary,
                  color: THEME.white,
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {confirmAction.nextStatus === 'CANCELLED' ? 'Tak, anuluj' : 'Tak, zakończ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReservationResponsiveView({ items, showPayment, showRebook, onRebook }) {
  const thStyle = {
    padding: '10px 10px',
    fontSize: '0.74rem',
    fontWeight: 700,
    color: THEME.textMuted,
    textTransform: 'uppercase',
    borderBottom: `1px solid ${THEME.borderDivider}`,
    backgroundColor: '#ffffff',
    textAlign: 'left'
  }

  const tdStyle = {
    padding: '10px 10px',
    fontSize: '0.83rem',
    color: THEME.textDark,
    borderBottom: `1px solid ${THEME.borderDivider}`,
    verticalAlign: 'middle'
  }

  return (
    <>
      <div className="res-table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Kategoria</th>
              <th style={thStyle}>Nazwa</th>
              <th style={thStyle}>Data</th>
              <th style={thStyle}>Koszt</th>
              <th style={thStyle}>Dostawa</th>
              {showPayment && <th style={thStyle}>Płatność</th>}
              <th style={thStyle}>Status</th>
              {showRebook && <th style={{ ...thStyle, textAlign: 'right' }}>Akcja</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const isService = isServiceReservation(r)
              const isConsult = isConsultationRecord(r)
              const statusCfg = getStatusConfig(r.status, isService)
              const StatusIcon = statusCfg.Icon
              const rawName = r.itemName || `Zamówienie #${r.id || r.reservationId}`
              const cleanName = rawName.replace(/^Usługa:\s*/i, '')

              return (
                <tr key={r.id || r.reservationId}>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 7px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      border: `1px solid ${THEME.borderDefault}`,
                      whiteSpace: 'nowrap'
                    }}>
                      {isService ? <Sprout size={12} /> : <Wrench size={12} />}
                      {isConsult ? 'Konsultacja' : isService ? 'Usługa' : 'Sprzęt'}
                    </span>
                  </td>

                  <td style={{ ...tdStyle, fontWeight: 700 }}>{cleanName}</td>

                  <td style={{ ...tdStyle, color: THEME.textMuted, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {isService ? formatDateShort(r.startDate) : `${formatDateShort(r.startDate)} — ${formatDateShort(r.endDate)}`}
                  </td>

                  <td style={{ ...tdStyle, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {isConsult ? 'Wycena po rozmowie' : `${r.totalPrice} zł`}
                  </td>

                  <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                    {getDeliveryLabel(r, isService)}
                  </td>

                  {showPayment && (
                    <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                      {isConsult ? '-' : getPaymentLabel(r)}
                    </td>
                  )}

                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: statusCfg.bg,
                      color: statusCfg.color,
                      border: `1px solid ${statusCfg.border}`,
                      whiteSpace: 'nowrap'
                    }}>
                      <StatusIcon size={13} />
                      {statusCfg.label}
                    </span>
                  </td>

                  {showRebook && (
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {r.itemId ? (
                        <button
                          onClick={() => onRebook(r)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.primary,
                            color: THEME.white,
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <RotateCcw size={12} />
                          Ponów
                        </button>
                      ) : '-'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="res-mobile-cards" style={{ padding: '0.75rem' }}>
        {items.map((r) => {
          const isService = isServiceReservation(r)
          const statusCfg = getStatusConfig(r.status, isService)
          const StatusIcon = statusCfg.Icon
          const rawName = r.itemName || `Zamówienie #${r.id || r.reservationId}`
          const cleanName = rawName.replace(/^Usługa:\s*/i, '')

          return (
            <div
              key={r.id || r.reservationId}
              style={{
                border: `1px solid ${THEME.borderDefault}`,
                borderRadius: '4px',
                padding: '0.9rem',
                backgroundColor: THEME.bgSoft,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: THEME.white, border: `1px solid ${THEME.borderDefault}` }}>
                  {isService ? 'Usługa' : 'Sprzęt'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
                  <StatusIcon size={12} />
                  {statusCfg.label}
                </span>
              </div>

              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{cleanName}</div>
              <div style={{ fontSize: '0.78rem', color: THEME.textMuted }}>
                {formatDateShort(r.startDate)} | <strong>{r.totalPrice} zł</strong>
              </div>
              {showRebook && r.itemId && (
                <button
                  onClick={() => onRebook(r)}
                  style={{ alignSelf: 'flex-end', padding: '5px 10px', borderRadius: '4px', border: `1px solid ${THEME.primary}`, backgroundColor: THEME.primary, color: THEME.white, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Ponów
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}