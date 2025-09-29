import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

// ✅ Initialize Convex Client with env check
const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.error("❌ Missing VITE_CONVEX_URL in your .env file");
}
const convex = new ConvexReactClient(convexUrl as string);

const rootElement = document.getElementById("root");

// ✅ Safety check for root element
if (!rootElement) {
  throw new Error("Root element not found. Did you forget <div id='root'> in index.html?");
}

createRoot(rootElement).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>
);
