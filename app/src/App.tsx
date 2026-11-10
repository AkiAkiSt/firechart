import { AppDataProvider } from './app/AppDataProvider'
import { AppShell } from './app/AppShell'
import { ChartDetailScreen } from './features/chart/ChartDetailScreen'
import { ChartFormScreen } from './features/chart/ChartFormScreen'
import { ChartsScreen } from './features/charts/ChartsScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { StyleScreen } from './features/style/StyleScreen'
import { TodayScreen } from './features/today/TodayScreen'
import { useRoute, type Route } from './router'

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'charts':
      return <ChartsScreen />
    case 'chart':
      return <ChartDetailScreen chartId={route.id} from={route.from} />
    case 'new':
      return <ChartFormScreen />
    case 'edit':
      return <ChartFormScreen chartId={route.id} />
    case 'style':
      return <StyleScreen />
    case 'settings':
      return <SettingsScreen />
    default:
      return <TodayScreen />
  }
}

export default function App() {
  const route = useRoute()
  return (
    <AppDataProvider>
      <AppShell route={route}>
        <Screen route={route} />
      </AppShell>
    </AppDataProvider>
  )
}
