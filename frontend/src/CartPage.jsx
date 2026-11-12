import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Trash2, ShoppingCart, CreditCard } from 'lucide-react'
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

export default function CartPage({ currentUser, cartItems, onRemoveFromCart, onClearCart }) {
  const navigate = useNavigate()

  const [guestName, setGuestName] = useState(
    currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : ''
  )
  const [guestEmail, setGuestEmail] = useState(currentUser?.email || '')
  const [guestPhone, setGuestPhone] = useState(currentUser?.phoneNumber || '')
  const [deliveryType, setDeliveryType] = useState('PICKUP')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('BLIK')

  const [submitStatus, setSubmitStatus] = useState({ loading: false, error: null, success: null })

  useEffect(() => {
    if (currentUser) {
      setGuestName(`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim())
      setGuestEmail(currentUser.email || '')
      setGuestPhone(currentUser.phoneNumber || '')
    }
  }, [currentUser])

  const itemsTotal = useMemo(() => {
    return cartItems.reduce((sum, entry) => sum + Number(entry.baseCost || 0), 0)
  }, [cartItems])

  const deliveryCost = cartItems.length > 0 && deliveryType === 'DELIVERY' ? 50 : 0
  const grandTotal = itemsTotal + deliveryCost

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault()
    if (cartItems.length === 0) return

    setSubmitStatus({ loading: true, error: null, success: null })

    try {
      const createdIds = []
      for (let i = 0; i < cartItems.length; i++) {
        const entry = cartItems[i]
        const payload = {
          userId: currentUser?.userId || currentUser?.id || null,
          itemId: Number(entry.itemId),
          startDate: `${entry.startDate}T08:00:00`,
          endDate: `${entry.endDate}T18:00:00`,
          guestName,
          guestEmail,
          guestPhone,
          deliveryType: i === 0 ? deliveryType : 'PICKUP',
          street: deliveryType === 'DELIVERY' ? street : '',
          city: deliveryType === 'DELIVERY' ? city : '',
          postalCode: deliveryType === 'DELIVERY' ? postalCode : '',
          paymentType: paymentMethod
        }

        const res = await fetch(`${API_BASE}/api/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.message || `Błąd przy rezerwacji: ${entry.name}`)
        }
        createdIds.push(data.reservationId || data.id)
      }

      onClearCart()
      setSubmitStatus({
        loading: false,
        error: null,
        success: `Zamówienie z koszyka zostało złożone (nr rezerwacji: ${createdIds.map(id => `#${id}`).join(', ')}).`
      })
    } catch (err) {
      setSubmitStatus({ loading: false, error: err.message, success: null })
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', color: THEME.textDark, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <img src={logoImg} alt="GardenBooking" style={{ height: '38px', objectFit: 'contain' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.primary }}>
            Garden<span style={{ color: THEME.accent }}>Booking</span>
          </span>
        </Link>

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
          Kontynuuj przeglądanie
        </button>
      </nav>

      <main style={{ maxWidth: '1040px', margin: '2rem auto', padding: '0 1rem 3rem 1rem' }}>
        <div style={{
          backgroundColor: THEME.white,
          border: `1px solid ${THEME.borderDefault}`,
          borderRadius: '4px',
          padding: '1.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={20} />
              Koszyk rezerwacji ({cartItems.length})
            </h1>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: `1px solid ${THEME.borderDefault}`,
                  backgroundColor: THEME.white,
                  color: THEME.textMuted,
                  cursor: 'pointer'
                }}
              >
                Wyczyść koszyk
              </button>
            )}
          </div>

          {submitStatus.success && (
            <div style={{ padding: '14px', borderRadius: '4px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>
              {submitStatus.success}
            </div>
          )}

          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: THEME.textMuted }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>Twój koszyk jest obecnie pusty.</p>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '9px 20px',
                  borderRadius: '4px',
                  border: `1px solid ${THEME.primary}`,
                  backgroundColor: THEME.primary,
                  color: THEME.white,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Przejdź do katalogu sprzętu
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
                {cartItems.map((entry) => (
                  <div
                    key={entry.cartEntryId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      borderRadius: '4px',
                      border: `1px solid ${THEME.borderDefault}`,
                      backgroundColor: THEME.surface,
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img
                        src={`${API_BASE}${entry.imageUrl}`}
                        alt={entry.name}
                        onError={(e) => { e.target.src = 'https://placehold.co/120x80/f8fafc/475569?text=Sprzet' }}
                        style={{ width: '72px', height: '54px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${THEME.borderDivider}` }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.98rem', color: THEME.textDark }}>
                          {entry.brand ? `${entry.brand} – ${entry.name}` : entry.name}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: THEME.textMuted, marginTop: '2px' }}>
                          Termin: <strong>{entry.startDate}</strong> — <strong>{entry.endDate}</strong> ({entry.daysCount} {entry.daysCount === 1 ? 'dzień' : 'dni'})
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: THEME.textDark }}>
                        {Number(entry.baseCost).toFixed(2)} zł
                      </span>
                      <button
                        type="button"
                        title="Usuń z koszyka"
                        onClick={() => onRemoveFromCart(entry.cartEntryId)}
                        style={{
                          width: '34px',
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          border: `1px solid ${THEME.borderDefault}`,
                          backgroundColor: THEME.white,
                          color: '#b91c1c',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${THEME.borderDivider}`, paddingTop: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>
                  Dane zamówienia, dostawa i płatność
                </h2>

                <form onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                        Imię i nazwisko
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                        Numer telefonu
                      </label>
                      <input
                        type="tel"
                        required
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
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
                        style={{ width: '100%', padding: '9px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                        Sposób odbioru / dostawy
                      </label>
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
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, display: 'block', marginBottom: '4px' }}>
                        Metoda płatności
                      </label>
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

                  <div style={{ padding: '1rem', backgroundColor: THEME.surface, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Suma pozycji w koszyku ({cartItems.length}):</span>
                      <strong>{itemsTotal.toFixed(2)} zł</strong>
                    </div>
                    {deliveryCost > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Koszt dostawy:</span>
                        <strong>+{deliveryCost.toFixed(2)} zł</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${THEME.borderDivider}`, paddingTop: '6px', marginTop: '4px', fontSize: '1.05rem', fontWeight: 800 }}>
                      <span>Łącznie do zapłaty:</span>
                      <span>{grandTotal.toFixed(2)} zł</span>
                    </div>
                  </div>

                  {submitStatus.error && (
                    <div style={{ padding: '10px 12px', borderRadius: '4px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
                      {submitStatus.error}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={submitStatus.loading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
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
                      <CreditCard size={16} />
                      {submitStatus.loading ? 'Przetwarzanie...' : 'Potwierdź i zamów wszystko'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}