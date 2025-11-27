import { useEffect } from 'react';
import { NavBar } from '@/components/NavBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCode, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { analytics } from '@/lib/analytics';

// TODO: Integrate with Lovable Cloud to fetch user analytics
// This displays placeholder metrics only

const Dashboard = () => {
  useEffect(() => {
    analytics.page('Dashboard');
    
    // TODO: Fetch user metrics from Lovable Cloud
    // Example: const { data } = await supabase.from('user_stats').select('*')
  }, []);

  const metrics = [
    { title: 'Total Files', value: '24', icon: FileCode, trend: '+12%' },
    { title: 'Pending Reviews', value: '3', icon: Clock, trend: '-5%' },
    { title: 'Approved', value: '21', icon: CheckCircle, trend: '+8%' },
    { title: 'This Month', value: '15', icon: TrendingUp, trend: '+23%' },
  ];

  const recentActivity = [
    { file: 'auth.tsx', action: 'Approved', time: '2 hours ago' },
    { file: 'utils.ts', action: 'Uploaded', time: '5 hours ago' },
    { file: 'api.ts', action: 'Revision Requested', time: '1 day ago' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <NavBar isAuthenticated={true} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your code review activity</p>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-success">{metric.trend}</span> from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{activity.file}</p>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <a
                  href="/workspace"
                  className="block rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                >
                  <h3 className="font-medium">Upload New File</h3>
                  <p className="text-sm text-muted-foreground">Start a new code review</p>
                </a>
                <a
                  href="/workspace"
                  className="block rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                >
                  <h3 className="font-medium">View All Files</h3>
                  <p className="text-sm text-muted-foreground">Manage your uploads</p>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
