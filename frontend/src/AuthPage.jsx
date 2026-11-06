import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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

export default function AuthPage({ onLoginSuccess }) {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  })
  const [errorMsg, setErrorMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber
        }

    try {
      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        // Zapis użytkownika
        localStorage.setItem('garden_user', JSON.stringify(data))
        if (onLoginSuccess) {
          onLoginSuccess(data)
        }
        navigate('/')
      } else {
        setErrorMsg(data.message || 'Wystąpił błąd podczas autoryzacji.')
      }
    } catch {
      setErrorMsg('Błąd połączenia z serwerem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#fafaf9',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1.5rem',
      boxSizing: 'border-box',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: THEME.white,
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        boxShadow: '0 10px 25px rgba(85, 107, 47, 0.1)',
        border: `1.5px solid ${THEME.surface}`,
        boxSizing: 'border-box'
      }}>
        {/* Logo i powrót */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
            <img src={logoImage} alt="GardenBooking" style={{ height: '40px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: THEME.primary }}>
              Garden<span style={{ color: THEME.accent }}>Booking</span>
            </span>
          </Link>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: THEME.textDark, marginTop: '1rem', marginBottom: '0.3rem' }}>
            {isLogin ? 'Logowanie do konta' : 'Rejestracja nowego konta'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: THEME.textMuted, margin: 0 }}>
            {isLogin ? 'Wprowadź swoje dane, aby zarządzać rezerwacjami' : 'Załóż konto i zyskaj dostęp do historii zamówień'}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fca5a5',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.25rem'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {!isLogin && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: THEME.textDark }}>
                  Imię:
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    style={{ width: '100%', padding: '9px 11px', marginTop: '4px', borderRadius: '2px', border: `1.5px solid ${THEME.border}`, outline: 'none', boxSizing: 'border-box' }}
                  />
                </label>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: THEME.textDark }}>
                  Nazwisko:
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    style={{ width: '100%', padding: '9px 11px', marginTop: '4px', borderRadius: '2px', border: `1.5px solid ${THEME.border}`, outline: 'none', boxSizing: 'border-box' }}
                  />
                </label>
              </div>

              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: THEME.textDark }}>
                Numer telefonu:
                <input
                  type="tel"
                  placeholder="np. 600700800"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  style={{ width: '100%', padding: '9px 11px', marginTop: '4px', borderRadius: '2px', border: `1.5px solid ${THEME.border}`, outline: 'none', boxSizing: 'border-box' }}
                />
              </label>
            </>
          )}

          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: THEME.textDark }}>
            Adres e-mail:
            <input
              type="email"
              required
              placeholder="twoj.email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: '100%', padding: '9px 11px', marginTop: '4px', borderRadius: '2px', border: `1.5px solid ${THEME.border}`, outline: 'none', boxSizing: 'border-box' }}
            />
          </label>

          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: THEME.textDark }}>
            Hasło:
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{ width: '100%', padding: '9px 11px', marginTop: '4px', borderRadius: '2px', border: `1.5px solid ${THEME.border}`, outline: 'none', boxSizing: 'border-box' }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.6rem',
              padding: '11px',
              backgroundColor: THEME.primary,
              color: THEME.white,
              border: 'none',
              borderRadius: '2px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            {loading ? 'Przetwarzanie...' : (isLogin ? 'Zaloguj się' : 'Zarejestruj się')}
          </button>
        </form>

        {/* logowanie / rejestracja */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: THEME.textMuted }}>
          {isLogin ? (
            <>
              Nie posiadasz jeszcze konta?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(false); setErrorMsg(null) }}
                style={{ background: 'none', border: 'none', color: THEME.primary, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Zarejestruj się
              </button>
            </>
          ) : (
            <>
              Masz już założone konto?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(true); setErrorMsg(null) }}
                style={{ background: 'none', border: 'none', color: THEME.primary, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Przejdź do logowania
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: '1.25rem', textAlign: 'center', borderTop: `1px solid ${THEME.surface}`, paddingTop: '1rem' }}>
          <Link to="/" style={{ fontSize: '0.82rem', color: THEME.textMuted, textDecoration: 'none' }}>
            ← Wróć do strony głównej
          </Link>
        </div>
      </div>
    </div>
  )
}