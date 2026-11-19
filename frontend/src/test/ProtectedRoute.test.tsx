import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

function renderWithAuth(value: Partial<AuthContextValue>) {
  const ctx: AuthContextValue = {
    user: null,
    status: 'unauthenticated',
    isAuthenticated: false,
    isRestoring: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    setCurrentUser: jest.fn(),
    ...value,
  }
  return render(
    <AuthContext.Provider value={ctx}>
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/projects" element={<div>Secret projects</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading skeleton while the session is restoring', () => {
    renderWithAuth({ status: 'loading', isRestoring: true })

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
    expect(screen.queryByText('Secret projects')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated users to /login', () => {
    renderWithAuth({})

    expect(screen.getByText('Login screen')).toBeInTheDocument()
  })

  it('renders the protected content when authenticated', () => {
    renderWithAuth({
      status: 'authenticated',
      isAuthenticated: true,
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Ada',
        email: 'ada@example.com',
        createdAt: '2026-01-01T00:00:00Z',
      },
    })

    expect(screen.getByText('Secret projects')).toBeInTheDocument()
  })
})
