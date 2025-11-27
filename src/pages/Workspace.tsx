import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from '@/components/NavBar';
import { UploadCard } from '@/components/UploadCard';
import { FileList, FileItem } from '@/components/FileList';
import { EmptyState } from '@/components/EmptyState';
import { FileCode } from 'lucide-react';
import { analytics } from '@/lib/analytics';

// TODO: Integrate with Lovable Cloud storage
// This is UI-only. Backend file storage integration required.

const Workspace = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    analytics.page('Workspace');
    
    // TODO: Fetch user's files from Lovable Cloud storage
    // Example: const { data } = await supabase.storage.from('uploads').list()
  }, []);

  const handleFileSelect = (selectedFiles: File[]) => {
    // TODO: Upload to Lovable Cloud storage
    // Example: await supabase.storage.from('uploads').upload(path, file)
    
    const newFiles: FileItem[] = selectedFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      uploadedAt: new Date(),
      status: 'processing' as const,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Simulate processing completion
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((f) =>
          newFiles.some((nf) => nf.id === f.id) ? { ...f, status: 'ready' as const } : f
        )
      );
    }, 2000);
  };

  const handleView = (fileId: string) => {
    analytics.track('file_download');
    navigate(`/results?file=${fileId}`);
  };

  const handleDownload = (fileId: string) => {
    analytics.track('file_download');
    // TODO: Download from Lovable Cloud storage
    console.log('Download file:', fileId);
  };

  const handleDelete = (fileId: string) => {
    analytics.track('file_delete');
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    // TODO: Delete from Lovable Cloud storage
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar isAuthenticated={true} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Workspace</h1>
          <p className="text-muted-foreground">Upload and manage your code files</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <UploadCard onFileSelect={handleFileSelect} />
          </div>

          <div className="lg:col-span-2">
            {files.length === 0 ? (
              <EmptyState
                icon={FileCode}
                title="No files yet"
                description="Upload your first file to get started with secure code review"
              />
            ) : (
              <div>
                <h2 className="mb-4 text-xl font-semibold">Your Files</h2>
                <FileList
                  files={files}
                  onView={handleView}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Workspace;
