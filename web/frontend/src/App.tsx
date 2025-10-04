import { RouterProvider } from './router'
import { UIProvider } from './context/ui'
import { OrgProvider } from './context/org'

function App() {
  return (
    <OrgProvider>
      <UIProvider>
        <RouterProvider />
      </UIProvider>
    </OrgProvider>
  )
}

export default App
