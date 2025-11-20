import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdaptiveFlowTester } from '@/components/admin/AdaptiveFlowTester';
import { SidebarProvider } from '@/components/ui/sidebar';

const AdminAdaptiveTest = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader breadcrumb="Adaptive Testing" />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-8">
              <div className="max-w-4xl mx-auto space-y-8">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Adaptive Assessment Testing</h1>
                  <p className="text-muted-foreground">
                    Test the complete adaptive question flow from Q1 through Q5
                  </p>
                </div>

                <AdaptiveFlowTester />
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminAdaptiveTest;
