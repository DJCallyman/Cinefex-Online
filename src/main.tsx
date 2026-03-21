import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { ArchiveProvider } from './context/ArchiveContext';
import './styles/fonts.css';
import './styles/styles.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <HashRouter>
            <ArchiveProvider>
                <App />
            </ArchiveProvider>
        </HashRouter>
    </StrictMode>,
);
