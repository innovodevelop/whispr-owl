console.log("Main.tsx: Starting app...");
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/securityHeaders'

console.log("Main.tsx: Imports loaded, creating root...");
createRoot(document.getElementById("root")!).render(<App />);
console.log("Main.tsx: App rendered");
