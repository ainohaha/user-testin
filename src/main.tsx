
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { CustomThemeProvider } from "./context/ThemeContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <CustomThemeProvider>
    <App />
  </CustomThemeProvider>
);
