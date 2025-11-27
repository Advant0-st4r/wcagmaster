import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { NavBar } from '@/components/NavBar';
import { CodeViewer } from '@/components/CodeViewer';
import { Button } from '@/components/ui/button';
import { Share2, Download, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';

// TODO: Integrate with Lovable Cloud to fetch actual file results
// This is UI-only placeholder data

const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileId = searchParams.get('file');

  // Placeholder data - replace with actual data from Lovable Cloud
  const [fileName] = useState('example.tsx');
  const [original] = useState(`function calculateTotal(items) {
  let total = 0;
  for(let i=0; i<items.length; i++) {
    total += items[i].price;
  }
  return total;
}`);

  const [modified] = useState(`function calculateTotal(items: Item[]): number {
  return items.reduce((total, item) => total + item.price, 0);
}`);

  useEffect(() => {
    analytics.page('Results');
    
    // TODO: Fetch file results from Lovable Cloud
    // Example: const { data } = await supabase.from('results').select('*').eq('file_id', fileId)
  }, [fileId]);

  const handleApprove = () => {
    analytics.track('results_approved');
    toast({
      title: 'Changes approved',
      description: 'File has been marked as approved',
    });
  };

  const handleRevision = () => {
    analytics.track('results_revision');
    toast({
      title: 'Revision requested',
      description: 'Your feedback has been recorded',
    });
  };

  const handleShare = async () => {
    analytics.track('share_clicked');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Code Review: ${fileName}`,
          text: 'Check out this code review',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard',
      });
    }
  };

  const handleDownload = () => {
    analytics.track('file_download');
    // TODO: Download modified file from Lovable Cloud storage
    const blob = new Blob([modified], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar isAuthenticated={true} />

      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/workspace')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workspace
        </Button>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Review Results</h1>
            <p className="text-muted-foreground">Compare and approve changes</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" onClick={handleRevision}>
              <XCircle className="mr-2 h-4 w-4" />
              Request Revision
            </Button>
            <Button onClick={handleApprove}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>

        <CodeViewer original={original} modified={modified} fileName={fileName} />
      </main>
    </div>
  );
};

export default Results;
