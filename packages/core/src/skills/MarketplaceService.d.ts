export interface MarketplaceItem {
    name: string;
    url: string;
    description: string;
    source: 'community' | 'official';
    installCommand?: string;
}
export declare class MarketplaceService {
    private cachePath;
    private sourceUrl;
    constructor();
    private ensureCacheDir;
    updateIndex(): Promise<MarketplaceItem[]>;
    getIndex(): Promise<MarketplaceItem[]>;
    private parseReadme;
}
//# sourceMappingURL=MarketplaceService.d.ts.map