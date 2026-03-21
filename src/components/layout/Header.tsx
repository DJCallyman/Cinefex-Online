import { SearchBar } from '../search/SearchBar';
import { BucketNav } from './BucketNav';
import { useArchiveContext } from '../../context/ArchiveContext';

export function Header() {
    const { buckets } = useArchiveContext();

    return (
        <header className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="max-w-7xl mx-auto text-center">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">Cinefex Archives</h1>
                <p className="mt-2 text-lg text-gray-300">A tribute to the journal of cinematic illusions.</p>
                <BucketNav buckets={buckets} />
                <div className="mt-4 max-w-md mx-auto relative">
                    <SearchBar />
                </div>
            </div>
        </header>
    );
}
