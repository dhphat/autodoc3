import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import saveAs from 'file-saver';

// Declare global for the UMD module loaded via script tag
declare global {
  interface Window {
    ImageModule: any;
  }
}

// Helper to inspect docx and find potential keys (simple regex approach)
// Note: This is a "best effort" parse.
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
        // Regex to find {key} or {{key}}
        // We match words inside curly braces
        const matches = text.match(/\{{1,2}([a-zA-Z0-9_]+)\}{1,2}/g);
        
        if (!matches) {
          resolve([]);
          return;
        }

        const uniqueKeys: string[] = Array.from(new Set(matches.map(m => m.replace(/[\{\}]/g, ''))));
        resolve(uniqueKeys);
      } catch (error) {
        console.error("Error parsing docx:", error);
        resolve([]); // Fail gracefully by returning empty keys
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
  images?: Record<string, ArrayBuffer | null>; // Key is the tag name (without %), value is binary data
}

export const generateDocument = async ({ file, data, fileName, images }: GenerateOptions) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result;
      if (!content) return;

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
          getSize: () => [500, 300], // Default size: 500px width, 300px height (approx card size)
        };
        options.modules = [new window.ImageModule(imageOpts)];
      }

      const doc = new Docxtemplater(zip, options);

      // Render the document
      doc.render(data);

      const blob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      saveAs(blob, fileName);
    } catch (error) {
      console.error("Error generating document:", error);
      alert("Lỗi khi tạo file. Hãy kiểm tra xem file mẫu có đúng định dạng .docx.\n\nNếu dùng ảnh, hãy chắc chắn đã thêm tag {%cccd_truoc} hoặc {%cccd_sau} vào file.");
    }
  };
  reader.readAsArrayBuffer(file);
};
