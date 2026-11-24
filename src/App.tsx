import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import StandortePage from '@/pages/StandortePage';
import BienenvoelkerPage from '@/pages/BienenvoelkerPage';
import StockarbeitenPage from '@/pages/StockarbeitenPage';
import HonigerntenPage from '@/pages/HonigerntenPage';
import PublicFormStandorte from '@/pages/public/PublicForm_Standorte';
import PublicFormBienenvoelker from '@/pages/public/PublicForm_Bienenvoelker';
import PublicFormStockarbeiten from '@/pages/public/PublicForm_Stockarbeiten';
import PublicFormHonigernten from '@/pages/public/PublicForm_Honigernten';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6b059693de76fd8f858198ae" element={<PublicFormStandorte />} />
              <Route path="public/6b0596986162709a126f2311" element={<PublicFormBienenvoelker />} />
              <Route path="public/6b059699c1cf09ae747a18d0" element={<PublicFormStockarbeiten />} />
              <Route path="public/6b059699682988dcf7c091c5" element={<PublicFormHonigernten />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
                <Route path="standorte" element={<StandortePage />} />
                <Route path="bienenvoelker" element={<BienenvoelkerPage />} />
                <Route path="stockarbeiten" element={<StockarbeitenPage />} />
                <Route path="honigernten" element={<HonigerntenPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
