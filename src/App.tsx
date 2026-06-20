import { lazy, Suspense, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Header, SkipLink, ScrollToTop, ThemeToggle } from './components/layout';
import { PageTransition } from './components/layout/PageTransition';
import { ArchiveGrid } from './components/archive';
import { SkeletonGrid } from './components/archive/SkeletonGrid';
import { IssueModal } from './components/modal';
import { BookmarksView } from './components/bookmarks';
import { ErrorBoundary } from './components/ErrorBoundary';
import { KeyboardHelpModal } from './components/ui/KeyboardHelpModal';
import { useArchiveContext } from './context/ArchiveContext';
import { useGlobalShortcuts } from './hooks';

const ArticleViewer = lazy(() =>
    import('./components/viewer').then((m) => ({ default: m.ArticleViewer })),
);

const FullIssueViewer = lazy(() =>
    import('./components/viewer').then((m) => ({ default: m.FullIssueViewer })),
);

/**
 * Fullscreen viewer routes own the entire viewport (the `#viewer` overlay is
 * `position: fixed; inset: 0`). The site header is also positioned (sticky,
 * z-20) and the viewer is z-60, so in the normal case the viewer wins — but
 * `position: sticky` + `overflow: hidden` on the body (set by useModalShell's
 * scroll lock) can let the sticky header render above fixed siblings in some
 * browsers. Hiding the header for viewer routes sidesteps the stacking
 * question entirely and reclaims the ~330px the banner + search + year nav
 * otherwise consume.
 */
const VIEWER_ROUTE_PREFIXES = ['/article/', '/issue/'] as const;

function isViewerPath(pathname: string): boolean {
    return VIEWER_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
}

function AppContent() {
    const { selectedIssue, setSelectedIssue } = useArchiveContext();
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const { pathname } = useLocation();
    const hideChrome = isViewerPath(pathname);

    useGlobalShortcuts({ onShowHelp: () => setShowKeyboardHelp(true) });

    const handleErrorReset = () => {
        setSelectedIssue(null);
    };

    return (
        <ErrorBoundary onReset={handleErrorReset}>
            {!hideChrome && <SkipLink />}
            {!hideChrome && <Header />}
            <main
                id="magazine-grid"
                className={
                    hideChrome
                        ? 'p-0 sm:p-0 lg:p-0 max-w-none mx-0'
                        : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'
                }
                role="main"
            >
                <Suspense fallback={<SkeletonGrid />}>
                    <PageTransition>
                        <Routes>
                            <Route path="/" element={<ArchiveGrid />} />
                            <Route path="/bookmarks" element={<BookmarksView />} />
                            <Route path="/issue/:issueNumber/full" element={<FullIssueViewer />} />
                            <Route path="/article/:articleIndex/:viewMode" element={<ArticleViewer />} />
                        </Routes>
                    </PageTransition>
                </Suspense>
            </main>
            {selectedIssue !== null && <IssueModal issueNumber={selectedIssue} />}
            {showKeyboardHelp && <KeyboardHelpModal onClose={() => setShowKeyboardHelp(false)} />}
            {!hideChrome && <ScrollToTop />}
            {!hideChrome && <ThemeToggle />}
        </ErrorBoundary>
    );
}

export function App() {
    return <AppContent />;
}
