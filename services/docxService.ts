import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

// Declare global for the UMD module loaded via script tag
declare global {
  interface Window {
    ImageModule: any;
  }
}

// Helper to inspect docx and find potential keys (simple regex approach)
export const extractKeysFromDocx = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (!content) throw new Error("File content empty");
        
        const zip = new PizZip(content as ArrayBuffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });
        
        const text = doc.getFullText();
        const matches = text.match(/\{{1,2}([a-zA-Z0-9_]+)\}{1,2}/g);
        
        if (!matches) {
          resolve([]);
          return;
        }

        const uniqueKeys: string[] = Array.from(new Set(matches.map(m => m.replace(/[\{\}]/g, ''))));
        resolve(uniqueKeys);
      } catch (error) {
        console.error("Error parsing docx:", error);
        resolve([]);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

interface GenerateOptions {
  file: File;
  data: Record<string, string>;
  fileName: string;
  images?: Record<string, ArrayBuffer | null>;
}

export const generateDocument = ({ file, data, fileName, images }: GenerateOptions): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (!content) {
          reject(new Error('File content empty'));
          return;
        }

        const zip = new PizZip(content as ArrayBuffer);

        // Setup options
        const options: any = {
          paragraphLoop: true,
          linebreaks: true,
        };

        // Configure Image Module if images are provided and the module exists
        if (images && window.ImageModule) {
          const imageOpts = {
            centered: false,
            getImage: (tag: string, tagName: string) => {
              if (images[tagName]) {
                return images[tagName];
              }
              return null;
            },
            getSize: () => [500, 300],
          };
          options.modules = [new window.ImageModule(imageOpts)];
        }

        const doc = new Docxtemplater(zip, options);
        doc.render(data);

        const blob = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        saveAs(blob, fileName);
        resolve();
      } catch (error) {
        console.error("Error generating document:", error);
        reject(error);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
