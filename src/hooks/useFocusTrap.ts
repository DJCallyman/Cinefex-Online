import { useRef, useEffect } from 'react';

export function useFocusTrap(isActive: boolean) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isActive) return;

        previousFocusRef.current = document.activeElement as HTMLElement;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !containerRef.current) return;

            const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            );

            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (previousFocusRef.current) {
                previousFocusRef.current.focus();
                previousFocusRef.current = null;
            }
        };
    }, [isActive]);

    return containerRef;
}
