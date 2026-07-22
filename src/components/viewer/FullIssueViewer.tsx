import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useModalShell } from '../../hooks';
import { useArchiveContext } from '../../context/ArchiveContext';
import { injectStyles } from '../../services/styleInjection';
import { buildFullIssueHtml } from '../../services/fullIssue';
import { getIssueNeighbors } from '../../utils/nav';
import { ViewerShell } from './ViewerShell';

export function FullIssueViewer() {
    const navigate = useNavigate();
    const params = useParams();

    const issueNumber = parseInt(params.issueNumber ?? '', 10);

    const { getMagazineByIssue, magazines, setSelectedIssue } = useArchiveContext();
    const magazine = getMagazineByIssue(issueNumber);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    // We store a Blob URL (not the raw HTML string) so the multi-MB stitched
    // document can be released to garbage collection once the iframe has
    // loaded it. Keeping the raw string in state for the viewer's lifetime
    // risks out-of-memory crashes on memory-constrained devices (e.g. iPad).
    // The URL is revoked on cleanup (issue change / unmount).
    const [srcDocUrl, setSrcDocUrl] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);

    // Adjacent issues for prev/next navigation
    const { prev: prevIssue, next: nextIssue } = useMemo(
        () => getIssueNeighbors(magazines, issueNumber),
        [magazines, issueNumber],
    );

    // Build the stitched HTML whenever the issue changes. An AbortController
    // aborts all in-flight fetches when the user pages to another issue (or
    // unmounts) so the connection pool isn't saturated by stale requests.
    useEffect(() => {
        if (!Number.isFinite(issueNumber) || !magazine) {
            setSrcDocUrl(null);
            return;
        }
        const controller = new AbortController();
        let blobUrl: string | null = null;
        setSrcDocUrl(null);
        setHasError(false);
        buildFullIssueHtml(issueNumber, magazine, new DOMParser(), controller.signal)
            .then((html) => {
                if (controller.signal.aborted) return;
                // Wrap the HTML in a Blob URL so the string can be GC'd after
                // the iframe loads it, instead of lingering in React state.
                const blob = new Blob([html], { type: 'text/html' });
                blobUrl = URL.createObjectURL(blob);
                setSrcDocUrl(blobUrl);
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                // An AbortError is expected when navigating away — not a real failure.
                if (err instanceof DOMException && err.name === 'AbortError') return;
                console.error(`[CinefexFullIssue] Failed to build issue ${issueNumber}:`, err);
                setHasError(true);
            });
        return () => {
            controller.abort();
            if (blobUrl !== null) URL.revokeObjectURL(blobUrl);
        };
    }, [issueNumber, magazine]);

    const handleClose = useCallback(() => {
        setSelectedIssue(null);
        navigate('/');
    }, [setSelectedIssue, navigate]);

    const navigateToIssue = useCallback(
        (target: number | null) => {
            if (target === null) return;
            navigate(`/issue/${target}/full`);
        },
        [navigate],
    );

    const containerRef = useModalShell({
        isOpen: !!magazine,
        onClose: handleClose,
        initialFocusRef: closeButtonRef,
    });

    const handleIframeLoad = useCallback(() => {
        if (!iframeRef.current) return;
        // The stitcher already inlined the cover/masthead/ads/article/tail
        // pages and (for 127+) collapsed gallery spreads. We only need the
        // format-appropriate base CSS and the combined-archival polish.
        injectStyles(iframeRef.current, issueNumber, /* isReadingView */ false);
    }, [issueNumber]);

    if (!Number.isFinite(issueNumber) || !magazine) {
        return (
            <div className="fixed inset-0 z-[60] bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white max-w-md p-6">
                    <p className="text-xl mb-2">Issue not found</p>
                    <p className="text-sm text-gray-400 mb-6">
                        {Number.isFinite(issueNumber)
                            ? `Issue ${issueNumber} is not in the archive.`
                            : 'The issue URL is malformed.'}
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-500 text-white"
                    >
                        Return to Archive
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ViewerShell
            containerRef={containerRef}
            ariaLabel={`Full issue viewer: Issue ${issueNumber}`}
            toolbarRoleLabel="Full issue navigation"
            toolbarLabel={`Issue ${issueNumber} · Full Issue`}
            closeButtonRef={closeButtonRef}
            onClose={handleClose}
            prev={
                prevIssue !== null
                    ? {
                          label: `Issue ${prevIssue}`,
                          ariaLabel: `Previous issue: Issue ${prevIssue}`,
                          title: `← Issue ${prevIssue}`,
                          onClick: () => navigateToIssue(prevIssue),
                      }
                    : null
            }
            next={
                nextIssue !== null
                    ? {
                          label: `Issue ${nextIssue}`,
                          ariaLabel: `Next issue: Issue ${nextIssue}`,
                          title: `Issue ${nextIssue} →`,
                          onClick: () => navigateToIssue(nextIssue),
                      }
                    : null
            }
            prevFallback="First issue"
            nextFallback="Last issue"
        >
            {!srcDocUrl && !hasError && (
                <div className="loading-spinner visible absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {hasError && (
                <div className="load-error absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-xl text-white mb-4">Failed to load full issue</p>
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-500 text-white"
                    >
                        Close
                    </button>
                </div>
            )}

            {srcDocUrl && (
                <iframe
                    key={`full-issue-${issueNumber}`}
                    ref={iframeRef}
                    src={srcDocUrl}
                    className="w-full h-full border-0"
                    title={`Cinefex Issue ${issueNumber} (full issue)`}
                    sandbox="allow-same-origin"
                    onLoad={handleIframeLoad}
                />
            )}
        </ViewerShell>
    );
}
