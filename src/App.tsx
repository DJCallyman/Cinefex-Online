import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header, SkipLink, ScrollToTop, ThemeToggle } from './components/layout';
import { ArchiveGrid } from './components/archive';
import { IssueModal } from './components/modal';
import { BookmarksView } from './components/bookmarks';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useArchiveContext } from './context/ArchiveContext';
import { useGlobalShortcuts, useFirstBucketPreloads } from './hooks';

const ArticleViewer = lazy(() =>
    import('./components/viewer').then((m) => ({ default: m.ArticleViewer })),
);

function AppContent() {
    const { selectedIssue, setSelectedIssue } = useArchiveContext();
    useGlobalShortcuts();
    useFirstBucketPreloads();

    const handleErrorReset = () => {
        setSelectedIssue(null);
    };

    return (
        <ErrorBoundary onReset={handleErrorReset}>
            <SkipLink />
            <Header />
            <main id="magazine-grid" className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" role="main">
                <Suspense
                    fallback={
                        <div className="flex items-center justify-center min-h-[60vh]">
                            <div
                                className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"
                                aria-label="Loading article"
                            />
                        </div>
                    }
                >
                    <Routes>
                        <Route path="/" element={<ArchiveGrid />} />
                        <Route path="/bookmarks" element={<BookmarksView />} />
                        <Route path="/article/:articleIndex/:viewMode" element={<ArticleViewer />} />
                    </Routes>
                </Suspense>
            </main>
            {selectedIssue !== null && <IssueModal issueNumber={selectedIssue} />}
            <ScrollToTop />
            <ThemeToggle />
        </ErrorBoundary>
    );
}

export function App() {
    return <AppContent />;
}
