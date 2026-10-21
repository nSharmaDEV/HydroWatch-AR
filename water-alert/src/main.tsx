import { createRoot } from 'react-dom/client'
import ConnectedApp from './ConnectedApp'
import LogoIntro from './LogoIntro'
import './styles.css'
import { preparePushWorker } from './push'
void preparePushWorker().catch(() => {}) // Permission and enrollment are still strictly user-initiated.
createRoot(document.getElementById('root')!).render(<><ConnectedApp /><LogoIntro /></>)
