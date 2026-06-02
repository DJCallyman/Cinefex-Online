import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { ArchiveProvider } from './context/ArchiveContext';
import { BookmarksProvider } from './context/BookmarksContext';
import './styles/fonts.css';
import './styles/styles.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <HashRouter>
            <ArchiveProvider>
                <BookmarksProvider>
                    <App />
                </BookmarksProvider>
            </ArchiveProvider>
        </HashRouter>
    </StrictMode>,
);
