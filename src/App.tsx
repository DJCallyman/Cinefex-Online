import { Routes, Route } from 'react-router-dom';
import { Header, SkipLink, ScrollToTop } from './components/layout';
import { ArchiveGrid } from './components/archive';
import { IssueModal } from './components/modal';
import { ArticleViewer } from './components/viewer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useArchiveContext } from './context/ArchiveContext';

function AppContent() {
    const { selectedIssue, setSelectedIssue } = useArchiveContext();

    const handleErrorReset = () => {
        setSelectedIssue(null);
    };

    return (
        <ErrorBoundary onReset={handleErrorReset}>
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
        </ErrorBoundary>
    );
}

export function App() {
    return <AppContent />;
}
