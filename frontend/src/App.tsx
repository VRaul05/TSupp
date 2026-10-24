import { lazy, Suspense } from 'react';

const EmployeeApp = lazy(() => import('./EmployeeApp'));
const SupportApp = lazy(() => import('./support/SupportApp'));

export default function App() {
  const supportPortal = window.location.pathname === '/soporte'
    || window.location.pathname.startsWith('/soporte/');

  return (
    <Suspense fallback={<p role="status">Cargando portal…</p>}>
      {supportPortal ? <SupportApp /> : <EmployeeApp />}
    </Suspense>
  );
}
