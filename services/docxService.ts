import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, ImageRun, PageBreak, HeadingLevel } from 'docx';
import { SavedProfile } from '../types';

// Access DocUtils from docxtemplater for module compatibility
const DocUtils = (Docxtemplater as any).DocUtils;

// ============================================================
// Custom Image Module — compatible with docxtemplater 3.67.5
// ============================================================
// The old CDN "docxtemplater-image-module-free@1.1.1" relied on
// `fileTypeConfig.tagTextXml` which was REMOVED in recent versions
// of docxtemplater, AND it added rels files to xmlFileNames causing
// docxtemplater to overwrite relationship entries during serialization.
//
// This module is fully self-contained and uses only stable APIs.
//
// KEY DESIGN DECISIONS:
// 1. We do NOT add rels files to xmlFileNames — this prevents
//    docxtemplater from overwriting our relationship entries.
//    We modify rels directly via zip.file() which is safe because
//    docxtemplater doesn't track rels by default.
// 2. [Content_Types].xml IS tracked by docxtemplater by default,
//    so we modify it through xmlDocuments DOM manipulation.
// 3. Image binaries are added directly to the zip (they're never
//    tracked by docxtemplater as XML documents).
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
  let xmlDocuments: Record<string, any> = {};

  // ---- helpers ----

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
    if (
      arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
      arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50
    ) {
      return { ext: 'webp', mime: 'image/webp' };
    }
    // Default to png
    return { ext: 'png', mime: 'image/png' };
  }

  /**
   * Read actual image dimensions (width × height) from binary data.
   * Supports PNG, JPEG, GIF, and WEBP.
   * Returns null if dimensions cannot be determined.
   */
  function getImageDimensions(buffer: ArrayBuffer): { w: number; h: number } | null {
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);

    // --- PNG: width & height at bytes 16-23 in IHDR ---
    if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) {
      if (buffer.byteLength >= 24) {
        return { w: view.getUint32(16), h: view.getUint32(20) };
      }
    }

    // --- JPEG: scan for SOF0/SOF2 markers (0xFFC0 / 0xFFC2) ---
    if (u8[0] === 0xff && u8[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.byteLength - 10) {
        if (u8[offset] !== 0xff) { offset++; continue; }
        const marker = u8[offset + 1];
        // SOF0 (0xC0) or SOF2 (0xC2) — baseline / progressive
        if (marker === 0xc0 || marker === 0xc2) {
          const h = view.getUint16(offset + 5);
          const w = view.getUint16(offset + 7);
          return { w, h };
        }
        // Skip to next marker
        if (marker === 0xd9) break; // EOI
        const segLen = view.getUint16(offset + 2);
        offset += 2 + segLen;
      }
    }

    // --- GIF: width & height at bytes 6-9 (little-endian) ---
    if (u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46) {
      if (buffer.byteLength >= 10) {
        return { w: view.getUint16(6, true), h: view.getUint16(8, true) };
      }
    }

    // --- WEBP ---
    if (u8[0] === 0x52 && u8[1] === 0x49 && u8[8] === 0x57 && u8[9] === 0x45) {
      // VP8 (lossy): width/height at offset 26-29
      if (u8[12] === 0x56 && u8[13] === 0x50 && u8[14] === 0x38 && u8[15] === 0x20) {
        if (buffer.byteLength >= 30) {
          return {
            w: view.getUint16(26, true) & 0x3fff,
            h: view.getUint16(28, true) & 0x3fff,
          };
        }
      }
      // VP8L (lossless): bits 21-34 contain w-1, bits 35-48 contain h-1
      if (u8[12] === 0x56 && u8[13] === 0x50 && u8[14] === 0x38 && u8[15] === 0x4c) {
        if (buffer.byteLength >= 25) {
          const bits = view.getUint32(21, true);
          return {
            w: (bits & 0x3fff) + 1,
            h: ((bits >> 14) & 0x3fff) + 1,
          };
        }
      }
    }

    return null;
  }

  /**
   * Calculate display size that fits within maxWidth while preserving aspect ratio.
   * Returns [width, height] in pixels.
   */
  function calculateFitSize(
    imgData: ArrayBuffer,
    maxWidth: number,
  ): [number, number] {
    const dims = getImageDimensions(imgData);
    if (!dims || dims.w <= 0 || dims.h <= 0) {
      // Fallback: use default size if we can't read dimensions
      return defaultSize;
    }

    const { w, h } = dims;
    const aspectRatio = w / h;

    let displayW: number;
    let displayH: number;

    if (w > maxWidth) {
      // Scale down to fit maxWidth
      displayW = maxWidth;
      displayH = Math.round(maxWidth / aspectRatio);
    } else {
      // Image is smaller than maxWidth, use actual size
      displayW = w;
      displayH = h;
    }

    console.log(`[ImageModule] Dimensions: ${w}×${h} → display: ${displayW}×${displayH}`);
    return [displayW, displayH];
  }

  /**
   * Add image file to the zip and create a relationship entry.
   * Returns the numeric rId for embedding in the document XML.
   */
  function addImageToZip(imageData: ArrayBuffer, filePath: string): number {
    const imgType = detectImageType(imageData);
    const imageName = `image_generated_${imageNumber++}.${imgType.ext}`;
    const prefix = fileType === 'docx' ? 'word' : 'ppt';
    const imagePath = `${prefix}/media/${imageName}`;

    // ---- 1. Write image binary to zip ----
    zip.file(imagePath, imageData, { binary: true });

    // ---- 2. Add relationship via direct zip.file() (NOT xmlDocuments) ----
    // Rels files are NOT tracked by docxtemplater, so zip.file() is safe.
    const xmlBaseName = filePath.replace(/^.*?([a-zA-Z0-9]+)\.xml$/, '$1');
    const relsFilePath = `${prefix}/_rels/${xmlBaseName}.xml.rels`;

    let relsContent: string;
    const relsFile = zip.file(relsFilePath);
    if (relsFile) {
      relsContent = relsFile.asText();
    } else {
      // Create a new rels file if it doesn't exist
      relsContent =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '</Relationships>';
    }

    // Find max existing rId
    const ridMatches = [...relsContent.matchAll(/Id="rId(\d+)"/g)];
    let maxRid = 0;
    ridMatches.forEach((m) => {
      maxRid = Math.max(maxRid, parseInt(m[1], 10));
    });
    const newRid = maxRid + 1;

    // Insert the new Relationship element
    const newRel =
      `<Relationship Id="rId${newRid}" ` +
      `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" ` +
      `Target="media/${imageName}"/>`;
    relsContent = relsContent.replace('</Relationships>', newRel + '</Relationships>');
    // Also handle self-closing <Relationships/> tag
    relsContent = relsContent.replace(/<Relationships([^>]*)\/>/,
      `<Relationships$1>${newRel}</Relationships>`);
    zip.file(relsFilePath, relsContent);

    // ---- 3. Update [Content_Types].xml via xmlDocuments DOM ----
    // [Content_Types].xml IS tracked by docxtemplater (in xmlFileNames by default),
    // so we must modify the DOM object, not the zip file.
    const ctDoc = xmlDocuments['[Content_Types].xml'];
    if (ctDoc) {
      const defaults = ctDoc.getElementsByTagName('Default');
      let found = false;
      for (let i = 0; i < defaults.length; i++) {
        if (defaults[i].getAttribute('Extension') === imgType.ext) {
          found = true;
          break;
        }
      }
      if (!found) {
        const types = ctDoc.getElementsByTagName('Types')[0];
        if (types) {
          const newDefault = ctDoc.createElement('Default');
          newDefault.setAttribute('Extension', imgType.ext);
          newDefault.setAttribute('ContentType', imgType.mime);
          types.appendChild(newDefault);
          console.log(`[ImageModule] Added content type for .${imgType.ext}`);
        }
      }
    } else {
      // Fallback: modify zip directly (in case xmlDocuments doesn't have it)
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
    }

    console.log(`[ImageModule] Added image: ${imagePath}, rId${newRid} in ${relsFilePath}`);
    return newRid;
  }

  /** Build the Office Open XML for an inline image */
  function buildImageXml(rId: number, size: [number, number]): string {
    const cx = Math.round(size[0] * 9525); // pixels → EMU
    const cy = Math.round(size[1] * 9525);
    const id = rId; // use rId as unique docPr id

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

      // IMPORTANT: Do NOT add rels files to xmlFileNames!
      // If we do, docxtemplater will parse them into xmlDocuments and
      // overwrite our zip.file() changes during serialization.
      // Rels files are not tracked by default, which is what we want.

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
      // Expand the tag so docxtemplater knows what XML scope to replace.
      // We always expand to <w:t> — the image XML will replace the <w:t> node,
      // becoming a sibling inside the <w:r> run (which is valid Word XML).
      if (DocUtils?.traits?.expandToOne) {
        return DocUtils.traits.expandToOne(parsed, {
          moduleName: MODULE_NAME,
          getInner: ({ part }: any) => part,
          expandTo: 'w:t',
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
        // Calculate size preserving aspect ratio, fitting within maxWidth
        const fitSize = calculateFitSize(imgData, defaultSize[0]);
        const xml = buildImageXml(rId, fitSize);
        console.log(`[ImageModule] Rendered image for "{%${tagName}}" → rId${rId}`);
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
            Object.keys(images).forEach((k) => {
              console.log(`  - ${k}: ${images[k] ? `${images[k]!.byteLength} bytes` : 'null'}`);
            });
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

// ============================================================
// Image Document Generator (DOCX with CCCD & VNeID images)
// ============================================================

export const generateImageDocx = async (profiles: SavedProfile[], soBienBan: string): Promise<void> => {
  const sections = [];

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const children: any[] = [
      new Paragraph({
        text: `${i + 1}. ${p.data['ho_ten'] || p.name}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
    ];

    const imageUrls = [
      p.id_card_front_url,
      p.id_card_back_url,
      p.id_card_portrait_url,
      p.vneid_2_photo_1_url,
      p.vneid_2_photo_2_url,
    ].filter(Boolean) as string[];

    for (const url of imageUrls) {
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const arrayBuffer = await blob.arrayBuffer();

        // Get original dimensions to maintain aspect ratio
        const imgDimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.width, height: img.height });
          };
          img.onerror = () => {
            resolve({ width: 500, height: 350 }); // Fallback
          };
          img.src = URL.createObjectURL(blob);
        });

        const maxWidth = 550; // Max width in pixels for DOCX
        let finalWidth = imgDimensions.width;
        let finalHeight = imgDimensions.height;

        if (finalWidth > maxWidth) {
          const ratio = maxWidth / finalWidth;
          finalWidth = maxWidth;
          finalHeight = finalHeight * ratio;
        }

        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: new Uint8Array(arrayBuffer),
                transformation: {
                  width: finalWidth,
                  height: finalHeight,
                },
              } as any),
            ],
            spacing: { after: 200 },
          })
        );
      } catch (err) {
        console.warn(`Failed to fetch image: ${url}`, err);
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Lỗi tải ảnh: ${url}]`,
                color: 'FF0000',
              }),
            ],
          })
        );
      }
    }

    // Add page break except for the last person
    if (i < profiles.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    sections.push({
      children,
    });
  }

  const doc = new Document({
    sections,
  });

  const buffer = await Packer.toBlob(doc);
  const fileName = `Anh_CCCD_VNeID_${soBienBan.replace(/[/\\?%*:|"<>]/g, '_')}.docx`;
  saveAs(buffer, fileName);
};

