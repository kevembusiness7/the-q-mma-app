import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { AthletesPage } from './pages/AthletesPage'

function App() {
  const [activeTab, setActiveTab] = useState('athletes')

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'athletes' ? (
        <AthletesPage />
      ) : (
        <div className="px-4 pt-16 text-center text-sm text-(--color-text-secondary)">
          <p className="font-(family-name:--font-display) text-2xl uppercase text-silver-metallic mb-2">
            Coming soon
          </p>
          <p>
            This build focuses on the <span className="text-(--color-gold)">Athletes</span> tab.
            The Q, Shop, Cart and You are next.
          </p>
        </div>
      )}
    </AppShell>
  )
}

export default App
