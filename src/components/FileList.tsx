import { FileCode, Download, Trash2, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type FileStatus = 'uploaded' | 'processing' | 'ready' | 'error';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  status: FileStatus;
}

interface FileListProps {
  files: FileItem[];
  onView?: (fileId: string) => void;
  onDownload?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
}

const statusConfig: Record<FileStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  uploaded: { label: 'Uploaded', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'default' },
  ready: { label: 'Ready', variant: 'outline' },
  error: { label: 'Error', variant: 'destructive' },
};

export const FileList = ({ files, onView, onDownload, onDelete }: FileListProps) => {
  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileCode className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No files uploaded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <Card key={file.id} className="transition-shadow hover:shadow-md">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileCode className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{file.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB • {file.uploadedAt.toLocaleDateString()}
                </p>
              </div>

              <Badge variant={statusConfig[file.status].variant}>
                {statusConfig[file.status].label}
              </Badge>
            </div>

            <div className="flex items-center gap-2 ml-4">
              {file.status === 'ready' && onView && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView(file.id)}
                  aria-label="View file"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              
              {onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDownload(file.id)}
                  aria-label="Download file"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(file.id)}
                  aria-label="Delete file"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
