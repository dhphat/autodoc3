import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

// Access DocUtils from docxtemplater for module compatibility
const DocUtils = (Docxtemplater as any).DocUtils;

// ============================================================
// Custom Image Module — compatible with docxtemplater 3.67.5
// ============================================================
// The old CDN "docxtemplater-image-module-free@1.1.1" relies on
// `fileTypeConfig.tagTextXml` which was REMOVED in recent versions
// of docxtemplater.  This module is fully self-contained and uses
// only stable, public APIs of docxtemplater 3.x.
// ============================================================

const MODULE_NAME = 'autodoc-image-module';

interface ImageModuleOptions {
  images: Record<string, ArrayBuffer | null>;
  /** Default image size in pixels [width, height] */
  defaultSize?: [number, number];
}

function createImageModule({ images, defaultSize = [450, 300] }: ImageModuleOptions) {
  let imageNumber = 1;
  let zip: PizZip;
  let fileType: string;
  let xmlDocuments: Record<string, Document>;

  // ---- helpers ----

  function getNextImageName() {
    return `image_generated_${imageNumber++}.png`;
  }

  /** Detect actual image type from first bytes */
  function detectImageType(buffer: ArrayBuffer): { ext: string; mime: string } {
    const arr = new Uint8Array(buffer.slice(0, 12));
    // PNG: 89 50 4E 47
    if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47) {
      return { ext: 'png', mime: 'image/png' };
    }
    // JPEG: FF D8 FF
    if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
      return { ext: 'jpeg', mime: 'image/jpeg' };
    }
    // GIF: 47 49 46
    if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
      return { ext: 'gif', mime: 'image/gif' };
    }
    // WEBP: 52 49 46 46 ... 57 45 42 50
    if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
        arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) {
      return { ext: 'webp', mime: 'image/webp' };
    }
    // Default to png
    return { ext: 'png', mime: 'image/png' };
  }

  /** Add image file to the zip and create a relationship entry, return rId */
  function addImageToZip(imageData: ArrayBuffer, filePath: string): number {
    const imgType = detectImageType(imageData);
    const imageName = `image_generated_${imageNumber++}.${imgType.ext}`;
    const prefix = fileType === 'docx' ? 'word' : 'ppt';
    const imagePath = `${prefix}/media/${imageName}`;

    // 1. Write image binary into the ZIP
    zip.file(imagePath, imageData, { binary: true });

    // 2. Determine the rels file path for the current XML document
    const xmlBaseName = filePath.replace(/^.*?([a-zA-Z0-9]+)\.xml$/, '$1');
    const relsFilePath = `${prefix}/_rels/${xmlBaseName}.xml.rels`;

    let relsContent: string;
    const relsFile = zip.file(relsFilePath);
    if (relsFile) {
      relsContent = relsFile.asText();
    } else {
      relsContent =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '</Relationships>';
    }

    // 3. Find the next available rId
    const ridMatches = [...relsContent.matchAll(/Id="rId(\d+)"/g)];
    let maxRid = 0;
    ridMatches.forEach((m) => {
      maxRid = Math.max(maxRid, parseInt(m[1], 10));
    });
    const newRid = maxRid + 1;

    // 4. Append the relationship
    const newRel =
      `<Relationship Id="rId${newRid}" ` +
      `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" ` +
      `Target="media/${imageName}"/>`;
    relsContent = relsContent.replace('</Relationships>', newRel + '</Relationships>');
    zip.file(relsFilePath, relsContent);

    // 5. Ensure [Content_Types].xml has an entry for this extension
    const ctFile = zip.file('[Content_Types].xml');
    if (ctFile) {
      let ct = ctFile.asText();
      if (!ct.includes(`Extension="${imgType.ext}"`)) {
        ct = ct.replace(
          '</Types>',
          `<Default Extension="${imgType.ext}" ContentType="${imgType.mime}"/></Types>`,
        );
        zip.file('[Content_Types].xml', ct);
      }
    }

    return newRid;
  }

  /** Build the Office Open XML for an inline image */
  function buildImageXml(rId: number, size: [number, number]): string {
    const cx = Math.round(size[0] * 9525); // pixels → EMU
    const cy = Math.round(size[1] * 9525);
    const id = imageNumber; // unique id across the document

    return (
      '<w:drawing>' +
        '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
          `<wp:extent cx="${cx}" cy="${cy}"/>` +
          '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
          `<wp:docPr id="${id}" name="Image ${id}" descr="image"/>` +
          '<wp:cNvGraphicFramePr>' +
            '<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>' +
          '</wp:cNvGraphicFramePr>' +
          '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
            '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
              '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
                '<pic:nvPicPr>' +
                  `<pic:cNvPr id="0" name="Picture ${id}" descr="image"/>` +
                  '<pic:cNvPicPr>' +
                    '<a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>' +
                  '</pic:cNvPicPr>' +
                '</pic:nvPicPr>' +
                '<pic:blipFill>' +
                  `<a:blip r:embed="rId${rId}">` +
                    '<a:extLst>' +
                      '<a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}">' +
                        '<a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/>' +
                      '</a:ext>' +
                    '</a:extLst>' +
                  '</a:blip>' +
                  '<a:srcRect/>' +
                  '<a:stretch><a:fillRect/></a:stretch>' +
                '</pic:blipFill>' +
                '<pic:spPr bwMode="auto">' +
                  '<a:xfrm>' +
                    '<a:off x="0" y="0"/>' +
                    `<a:ext cx="${cx}" cy="${cy}"/>` +
                  '</a:xfrm>' +
                  '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
                  '<a:noFill/>' +
                  '<a:ln><a:noFill/></a:ln>' +
                '</pic:spPr>' +
              '</pic:pic>' +
            '</a:graphicData>' +
          '</a:graphic>' +
        '</wp:inline>' +
      '</w:drawing>'
    );
  }

  // ---- docxtemplater module interface ----

  return {
    name: MODULE_NAME,

    optionsTransformer(options: any, docxtemplater: any) {
      zip = docxtemplater.zip;
      fileType = docxtemplater.fileType;

      // Register rels & content-types files so docxtemplater tracks them
      const relsFiles = zip
        .file(/\.xml\.rels/)
        .concat(zip.file(/\[Content_Types\].xml/))
        .map((f: any) => f.name);
      options.xmlFileNames = options.xmlFileNames.concat(relsFiles);

      return options;
    },

    set(options: any) {
      if (options.zip) zip = options.zip;
      if (options.xmlDocuments) xmlDocuments = options.xmlDocuments;
    },

    parse(placeHolderContent: string) {
      // Recognise {%%key} (centered) and {%key} (inline)
      if (placeHolderContent.substring(0, 2) === '%%') {
        return {
          type: 'placeholder',
          value: placeHolderContent.substring(2),
          module: MODULE_NAME,
          centered: true,
        };
      }
      if (placeHolderContent.substring(0, 1) === '%') {
        return {
          type: 'placeholder',
          value: placeHolderContent.substring(1),
          module: MODULE_NAME,
          centered: false,
        };
      }
      return null;
    },

    postparse(parsed: any) {
      // Expand the tag so docxtemplater knows what XML scope to replace
      // Non-centered → replace the <w:t> node
      // Centered     → replace the whole <w:p> paragraph
      if (DocUtils?.traits?.expandToOne) {
        return DocUtils.traits.expandToOne(parsed, {
          moduleName: MODULE_NAME,
          getInner: ({ part }: any) => part,
          expandTo: 'w:t', // always expand to <w:t>; we handle centering in the XML
        });
      }
      return parsed;
    },

    render(part: any, options: any) {
      if (part.type !== 'placeholder' || part.module !== MODULE_NAME) {
        return null;
      }

      const tagName: string = part.value; // e.g. "cccd_truoc"
      const imgData = images[tagName];

      if (!imgData) {
        // No image data for this key → output nothing (removes the placeholder)
        return { value: '' };
      }

      try {
        const rId = addImageToZip(imgData, options.filePath);
        const xml = buildImageXml(rId, defaultSize);
        console.log(`[ImageModule] Inserted image for "{%${tagName}}" (rId${rId})`);
        return { value: xml };
      } catch (err) {
        console.error(`[ImageModule] Failed to insert image for "{%${tagName}}":`, err);
        return { value: '' };
      }
    },
  };
}

