import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingBag, CreditCard, PhoneCall } from 'lucide-react'
import logoImg from './assets/GardenBookingLogo.png'

const API_BASE = 'http://localhost:8080'

const THEME = {
  primary: '#556B2F',
  accent: '#8FA31E',
  textDark: '#1e293b',
  textMuted: '#64748b',
  white: '#ffffff',
  surface: '#f8fafc',
  borderDefault: '#cbd5e1',
  borderHover: '#475569',
  borderDivider: '#e2e8f0'
}

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]
const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz']

export default function ItemPage({ currentUser, onAddToCart, cartCount = 0 }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const actionSectionRef = useRef(null)
  const checkoutFormRef = useRef(null)

  const [item, setItem] = useState(null)
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showActionSection, setShowActionSection] = useState(false)
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)
  const [cartNotice, setCartNotice] = useState(null)

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Daty dla sprzętu
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Pola dla konsultacji usługi
  const [gardenArea, setGardenArea] = useState('500')
  const [consultDate, setConsultDate] = useState('')
  const [consultTime, setConsultTime] = useState('10:00')
  const [serviceNotes, setServiceNotes] = useState('')

  // Dane osobowe (automatycznie uzupełniane z konta zalogowanego klienta)
  const [firstName, setFirstName] = useState(currentUser?.firstName || '')
  const [lastName, setLastName] = useState(currentUser?.lastName || '')
  const [guestEmail, setGuestEmail] = useState(currentUser?.email || '')
  const [guestPhone, setGuestPhone] = useState(currentUser?.phoneNumber || '')

  // Dostawa i płatność (dla sprzętu)
  const [deliveryType, setDeliveryType] = useState('PICKUP')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('BLIK')

  const [submitStatus, setSubmitStatus] = useState({ loading: false, error: null, success: null })

  const fetchItemAndAvailability = async () => {
    try {
      setLoading(true)
      const [itemRes, availRes] = await Promise.all([
        fetch(`${API_BASE}/api/items/${id}`),
        fetch(`${API_BASE}/api/reservations/item/${id}`)
      ])

      if (!itemRes.ok) throw new Error('Nie znaleziono wybranej oferty.')
      const itemData = await itemRes.json()
      const availData = availRes.ok ? await availRes.json() : []

      setItem(itemData)
      setReservations(availData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItemAndAvailability()
  }, [id])

  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || '')
      setLastName(currentUser.lastName || '')
      setGuestEmail(currentUser.email || '')
      setGuestPhone(currentUser.phoneNumber || '')
    }
  }, [currentUser])

  const isService = useMemo(() => {
    if (!item) return false
    const catId = item.category?.id || 0
    return catId >= 10 || item.name?.toLowerCase().startsWith('usługa')
  }, [item])

  const totalQuantity = item?.quantity ?? 1

  const getBusyCountForDay = (dateStr) => {
    const dayStart = new Date(`${dateStr}T00:00:00`)
    const dayEnd = new Date(`${dateStr}T23:59:59`)

    let count = 0
    for (const res of reservations) {
      const rStart = new Date(res.startDate || res.startTime)
      const rEnd = new Date(res.endDate || res.endTime)
      if (rStart <= dayEnd && rEnd >= dayStart) {
        count++
      }
    }
    return count
  }

  const formatAvailableLabel = (freeCount) => {
    if (freeCount <= 0) return 'niedostępne'
    if (freeCount === 1) return '1 dostępna'
    if (freeCount >= 2 && freeCount <= 4) return `${freeCount} dostępne`
    return `${freeCount} dostępnych`
  }

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    const startOffset = (firstDayOfMonth.getDay() + 6) % 7
    const totalDays = lastDayOfMonth.getDate()

    const days = []
    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const busyCount = getBusyCountForDay(dateStr)
      const freeCount = Math.max(0, totalQuantity - busyCount)

      days.push({
        day,
        dateStr,
        freeCount,
        isFull: freeCount === 0
      })
    }
    return days
  }, [currentMonth, reservations, totalQuantity])

  const handleDayClick = (dayObj) => {
    if (!dayObj || dayObj.isFull) return
    setCartNotice(null)

    if (!startDate || (startDate && endDate)) {
      setStartDate(dayObj.dateStr)
      setEndDate('')
      setShowCheckoutForm(false)
    } else if (dayObj.dateStr >= startDate) {
      setEndDate(dayObj.dateStr)
    } else {
      setStartDate(dayObj.dateStr)
      setEndDate('')
      setShowCheckoutForm(false)
    }
  }

  const rangeConflict = useMemo(() => {
    if (!startDate) return false
    const effectiveEnd = endDate || startDate
    const start = new Date(startDate)
    const end = new Date(effectiveEnd)
    if (end < start) return true

    const cur = new Date(start)
    while (cur <= end) {
      const dStr = cur.toISOString().slice(0, 10)
      if (getBusyCountForDay(dStr) >= totalQuantity) {
        return true
      }
      cur.setDate(cur.getDate() + 1)
    }
    return false
  }, [startDate, endDate, reservations, totalQuantity])

  const priceSummary = useMemo(() => {
    if (!item || !startDate) return null
    const effectiveEnd = endDate || startDate
    const start = new Date(startDate)
    const end = new Date(effectiveEnd)
    if (end < start) return null

    const daysCount =
      startDate === effectiveEnd
        ? 1
        : Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1)

    const baseCost = Number(item.price) * daysCount
    const deliveryCost = deliveryType === 'DELIVERY' ? 50 : 0

    return {
      effectiveEnd,
      daysCount,
      baseCost,
      deliveryCost,
      total: baseCost + deliveryCost
    }
  }, [item, startDate, endDate, deliveryType])

  const handleOpenAction = () => {
    setShowActionSection(true)
    setTimeout(() => {
      actionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const handleProceedToBuy = () => {
    if (!startDate) return
    if (!endDate) setEndDate(startDate)
    setShowCheckoutForm(true)
    setTimeout(() => {
      checkoutFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  // Zapis rezerwacji sprzętu
  const handleEquipmentSubmit = async (e) => {
    e.preventDefault()
    const finalEndDate = endDate || startDate
    if (!startDate || !finalEndDate || rangeConflict) return

    setSubmitStatus({ loading: true, error: null, success: null })
    const fullName = `${firstName} ${lastName}`.trim()

    const payload = {
      userId: currentUser?.userId || currentUser?.id || null,
      itemId: Number(id),
      startDate: `${startDate}T08:00:00`,
      endDate: `${finalEndDate}T18:00:00`,
      guestName: fullName,
      guestEmail,
      guestPhone,
      deliveryType,
      street: deliveryType === 'DELIVERY' ? street : '',
      city: deliveryType === 'DELIVERY' ? city : '',
      postalCode: deliveryType === 'DELIVERY' ? postalCode : '',
      paymentType: paymentMethod
    }

    try {
      const res = await fetch(`${API_BASE}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const text = await res.text()
      let data = {}
      try { data = JSON.parse(text) } catch { data = { message: text } }

      if (!res.ok) throw new Error(data.message || 'Nie udało się utworzyć rezerwacji.')

      setSubmitStatus({
        loading: false,
        error: null,
        success: `Rezerwacja nr #${data.reservationId || data.id} została przyjęta. Kwota: ${Number(data.totalPrice).toFixed(2)} zł.`
      })
      fetchItemAndAvailability()
    } catch (err) {
      setSubmitStatus({ loading: false, error: err.message, success: null })
    }
  }

  // Zapis konsultacji telefonicznej dla usługi
  const handleServiceConsultationSubmit = async (e) => {
    e.preventDefault()
    if (!consultDate) {
      setSubmitStatus({ loading: false, error: 'Wybierz preferowaną datę konsultacji telefonicznej.', success: null })
      return
    }

    setSubmitStatus({ loading: true, error: null, success: null })
    const fullName = `${firstName} ${lastName}`.trim()

    // Tworzymy 30-minutowe okno konsultacji telefonicznej w wybranej dacie i godzinie
    const [hh, mm] = consultTime.split(':').map(Number)
    const endH = mm === 30 ? String(hh + 1).padStart(2, '0') : String(hh).padStart(2, '0')
    const endM = mm === 30 ? '00' : '30'

    const notes = `KONSULTACJA TELEFONICZNA | Godzina: ${consultTime} | Powierzchnia ogrodu: ${gardenArea} m²${serviceNotes ? ` | Uwagi: ${serviceNotes}` : ''}`

    const payload = {
      userId: currentUser?.userId || currentUser?.id || null,
      itemId: Number(id),
      startDate: `${consultDate}T${consultTime}:00`,
      endDate: `${consultDate}T${endH}:${endM}:00`,
      guestName: fullName,
      guestEmail,
      guestPhone,
      deliveryType: 'DELIVERY',
      street,
      city,
      postalCode,
      customerNotes: notes
    }

    try {
      const res = await fetch(`${API_BASE}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const text = await res.text()
      let data = {}
      try { data = JSON.parse(text) } catch { data = { message: text } }

      if (!res.ok) throw new Error(data.message || 'Nie udało się umówić konsultacji.')

      setSubmitStatus({
        loading: false,
        error: null,
        success: `Konsultacja telefoniczna została umówiona na dzień ${consultDate} o godz. ${consultTime}. Nasz pracownik skontaktuje się pod numerem ${guestPhone}.`
      })
    } catch (err) {
      setSubmitStatus({ loading: false, error: err.message, success: null })
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: THEME.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: THEME.textMuted }}>
        Ładowanie oferty...
      </div>
    )
  }

  if (error || !item) {
    return (
      <div style={{ minHeight: '100vh', background: THEME.white, padding: '40px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#b91c1c', fontWeight: 600 }}>{error || 'Nie znaleziono przedmiotu'}</p>
        <button
          onClick={() => navigate('/')}
          style={{ marginTop: '12px', padding: '8px 16px', background: THEME.primary, color: THEME.white, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Wróć do strony głównej
        </button>
      </div>
    )
  }

  const cleanItemName = item.name.replace(/^Usługa:\s*/i, '')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: THEME.textDark, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <nav style={{
        height: '65px',
        backgroundColor: THEME.white,
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${THEME.borderDivider}`
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <img src={logoImg} alt="GardenBooking" style={{ height: '38px', objectFit: 'contain' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.primary }}>
            Garden<span style={{ color: THEME.accent }}>Booking</span>
          </span>
        </Link>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/cart')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: THEME.textDark,
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '7px 12px',
              borderRadius: '4px',
              border: `1px solid ${THEME.borderDefault}`,
              backgroundColor: THEME.white,
              cursor: 'pointer'
            }}
          >
            <ShoppingBag size={16} />
            Koszyk ({cartCount})
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: THEME.textDark,
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '7px 12px',
              borderRadius: '4px',
              border: `1px solid ${THEME.borderDefault}`,
              backgroundColor: THEME.surface,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            Wróć
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '1080px', margin: '2rem auto', padding: '0 1rem 3rem 1rem' }}>
        {/* GÓRNA KARTA PRODUKTU / USŁUGI */}
        <div style={{
          backgroundColor: THEME.white,
          border: `1px solid ${THEME.borderDefault}`,
          borderRadius: '4px',
          padding: '1.75rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          alignItems: 'start'
        }}>
          <div style={{
            width: '100%',
            height: '330px',
            borderRadius: '4px',
            overflow: 'hidden',
            border: `1px solid ${THEME.borderDivider}`,
            backgroundColor: THEME.surface
          }}>
            <img
              src={`${API_BASE}${item.imageUrl}`}
              alt={item.name}
              onError={(e) => { e.target.src = 'https://placehold.co/600x400/f8fafc/475569?text=GardenBooking' }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: THEME.textDark, margin: '0 0 6px 0', lineHeight: 1.25 }}>
              {cleanItemName}
            </h1>

            {!isService && item.brand && (
              <div style={{ fontSize: '0.95rem', color: THEME.textDark, marginBottom: '4px' }}>
                Marka: <strong>{item.brand}</strong>
              </div>
            )}

            <div style={{ fontSize: '0.88rem', color: THEME.textMuted, marginBottom: '14px' }}>
              Kategoria: {item.category?.name || (isService ? 'Usługi ogrodnicze' : 'Sprzęt ogrodniczy')}
            </div>

            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: THEME.textDark, marginBottom: '16px' }}>
              {isService ? `od ${Number(item.price).toFixed(2)} zł` : `${Number(item.price).toFixed(2)} zł`}{' '}
              <span style={{ fontSize: '0.88rem', fontWeight: 500, color: THEME.textMuted }}>
                {isService ? '(wycena indywidualna po konsultacji)' : '/ doba'}
              </span>
            </div>

            <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: THEME.textMuted, margin: '0 0 14px 0' }}>
              {item.description}
            </p>

            {!isService && (
              <div style={{ fontSize: '0.85rem', color: THEME.textMuted, marginBottom: '20px' }}>
                Ilość dostępnych sztuk: <strong>{totalQuantity}</strong>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={handleOpenAction}
                style={{
                  padding: '11px 28px',
                  borderRadius: '4px',
                  border: `1px solid ${THEME.primary}`,
                  backgroundColor: THEME.primary,
                  color: THEME.white,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isService ? 'Umów konsultację telefoniczną' : 'Zarezerwuj'}
              </button>
            </div>
          </div>
        </div>

        {/* WARIANT A: FORMULARZ KONSULTACJI TELEFONICZNEJ DLA USŁUGI */}
        {showActionSection && isService && (
          <div
            ref={actionSectionRef}
            style={{
              marginTop: '1.5rem',
              backgroundColor: THEME.white,
              border: `1px solid ${THEME.borderDefault}`,
              borderRadius: '4px',
              padding: '1.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <PhoneCall size={18} color={THEME.primary} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Formularz konsultacji i wyceny usługi
              </h2>
            </div>
            <p style={{ fontSize: '0.84rem', color: THEME.textMuted, margin: '0 0 1.25rem 0' }}>
              Podaj powierzchnię ogrodu, adres oraz preferowany termin rozmowy telefonicznej. Nasz specjalista oddzwoni, aby ustalić dokładną cenę i termin prac.
            </p>

            <form onSubmit={handleServiceConsultationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Dane kontaktowe (automatycznie uzupełnione z konta) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                    Imię
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                    Nazwisko
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                    Telefon kontaktowy
                  </label>
                  <input
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="np. 600700800"
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                    Adres e-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="jan@example.com"
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Powierzchnia ogrodu oraz preferowana data i godzina konsultacji */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                    Powierzchnia ogrodu (m²)
                  </label>
                  <input
                    type="number"
                    min="20"
                    required
                    value={gardenArea}
                    onChange={(e) => setGardenArea(e.target.value)}
                    placeholder="np. 500"
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                    Preferowana data konsultacji telefonicznej
                  </label>
                  <input
                    type="date"
                    required
                    value={consultDate}
                    onChange={(e) => setConsultDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                    Preferowana godzina rozmowy
                  </label>
                  <select
                    value={consultTime}
                    onChange={(e) => setConsultTime(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                  >
                    <option value="08:00">08:00</option>
                    <option value="09:00">09:00</option>
                    <option value="10:00">10:00</option>
                    <option value="11:00">11:00</option>
                    <option value="12:00">12:00</option>
                    <option value="13:00">13:00</option>
                    <option value="14:00">14:00</option>
                    <option value="15:00">15:00</option>
                    <option value="16:00">16:00</option>
                    <option value="17:00">17:00</option>
                  </select>
                </div>
              </div>

              {/* Adres ogrodu */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '6px' }}>
                  Adres ogrodu (miejsce wykonania usługi)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="Ulica i numer"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    style={{ padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Miejscowość"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Kod pocztowy (00-000)"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    style={{ padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                  Dodatkowe uwagi (opcjonalnie)
                </label>
                <input
                  type="text"
                  placeholder="np. wysokość trawy, ukształtowanie terenu, dostęp do prądu..."
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                />
              </div>

              {submitStatus.error && (
                <div style={{ padding: '10px 12px', borderRadius: '4px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
                  {submitStatus.error}
                </div>
              )}

              {submitStatus.success && (
                <div style={{ padding: '10px 12px', borderRadius: '4px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.85rem', fontWeight: 700 }}>
                  {submitStatus.success}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={submitStatus.loading}
                  style={{
                    padding: '11px 28px',
                    borderRadius: '4px',
                    border: `1px solid ${THEME.primary}`,
                    backgroundColor: THEME.primary,
                    color: THEME.white,
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {submitStatus.loading ? 'Wysyłanie...' : 'Umów konsultację'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* WARIANT B: KALENDARZ DOSTĘPNOŚCI DLA WYPOŻYCZENIA SPRZĘTU */}
        {showActionSection && !isService && (
          <div
            ref={actionSectionRef}
            style={{
              marginTop: '1.5rem',
              backgroundColor: THEME.white,
              border: `1px solid ${THEME.borderDefault}`,
              borderRadius: '4px',
              padding: '1.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  Wybierz termin wypożyczenia
                </h2>
                <p style={{ fontSize: '0.82rem', color: THEME.textMuted, margin: '3px 0 0 0' }}>
                  Kliknij dzień początkowy oraz dzień końcowy na kalendarzu.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    border: `1px solid ${THEME.borderDefault}`,
                    backgroundColor: THEME.white,
                    cursor: 'pointer'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', minWidth: '140px', textAlign: 'center' }}>
                  {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    border: `1px solid ${THEME.borderDefault}`,
                    backgroundColor: THEME.white,
                    cursor: 'pointer'
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px',
              textAlign: 'center',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: THEME.textMuted,
              marginBottom: '6px'
            }}>
              {DAY_NAMES.map((d) => <div key={d}>{d}</div>)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {calendarDays.map((dayObj, idx) => {
                if (!dayObj) return <div key={`empty-${idx}`} style={{ height: '62px' }} />

                const isStart = startDate === dayObj.dateStr
                const isEnd = endDate === dayObj.dateStr
                const isBetween = startDate && endDate && dayObj.dateStr > startDate && dayObj.dateStr < endDate
                const isSelected = isStart || isEnd || isBetween

                return (
                  <div
                    key={dayObj.dateStr}
                    onClick={() => handleDayClick(dayObj)}
                    style={{
                      position: 'relative',
                      height: '62px',
                      borderRadius: '4px',
                      border: isSelected ? `2px solid ${THEME.textDark}` : `1px solid ${THEME.borderDefault}`,
                      backgroundColor: isSelected ? '#e2e8f0' : dayObj.isFull ? '#f8fafc' : THEME.white,
                      color: dayObj.isFull ? '#94a3b8' : THEME.textDark,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: dayObj.isFull ? 'not-allowed' : 'pointer',
                      userSelect: 'none',
                      overflow: 'hidden'
                    }}
                  >
                    {dayObj.isFull && (
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                      >
                        <line x1="0" y1="0" x2="100" y2="100" stroke="#cbd5e1" strokeWidth="2" />
                        <line x1="100" y1="0" x2="0" y2="100" stroke="#cbd5e1" strokeWidth="2" />
                      </svg>
                    )}

                    <span style={{ position: 'relative', zIndex: 1, fontSize: '0.95rem', fontWeight: isSelected ? 800 : 700, textDecoration: dayObj.isFull ? 'line-through' : 'none' }}>
                      {dayObj.day}
                    </span>

                    <span style={{ position: 'relative', zIndex: 1, fontSize: '0.68rem', color: dayObj.isFull ? '#94a3b8' : THEME.textMuted, marginTop: '2px' }}>
                      {dayObj.isFull ? 'brak' : formatAvailableLabel(dayObj.freeCount)}
                    </span>
                  </div>
                )
              })}
            </div>

            <div style={{
              marginTop: '1.25rem',
              paddingTop: '1.25rem',
              borderTop: `1px solid ${THEME.borderDivider}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ fontSize: '0.9rem' }}>
                {startDate ? (
                  <>
                    Wybrany termin: <strong>{startDate}</strong> — <strong>{endDate || startDate}</strong>
                    {priceSummary && !rangeConflict && (
                      <span style={{ marginLeft: '12px', color: THEME.textMuted }}>
                        ({priceSummary.daysCount} {priceSummary.daysCount === 1 ? 'dzień' : 'dni'}, łącznie: <strong>{priceSummary.baseCost.toFixed(2)} zł</strong>)
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ color: THEME.textMuted }}>Nie zaznaczono jeszcze żadnego terminu.</span>
                )}

                {rangeConflict && (
                  <div style={{ color: '#b91c1c', fontSize: '0.82rem', fontWeight: 600, marginTop: '4px' }}>
                    Wybrany przedział zawiera niedostępne dni. Zaznacz wolny zakres.
                  </div>
                )}

                {cartNotice && (
                  <div style={{ color: THEME.textMuted, fontSize: '0.82rem', marginTop: '4px' }}>
                    {cartNotice}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  disabled={!startDate || rangeConflict}
                  onClick={() => {
                    if (!startDate || rangeConflict || !priceSummary) return
                    if (onAddToCart) {
                      onAddToCart({
                        itemId: item.id,
                        name: cleanItemName,
                        brand: item.brand,
                        imageUrl: item.imageUrl,
                        startDate,
                        endDate: endDate || startDate,
                        daysCount: priceSummary.daysCount,
                        baseCost: priceSummary.baseCost
                      })
                    }
                    setCartNotice('Dodano do koszyka.')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    borderRadius: '4px',
                    border: `1px solid ${THEME.borderDefault}`,
                    backgroundColor: THEME.white,
                    color: !startDate || rangeConflict ? '#94a3b8' : THEME.textDark,
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: !startDate || rangeConflict ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ShoppingBag size={15} />
                  Dodaj do koszyka
                </button>

                <button
                  type="button"
                  disabled={!startDate || rangeConflict}
                  onClick={handleProceedToBuy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 24px',
                    borderRadius: '4px',
                    border: `1px solid ${!startDate || rangeConflict ? THEME.borderDefault : THEME.primary}`,
                    backgroundColor: !startDate || rangeConflict ? '#cbd5e1' : THEME.primary,
                    color: THEME.white,
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: !startDate || rangeConflict ? 'not-allowed' : 'pointer'
                  }}
                >
                  <CreditCard size={15} />
                  Kup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FORMULARZ ZAMÓWIENIA SPRZĘTU (Po kliknięciu "Kup") */}
        {showCheckoutForm && !isService && (
          <div
            ref={checkoutFormRef}
            style={{
              marginTop: '1.5rem',
              backgroundColor: THEME.white,
              border: `1px solid ${THEME.borderDefault}`,
              borderRadius: '4px',
              padding: '1.75rem'
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 4px 0' }}>
              Dane zamówienia, dostawa i płatność
            </h2>
            <p style={{ fontSize: '0.82rem', color: THEME.textMuted, margin: '0 0 1.25rem 0' }}>
              Termin: <strong>{startDate}</strong> — <strong>{endDate || startDate}</strong>
            </p>

            <form onSubmit={handleEquipmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>Imię</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>Nazwisko</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>Numer telefonu</label>
                  <input
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>Adres e-mail</label>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>Sposób odbioru / dostawy</label>
                  <select
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                  >
                    <option value="PICKUP">Odbiór osobisty (0 zł)</option>
                    <option value="DELIVERY">Dostawa pod wskazany adres (+50 zł)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>Metoda płatności</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                  >
                    <option value="BLIK">BLIK</option>
                    <option value="CARD">Karta płatnicza</option>
                    <option value="CASH">Gotówka przy odbiorze</option>
                  </select>
                </div>
              </div>

              {deliveryType === 'DELIVERY' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', padding: '1rem', backgroundColor: THEME.surface, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Ulica i nr domu"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Miejscowość"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Kod pocztowy (00-000)"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                  />
                </div>
              )}

              {priceSummary && (
                <div style={{ padding: '1rem', backgroundColor: THEME.surface, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Koszt wypożyczenia ({priceSummary.daysCount} {priceSummary.daysCount === 1 ? 'dzień' : 'dni'}):</span>
                    <strong>{priceSummary.baseCost.toFixed(2)} zł</strong>
                  </div>
                  {priceSummary.deliveryCost > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Dostawa pod adres:</span>
                      <strong>+{priceSummary.deliveryCost.toFixed(2)} zł</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${THEME.borderDivider}`, paddingTop: '6px', marginTop: '4px', fontSize: '1rem', fontWeight: 800 }}>
                    <span>Do zapłaty:</span>
                    <span>{priceSummary.total.toFixed(2)} zł</span>
                  </div>
                </div>
              )}

              {submitStatus.error && (
                <div style={{ padding: '10px 12px', borderRadius: '4px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
                  {submitStatus.error}
                </div>
              )}

              {submitStatus.success && (
                <div style={{ padding: '10px 12px', borderRadius: '4px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.85rem', fontWeight: 700 }}>
                  {submitStatus.success}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={submitStatus.loading || rangeConflict}
                  style={{
                    padding: '11px 28px',
                    borderRadius: '4px',
                    border: `1px solid ${THEME.primary}`,
                    backgroundColor: THEME.primary,
                    color: THEME.white,
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {submitStatus.loading ? 'Zapisywanie...' : 'Potwierdź i zamów'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}