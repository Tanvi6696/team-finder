import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

/** Catches render errors so one broken page does not blank the whole app. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Keep a console trace for debugging during the viva
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="glass max-w-md p-8 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <h2 className="font-display text-xl font-bold">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {this.state.error.message || 'Unexpected UI error'}
            </p>
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
