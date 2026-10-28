import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/ibm-plex-sans";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
