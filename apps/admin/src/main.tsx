import {createRoot} from 'react-dom/client';
import {App} from './App';
import {AdminClient,browserStore} from './client';
import './style.css';
const client=new AdminClient(import.meta.env.VITE_API_URL??'http://127.0.0.1:3100/v1',undefined,browserStore());
createRoot(document.getElementById('root')!).render(<App client={client}/>);
