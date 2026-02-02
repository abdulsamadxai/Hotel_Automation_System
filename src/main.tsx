import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/themes.css";
import { AppSettingsProvider } from "./contexts/AppSettingsContext";

console.log("main.tsx loaded");

try {
    const rootElement = document.getElementById("root");
    console.log("Root element:", rootElement);

    if (!rootElement) {
        throw new Error("Root element not found");
    }

    const root = createRoot(rootElement);
    console.log("React root created");

    root.render(
        <AppSettingsProvider>
            <App />
        </AppSettingsProvider>
    );
    console.log("App rendered");
} catch (error) {
    console.error("Failed to mount React app:", error);
    document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Error Loading Application</h1><pre>${error}</pre></div>`;
}

