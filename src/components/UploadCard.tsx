import { useCallback, useState } from 'react';
import { Upload, File } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { analytics } from '@/lib/analytics';

interface UploadCardProps {
  onFileSelect?: (files: File[]) => void;
}

export const UploadCard = ({ onFileSelect }: UploadCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      
      // Basic validation
      const validFiles = fileArray.filter((file) => {
        const isValid = file.size <= 10 * 1024 * 1024; // 10MB limit
        if (!isValid) {
          toast({
            variant: 'destructive',
            title: 'File too large',
            description: `${file.name} exceeds 10MB limit`,
          });
        }
        return isValid;
      });

      if (validFiles.length > 0) {
        onFileSelect?.(validFiles);
        analytics.track('file_upload', { count: validFiles.length });
        
        toast({
          title: 'Upload started',
          description: `Processing ${validFiles.length} file(s)`,
        });
      }
    },
    [onFileSelect, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        isDragging ? 'border-primary bg-accent/50' : 'border-border'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 rounded-full bg-primary/10 p-4">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        
        <h3 className="mb-2 text-lg font-semibold">Drop files here</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          or click to browse (Max 10MB per file)
        </p>

        <input
          type="file"
          id="file-upload"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.go,.rs,.rb"
        />
        
        <Button asChild variant="outline">
          <label htmlFor="file-upload" className="cursor-pointer">
            <File className="mr-2 h-4 w-4" />
            Select Files
          </label>
        </Button>
      </CardContent>
    </Card>
  );
};
