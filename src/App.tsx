import { Routes, Route } from 'react-router-dom';
import { Header, SkipLink, ScrollToTop } from './components/layout';
import { ArchiveGrid } from './components/archive';
import { IssueModal } from './components/modal';
import { ArticleViewer } from './components/viewer';
import { useArchiveContext } from './context/ArchiveContext';
import { useEffect } from 'react';

function AppContent() {
    const { magazines, isLoading, selectedIssue } = useArchiveContext();

    useEffect(() => {
        if ('serviceWorker' in navigator && !isLoading && magazines.length > 0) {
            navigator.serviceWorker.register('/sw.js').catch((err) => {
                console.warn('Service worker registration failed:', err);
            });
        }
    }, [isLoading, magazines.length]);

    return (
        <>
            <SkipLink />
            <Header />
            <main id="magazine-grid" className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" role="main">
                <Routes>
                    <Route path="/" element={<ArchiveGrid />} />
                    <Route path="/article/:articleIndex/:viewMode" element={<ArticleViewer />} />
                </Routes>
            </main>
            {selectedIssue !== null && <IssueModal issueNumber={selectedIssue} />}
            <ScrollToTop />
        </>
    );
}

export function App() {
    return <AppContent />;
}
