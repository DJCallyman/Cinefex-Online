import { useEffect, type RefObject } from 'react';
import { useFocusTrap } from './useFocusTrap';

interface UseModalShellOptions {
    isOpen: boolean;
    onClose: () => void;
    initialFocusRef?: RefObject<HTMLElement>;
}

export function useModalShell({ isOpen, onClose, initialFocusRef }: UseModalShellOptions) {
    const containerRef = useFocusTrap(isOpen);

    useEffect(() => {
        if (!isOpen) return;

        const rafId = requestAnimationFrame(() => {
            const target =
                initialFocusRef?.current ??
                containerRef.current?.querySelector<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                );
            target?.focus();
        });

        return () => {
            cancelAnimationFrame(rafId);
        };
    }, [isOpen, initialFocusRef, containerRef]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    return containerRef;
}