// ============================================================
// Public helpers
// ============================================================

/** Extract placeholder keys from a .docx template file */
export const extractKeysFromDocx = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (!content) throw new Error('File content empty');

        const zip = new PizZip(content as ArrayBuffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        const text = doc.getFullText();
        const matches = text.match(/\{{1,2}([a-zA-Z0-9_%]+)\}{1,2}/g);
        if (!matches) {
          resolve([]);
          return;
        }

        const uniqueKeys: string[] = Array.from(
          new Set(matches.map((m) => m.replace(/[{}]/g, ''))),
        );
        resolve(uniqueKeys);
      } catch (error) {
        console.error('Error parsing docx:', error);
        resolve([]);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// ============================================================
// Main generator
// ============================================================

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

        // Build docxtemplater options
        const options: any = {
          paragraphLoop: true,
          linebreaks: true,
          nullGetter: () => '', // Missing tags → blank
        };

        // Attach image module when we have images to insert
        if (images) {
          const hasAnyImage = Object.values(images).some((v) => v !== null && v !== undefined);
          if (hasAnyImage) {
            console.log('[generateDocument] Images found, attaching custom image module');
            const imageModule = createImageModule({
              images,
              defaultSize: [450, 300], // ~12cm × 8cm — fits nicely inside A4
            });
            options.modules = [imageModule];
          }
        }

        const doc = new Docxtemplater(zip, options);

        // Render text data (image tags are handled by the image module above)
        doc.render(data);

        const blob = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        saveAs(blob, fileName);
        console.log(`[generateDocument] Saved: ${fileName}`);
        resolve();
      } catch (error) {
        console.error('Error generating document:', error);
        reject(error);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
