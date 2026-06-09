import { NavLink } from 'react-router-dom';
import { SearchBar } from '../search/SearchBar';
import { BucketNav } from './BucketNav';
import { useArchiveContext } from '../../context/ArchiveContext';
import { useBookmarks } from '../../context/BookmarksContext';
import { StarIcon } from '../icons/StarIcon';

export function Header() {
    const { buckets } = useArchiveContext();
    const { bookmarks } = useBookmarks();

    return (
        <header className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="max-w-7xl mx-auto text-center relative">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
                    Cinefex Archives
                </h1>
                <p className="mt-2 text-lg text-gray-300">A tribute to the journal of cinematic illusions.</p>
                {__APP_VERSION__ && (
                    <p className="mt-1 text-xs text-gray-600 select-none" aria-hidden="true">v{__APP_VERSION__}</p>
                )}

                <NavLink
                    to="/bookmarks"
                    className={({ isActive }) =>
                        'absolute right-0 top-0 hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors border ' +
                        (isActive
                            ? 'bg-cyan-500 text-gray-900 border-cyan-400'
                            : 'bg-gray-800/70 text-gray-200 border-gray-700 hover:bg-cyan-500 hover:text-gray-900 hover:border-cyan-400')
                    }
                    aria-label={`Saved articles (${bookmarks.length})`}
                >
                    <StarIcon filled={true} />
                    Saved
                    {bookmarks.length > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-cyan-400 text-gray-900 text-xs font-bold">
                            {bookmarks.length}
                        </span>
                    )}
                </NavLink>

                <BucketNav buckets={buckets} />
                <div className="mt-4 max-w-md mx-auto">
                    <SearchBar />
                </div>
            </div>
        </header>
    );
}
