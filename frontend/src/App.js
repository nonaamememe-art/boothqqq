import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import TemplateSelectionPage from "@/pages/TemplateSelectionPage";
import CameraCapturePage from "@/pages/CameraCapturePage";
import DecorationPage from "@/pages/DecorationPage";
import ResultPage from "@/pages/ResultPage";
import DownloadPage from "@/pages/DownloadPage";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TemplateSelectionPage />} />
          <Route path="/capture/:sessionId" element={<CameraCapturePage />} />
          <Route path="/decorate/:sessionId" element={<DecorationPage />} />
          <Route path="/result/:sessionId" element={<ResultPage />} />
          <Route path="/download/:sessionId" element={<DownloadPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </div>
  );
}

export default App;
