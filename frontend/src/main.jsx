import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css';
import { NotificationContainer } from 'react-notifications';
import 'react-notifications/lib/notifications.css';
import { Provider } from 'react-redux';
import { store } from './utils/store.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}> 
    <App />
    <NotificationContainer />
    </Provider>
  </React.StrictMode>,
)
