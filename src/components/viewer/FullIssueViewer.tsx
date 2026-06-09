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
    const [srcDoc, setSrcDoc] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);

    // Adjacent issues for prev/next navigation
    const { prev: prevIssue, next: nextIssue } = useMemo(
        () => getIssueNeighbors(magazines, issueNumber),
        [magazines, issueNumber],
    );

    // Build the stitched HTML whenever the issue changes. The fetch chain is
    // kicked off on mount and on issue-number change; in-flight requests for
    // a stale issue are abandoned by the simple "set state when promise
    // resolves" pattern (a later resolve just writes to a stale closure).
    useEffect(() => {
        if (!Number.isFinite(issueNumber) || !magazine) {
            setSrcDoc(null);
            return;
        }
        let cancelled = false;
        setSrcDoc(null);
        setHasError(false);
        buildFullIssueHtml(issueNumber, magazine)
            .then((html) => {
                if (!cancelled) setSrcDoc(html);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error(`[CinefexFullIssue] Failed to build issue ${issueNumber}:`, err);
                setHasError(true);
            });
        return () => {
            cancelled = true;
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
            {!srcDoc && !hasError && (
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

            {srcDoc && (
                <iframe
                    key={`full-issue-${issueNumber}`}
                    ref={iframeRef}
                    srcDoc={srcDoc}
                    className="w-full h-full border-0"
                    title={`Cinefex Issue ${issueNumber} (full issue)`}
                    onLoad={handleIframeLoad}
                />
            )}
        </ViewerShell>
    );
}
