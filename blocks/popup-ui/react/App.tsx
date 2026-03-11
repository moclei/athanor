import React, { useState } from 'react'

// Inline message types — do not import from the messaging block at library level.
// When copying this block into a workspace extension, replace these with imports
// from your workspace messaging module.
type ExtensionMessage =
  | { type: 'FETCH_DATA'; payload: { url: string } }
  | { type: 'DATA_RESPONSE'; payload: { data: unknown } }
  | { type: 'ERROR'; payload: { message: string } }

// Default URL for the PoC — change this or accept it as a prop for your use case.
const DEFAULT_URL = 'https://dog.ceo/api/breeds/image/random'

function isImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(value) || value.startsWith('data:image/')
}

export function App(): React.ReactElement {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [response, setResponse] = useState<unknown>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleFetch(): Promise<void> {
    setStatus('loading')
    setResponse(null)
    setErrorMessage(null)

    try {
      const msg: ExtensionMessage = {
        type: 'FETCH_DATA',
        payload: { url: DEFAULT_URL },
      }
      const raw = await chrome.runtime.sendMessage(msg)
      const reply = raw as ExtensionMessage

      if (reply.type === 'DATA_RESPONSE') {
        setResponse(reply.payload.data)
        setStatus('done')
      } else if (reply.type === 'ERROR') {
        setErrorMessage(reply.payload.message)
        setStatus('error')
      } else {
        setErrorMessage('Unexpected response type')
        setStatus('error')
      }
    } catch (err) {
      setErrorMessage(String(err))
      setStatus('error')
    }
  }

  function renderResult(): React.ReactNode {
    if (status === 'idle') return null

    if (status === 'loading') {
      return <p style={styles.statusText}>Loading…</p>
    }

    if (status === 'error') {
      return (
        <p style={{ ...styles.statusText, color: '#d32f2f' }}>
          Error: {errorMessage}
        </p>
      )
    }

    // status === 'done'
    if (response !== null && typeof response === 'object') {
      const data = response as Record<string, unknown>
      // Dog API returns { message: <image-url>, status: "success" }
      if ('message' in data && isImageUrl(data.message)) {
        return (
          <img
            src={data.message as string}
            alt="Fetched result"
            style={styles.image}
          />
        )
      }
    }

    if (isImageUrl(response)) {
      return <img src={response} alt="Fetched result" style={styles.image} />
    }

    return (
      <pre style={styles.json}>{JSON.stringify(response, null, 2)}</pre>
    )
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Athanor</h2>
      <button
        onClick={handleFetch}
        disabled={status === 'loading'}
        style={status === 'loading' ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
      >
        {status === 'loading' ? 'Fetching…' : 'Fetch Data'}
      </button>
      <div style={styles.resultArea}>{renderResult()}</div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'system-ui, sans-serif',
    padding: '16px',
    maxWidth: '280px',
    margin: '0 auto',
  },
  heading: {
    margin: '0 0 12px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  button: {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#1976d2',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    backgroundColor: '#90caf9',
    cursor: 'not-allowed',
  },
  resultArea: {
    marginTop: '12px',
  },
  statusText: {
    fontSize: '13px',
    color: '#555',
    margin: 0,
  },
  image: {
    width: '100%',
    borderRadius: '4px',
  },
  json: {
    fontSize: '11px',
    overflowX: 'auto',
    backgroundColor: '#f5f5f5',
    padding: '8px',
    borderRadius: '4px',
    margin: 0,
  },
}
