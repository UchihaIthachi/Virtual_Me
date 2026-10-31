import React from 'react'

// Keeps the chat usable if a 3D asset fails to load: shows a small note
// (or the given fallback) instead of a blank page.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('3D scene failed:', error, info)
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}

export default ErrorBoundary
