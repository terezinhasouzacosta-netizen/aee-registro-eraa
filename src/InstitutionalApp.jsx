import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./routes/AppRoutes";

function InstitutionalApp() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default InstitutionalApp;
