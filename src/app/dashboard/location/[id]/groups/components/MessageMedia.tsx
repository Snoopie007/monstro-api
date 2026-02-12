import { Media } from "@subtrees/types/vendor/social";

interface MessageMediaProps {
    media: Media[];
}

export function MessageMedia({ media }: MessageMediaProps) {
    if (!media || media.length === 0) return null;

    const images = media.filter(m => m.fileType === 'image' || m.mimeType?.startsWith('image/'));
    const otherFiles = media.filter(m => !(m.fileType === 'image' || m.mimeType?.startsWith('image/')));

    return (
        <>
            {/* Non-Image Files List */}
            {otherFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {otherFiles.map((file) => (
                        <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-muted/50 gap-2 min-w-[150px] hover:bg-muted transition-colors rounded-md border border-border/50"
                        >
                            <span className="text-xs truncate max-w-[120px]">{file.fileName}</span>
                        </a>
                    ))}
                </div>
            )}

            {/* Images Grid */}
            {images.length > 0 && (
                <div className={`grid gap-0.5 mt-2 rounded-xl overflow-hidden border border-border/20 ${
                    images.length === 1 ? 'grid-cols-1 max-w-[260px]' : 'grid-cols-2 max-w-[320px]'
                }`}>
                    {images.slice(0, 4).map((image, index) => {
                        const isLastSlot = index === 3;
                        const hasMore = images.length > 4;
                        const showOverlay = isLastSlot && hasMore;
                        const extraCount = images.length - 3;
                        const isFirstOfThree = images.length === 3 && index === 0;

                        return (
                            <div
                                key={image.id}
                                className={`relative bg-muted ${
                                    images.length === 1
                                        ? 'aspect-auto'
                                        : (isFirstOfThree ? 'row-span-2 h-full' : 'aspect-square')
                                }`}
                            >
                                <img
                                    src={image.url}
                                    alt={image.fileName || 'Attachment'}
                                    className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
                                    onClick={() => window.open(image.url, '_blank')}
                                />
                                {showOverlay && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                                        <span className="text-white font-bold text-lg">+{extraCount}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}

