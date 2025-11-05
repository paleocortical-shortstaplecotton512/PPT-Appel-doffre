import React, { useState, useCallback } from 'react';
import { DEVSOURCE_LOGO_SVG } from './constants';

// Declare JSZip as a global variable since it's loaded from a CDN
declare const JSZip: any;

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMessage(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || selectedFile.name.endsWith('.pptx')) {
        setFile(selectedFile);
      } else {
        setError('Veuillez sélectionner un fichier PowerPoint valide (.pptx).');
        setFile(null);
      }
    }
  };

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientName(e.target.value);
  };

  const handleSubmit = useCallback(async () => {
    if (!file || !clientName) {
      setError('Veuillez sélectionner un fichier et entrer un nom de client.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target?.result) {
            setError('Erreur lors de la lecture du fichier.');
            setIsProcessing(false);
            return;
        }

        const content = event.target.result;
        const zip = await JSZip.loadAsync(content);
        const placeholderRegex = /XXXX/gi;

        const promises: Promise<void>[] = [];
        zip.forEach((relativePath: string, fileEntry: any) => {
            const promise = (async () => {
                // Process only text-based files, copy others
                if (!fileEntry.dir && (relativePath.endsWith('.xml') || relativePath.endsWith('.rels'))) {
                    const fileContent = await fileEntry.async('string');
                    const newContent = fileContent.replace(placeholderRegex, clientName);
                    zip.file(relativePath, newContent);
                }
            })();
            promises.push(promise);
        });

        await Promise.all(promises);

        const newFilename = file.name.replace(placeholderRegex, clientName.toUpperCase());
        const newContentBlob = await zip.generateAsync({ 
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(newContentBlob);
        link.download = newFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        setSuccessMessage(`Le fichier "${newFilename}" a été généré avec succès!`);
      };

      reader.onerror = () => {
        setError('Erreur lors de la lecture du fichier.');
        setIsProcessing(false);
      }

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      setError(`Une erreur est survenue: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [file, clientName]);

  const isButtonDisabled = !file || !clientName || isProcessing;

  return (
    <div className="bg-devsource-dark min-h-screen text-devsource-light-blue flex flex-col font-sans">
      <header className="p-4 bg-devsource-teal/50 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={DEVSOURCE_LOGO_SVG} alt="Devsource Logo" className="h-12 w-12" />
            <h1 className="text-xl md:text-2xl font-bold text-devsource-white">Devsource Appel d'offre</h1>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="bg-devsource-teal p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6 transform transition-all hover:scale-[1.01]">
          <h2 className="text-2xl font-semibold text-center text-devsource-white">Personnaliser la présentation</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium mb-2">Nom du client</label>
              <input
                id="clientName"
                type="text"
                value={clientName}
                onChange={handleClientNameChange}
                placeholder="Entrez le nom du client"
                className="w-full px-4 py-2 bg-devsource-dark border border-devsource-light-blue/20 rounded-md focus:ring-2 focus:ring-devsource-yellow focus:border-devsource-yellow text-devsource-white placeholder-devsource-light-blue/50 outline-none transition"
              />
            </div>
            
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium mb-2">Fichier PowerPoint (.pptx)</label>
              <label htmlFor="file-upload" className="w-full flex items-center justify-center px-4 py-3 bg-devsource-dark border-2 border-dashed border-devsource-light-blue/30 rounded-md cursor-pointer hover:border-devsource-yellow transition text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {file ? <span className="truncate">{file.name}</span> : <span>Choisir un fichier</span>}
              </label>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={isButtonDisabled}
              className={`w-full font-bold py-3 px-4 rounded-md text-devsource-dark transition-all duration-300 flex items-center justify-center ${
                isButtonDisabled 
                ? 'bg-devsource-yellow/30 cursor-not-allowed' 
                : 'bg-devsource-yellow hover:bg-yellow-300 transform hover:-translate-y-1 shadow-lg'
              }`}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Traitement en cours...
                </>
              ) : 'Générer et Télécharger'}
            </button>
          </div>
          
          {error && <p className="text-center text-red-400 mt-4">{error}</p>}
          {successMessage && <p className="text-center text-green-400 mt-4">{successMessage}</p>}
        </div>
      </main>

      <footer className="p-4 bg-devsource-teal/50 mt-8">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center text-center gap-4">
           <img src={DEVSOURCE_LOGO_SVG} alt="Devsource Logo" className="h-8 w-8" />
           <p className="text-sm text-devsource-light-blue/80">Devsource by Maxime GUINARD</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
