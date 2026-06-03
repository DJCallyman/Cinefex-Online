export interface Article {
    name: string;
    readingUrl: string;
    archiveUrl: string;
    imageGalleryUrl?: string;
    articleTitle?: string;
}

export interface Magazine {
    issue: number;
    title: string;
    year: number;
    articles: Article[];
}

export type ViewMode = 'read' | 'archive';

export interface YearBucket {
    key: string;
    startYear: number;
    endYear: number;
    magazines: Magazine[];
}
