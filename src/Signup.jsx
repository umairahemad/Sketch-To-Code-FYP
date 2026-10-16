import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './auth.css'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to create your account.')
      }

      setSuccess('Account created successfully! Redirecting to Login...')

      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1200)
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Please check that FastAPI is running.'
          : err.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSignup}>
        <h1>Create Account</h1>
        <p>Join Sketch-to-Code and turn your ideas into code.</p>

        {error && (
          <p role="alert" style={{ color: '#dc2626' }}>
            {error}
          </p>
        )}

        {success && (
          <p role="status" style={{ color: '#15803d' }}>
            {success}
          </p>
        )}

        <label htmlFor="signup-name">Full Name</label>
        <input
          id="signup-name"
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />

        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />

        <label htmlFor="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>

        <Link to="/" className="auth-home-link">
          Back to Home
        </Link>
      </form>
    </div>
  )
}