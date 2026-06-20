import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
    children: ReactNode;
}

/**
 * Wraps route content in a keyed div so React remounts it on every pathname
 * change, re-triggering the page-enter CSS animation (fade).
 *
 * The `page-enter` animation is opacity-only (see `styles.css` keyframes).
 * We intentionally do NOT animate `transform` here, because any non-`none`
 * transform on an ancestor creates a containing block for `position: fixed`
 * descendants — which would break the fullscreen ArticleViewer `#viewer`
 * overlay (it would render inside the animated wrapper instead of being
 * pinned to the viewport).
 */
export function PageTransition({ children }: PageTransitionProps) {
    const { pathname } = useLocation();
    return (
        <div key={pathname} className="page-enter">
            {children}
        </div>
    );
}
