import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
    it('renders the backend test heading', () => {
        render(<App />)
        expect(screen.getByText('Backend Test Via CORS')).toBeDefined()
    })
})