import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

const AppLayout = () => (
  <div className="app-shell min-h-screen p-4 lg:p-6">
    <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
        <Sidebar />
      </div>
      <div className="min-w-0">
        <Header />
        <main className="app-main rounded-[30px] border p-4 shadow-xl backdrop-blur sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  </div>
);

export default AppLayout;
