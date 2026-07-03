import ReactDOM from 'react-dom/client'
import BasicPage, { type BasicPageProps } from './components/preview/BasicPage'
import './index.css'

declare global {
  interface Window {
    __DEMO_DATA__?: BasicPageProps
  }
}

const root = document.getElementById('demo-root')
const data = window.__DEMO_DATA__

if (root && data) {
  ReactDOM.createRoot(root).render(<BasicPage {...data} />)
} else if (root) {
  root.textContent = '演示数据暂不可用'
}
