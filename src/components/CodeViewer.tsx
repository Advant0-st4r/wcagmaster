import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';

interface CodeViewerProps {
  original: string;
  modified: string;
  fileName: string;
}

export const CodeViewer = ({ original, modified, fileName }: CodeViewerProps) => {
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'split' | 'original' | 'modified'>('split');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(modified);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{fileName}</h2>
        
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-1">
            <Button
              variant={activeView === 'split' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('split')}
            >
              Split
            </Button>
            <Button
              variant={activeView === 'original' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('original')}
            >
              Original
            </Button>
            <Button
              variant={activeView === 'modified' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('modified')}
            >
              Modified
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${activeView === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {(activeView === 'split' || activeView === 'original') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Original
                <Badge variant="secondary">Before</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                <code>{original}</code>
              </pre>
            </CardContent>
          </Card>
        )}

        {(activeView === 'split' || activeView === 'modified') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Modified
                <Badge variant="outline">After</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                <code>{modified}</code>
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
