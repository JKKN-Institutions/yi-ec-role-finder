import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdaptiveFlowTester } from '@/components/admin/AdaptiveFlowTester';

const AdminAdaptiveTest = () => {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader breadcrumb="Adaptive Testing" />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Adaptive Assessment Testing</h1>
              <p className="text-muted-foreground">
                Test the complete adaptive question flow from Q1 through Q5
              </p>
            </div>

            <AdaptiveFlowTester />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminAdaptiveTest;
