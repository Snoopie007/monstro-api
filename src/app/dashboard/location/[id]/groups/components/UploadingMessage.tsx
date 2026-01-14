import { Progress } from "@/components/ui";
import { FileIcon } from "lucide-react";

interface UploadingMessageProps {
  progress: number;
  files: File[];
}

export function UploadingMessage({ progress, files }: UploadingMessageProps) {
  return (
    <div className="flex flex-col gap-3 bg-foreground/5 rounded-lg p-4 mt-2 border border-border/30">
      {/* File previews - show thumbnails for images, icons for others */}
      <div className="flex gap-2 flex-wrap">
        {files.slice(0, 4).map((file, index) => (
          <div 
            key={`${file.name}-${index}`}
            className="w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center"
          >
            {file.type.startsWith('image/') ? (
              <img 
                src={URL.createObjectURL(file)} 
                alt={file.name}
                className="w-full h-full object-cover opacity-60"
              />
            ) : (
              <FileIcon className="size-6 text-muted-foreground" />
            )}
          </div>
        ))}
        {files.length > 4 && (
          <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">+{files.length - 4}</span>
          </div>
        )}
      </div>

      {/* Progress bar with percentage */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Uploading {files.length} file{files.length > 1 ? 's' : ''}...</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
}

