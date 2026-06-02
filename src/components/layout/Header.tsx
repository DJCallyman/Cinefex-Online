import { NavLink } from 'react-router-dom';
import { SearchBar } from '../search/SearchBar';
import { BucketNav } from './BucketNav';
import { useArchiveContext } from '../../context/ArchiveContext';
import { useBookmarks } from '../../context/BookmarksContext';

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
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Saved
                    {bookmarks.length > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-cyan-400 text-gray-900 text-xs font-bold">
                            {bookmarks.length}
                        </span>
                    )}
                </NavLink>

                <BucketNav buckets={buckets} />
                <div className="mt-4 max-w-md mx-auto relative">
                    <SearchBar />
                </div>
            </div>
        </header>
    );
}
