import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/themes.css";
import { AppSettingsProvider } from "./contexts/AppSettingsContext";



try {
    const rootElement = document.getElementById("root");


    if (!rootElement) {
        throw new Error("Root element not found");
    }

    const root = createRoot(rootElement);


    root.render(
        <StrictMode>
            <AppSettingsProvider>
                <App />
            </AppSettingsProvider>
        </StrictMode>
    );

} catch (error) {
    console.error("Failed to mount React app:", error);
    document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Error Loading Application</h1><pre>${error}</pre></div>`;
}

