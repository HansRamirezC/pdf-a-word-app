import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download, X } from 'lucide-react';

// Detecta automáticamente si estás en Codespaces o en local/producción
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (window.location.hostname.includes('app.github.dev')) {
    return window.location.origin.replace('-5173.', '-8000.');
  }
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();

export default function App() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [convertedName, setConvertedName] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelection = (selectedFile) => {
    setErrorMessage('');
    setDownloadUrl(null);
    setStatus('idle');

    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setErrorMessage('Por favor, selecciona únicamente archivos en formato PDF.');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMessage('El archivo supera el límite máximo permitido de 25 MB.');
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelection(e.dataTransfer.files[0]);
  };

  const handleConvert = async () => {
    if (!file) return;
    setStatus('converting');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/convert-pdf-to-word`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Ocurrió un error al convertir el documento.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const outputName = file.name.replace(/\.pdf$/i, '.docx');

      setDownloadUrl(url);
      setConvertedName(outputName);
      setStatus('success');
      triggerDownload(url, outputName);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  };

  const triggerDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const resetApp = () => {
    if (downloadUrl) window.URL.revokeObjectURL(downloadUrl);
    setFile(null);
    setDownloadUrl(null);
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-rose-600 text-white p-2 rounded-lg font-bold text-lg">
            PDF<span className="font-light">2</span>DOCX
          </div>
          <span className="font-semibold text-slate-700 text-lg tracking-tight">TuConvertidor</span>
        </div>
        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
          100% Privado • Borrado automático
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-2xl mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-3">
            Convierte PDF a Word editable
          </h1>
          <p className="text-slate-600 text-lg">
            Transforma tus documentos PDF en archivos DOCX manteniendo tablas, imágenes y formato original.
          </p>
        </div>

        <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                isDragging ? 'border-rose-500 bg-rose-50' : 'border-slate-300 hover:border-rose-500 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFileSelection(e.target.files[0])}
              />
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <button
                type="button"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-3 rounded-xl shadow-sm transition mb-3"
              >
                Seleccionar archivo PDF
              </button>
              <p className="text-sm text-slate-500">o arrastra y suelta tu documento aquí (Máx. 25 MB)</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-8 h-8 text-rose-600 shrink-0" />
                  <div className="truncate">
                    <p className="font-medium text-slate-800 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                {status !== 'converting' && (
                  <button onClick={resetApp} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {status === 'idle' && (
                <button
                  onClick={handleConvert}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-xl shadow-md transition text-lg"
                >
                  Convertir a WORD →
                </button>
              )}

              {status === 'converting' && (
                <div className="text-center py-6 space-y-3">
                  <Loader2 className="w-10 h-10 text-rose-600 animate-spin mx-auto" />
                  <p className="font-semibold text-slate-700">Analizando estructura y convirtiendo...</p>
                  <p className="text-xs text-slate-500">Esto puede tardar unos segundos según la cantidad de páginas.</p>
                </div>
              )}

              {status === 'success' && (
                <div className="text-center space-y-4 bg-emerald-50 border border-emerald-200 p-6 rounded-xl">
                  <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                  <div>
                    <h3 className="font-bold text-emerald-900 text-lg">¡Archivo convertido con éxito!</h3>
                    <p className="text-sm text-emerald-700">Tu descarga debería haber comenzado automáticamente.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <button
                      onClick={() => triggerDownload(downloadUrl, convertedName)}
                      className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg transition"
                    >
                      <Download className="w-4 h-4" /> Descargar de nuevo
                    </button>
                    <button
                      onClick={resetApp}
                      className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-5 py-2.5 rounded-lg transition"
                    >
                      Convertir otro PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}