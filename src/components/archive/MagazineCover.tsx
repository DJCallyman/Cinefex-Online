import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Magazine } from '../../types';
import { COVER_PATH, COVER_FALLBACK } from '../../config';

interface MagazineCoverProps {
    magazine: Magazine;
}

export function MagazineCover({ magazine }: MagazineCoverProps) {
    const navigate = useNavigate();
    const [imgSrc, setImgSrc] = useState(COVER_PATH(magazine.issue));
    const [imgError, setImgError] = useState(false);

    const handleClick = () => {
        navigate(`/issue/${magazine.issue}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    const handleImgError = () => {
        if (!imgError) {
            setImgSrc(COVER_FALLBACK(magazine.issue));
            setImgError(true);
        }
    };

    return (
        <div
            className="magazine-cover cursor-pointer group"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`View Issue ${magazine.issue} (${magazine.year})`}
        >
            <img
                src={imgSrc}
                alt={`Cover of Cinefex Issue ${magazine.issue}`}
                className="w-full rounded-lg shadow-lg object-cover"
                loading="lazy"
                onError={handleImgError}
            />
            <div className="mt-3 text-center">
                <h3 className="font-semibold text-white">Issue {magazine.issue}</h3>
                <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{magazine.year}</p>
            </div>
        </div>
    );
}
