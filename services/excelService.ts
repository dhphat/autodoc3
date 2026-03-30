import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { AcceptanceReportData } from '../types';

const FONT_NAME = 'Times New Roman';

// Format number with dot separators (VD: 1.000.000)
const formatMoney = (num: number): string => {
  if (!num || num === 0) return '';
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Display dash for zero/empty tax values
const formatMoneyOrDash = (num: number): string => {
  if (!num || num === 0) return '-';
  return formatMoney(num);
};

export const generateAcceptanceExcel = async (data: AcceptanceReportData): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Biên bản nghiệm thu', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3, right: 0.3, top: 0.4, bottom: 0.4,
        header: 0.2, footer: 0.2,
      },
    },
  });

  // ===================== Column Widths =====================
  ws.columns = [
    { width: 5 },   // A - STT
    { width: 18 },  // B - Họ và tên
    { width: 16 },  // C - Số CMND
    { width: 13 },  // D - Mã CBNV/HSSV
    { width: 16 },  // E - Mã số thuế
    { width: 16 },  // F - Số tiền chi trả trước thuế
    { width: 16 },  // G - Thuế TNCN tạm khấu trừ
    { width: 16 },  // H - Số tiền thực chi trả
    { width: 36 },  // I - Nội dung công việc đã làm
    { width: 13 },  // J - Kết quả công việc
    { width: 12 },  // K - Ký xác nhận
  ];

  // Helper for borders
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  const noBorder: Partial<ExcelJS.Borders> = {
    top: { style: undefined },
    left: { style: undefined },
    bottom: { style: undefined },
    right: { style: undefined },
  };

  // ===================== Row 1: Header =====================
  const row1 = ws.getRow(1);
  row1.height = 20;

  // Left: TRƯỜNG ĐẠI HỌC FPT
  ws.mergeCells('A1:D1');
  const cellA1 = ws.getCell('A1');
  cellA1.value = 'TRƯỜNG ĐẠI HỌC FPT';
  cellA1.font = { name: FONT_NAME, size: 11, bold: true };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Right: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
  ws.mergeCells('F1:K1');
  const cellF1 = ws.getCell('F1');
  cellF1.value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  cellF1.font = { name: FONT_NAME, size: 11, bold: true };
  cellF1.alignment = { horizontal: 'center', vertical: 'middle' };

  // ===================== Row 2: Sub-header =====================
  const row2 = ws.getRow(2);
  row2.height = 18;

  ws.mergeCells('A2:D2');
  const cellA2 = ws.getCell('A2');
  cellA2.value = 'Ban Công tác học đường';
  cellA2.font = { name: FONT_NAME, size: 11, bold: true };
  cellA2.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('F2:K2');
  const cellF2 = ws.getCell('F2');
  cellF2.value = 'Độc lập - Tự do - Hạnh phúc';
  cellF2.font = { name: FONT_NAME, size: 11, bold: true, underline: true };
  cellF2.alignment = { horizontal: 'center', vertical: 'middle' };

  // ===================== Row 3: Empty =====================
  ws.getRow(3).height = 10;

  // ===================== Row 4: Title =====================
  const row4 = ws.getRow(4);
  row4.height = 22;
  ws.mergeCells('A4:K4');
  const cellA4 = ws.getCell('A4');
  cellA4.value = `BIÊN BẢN NGHIỆM THU CÔNG VIỆC HOÀN THÀNH ${data.ten_bien_ban}`;
  cellA4.font = { name: FONT_NAME, size: 12, bold: true };
  cellA4.alignment = { horizontal: 'center', vertical: 'middle' };

  // ===================== Row 5: Số biên bản =====================
  const row5 = ws.getRow(5);
  row5.height = 18;
  ws.mergeCells('A5:K5');
  const cellA5 = ws.getCell('A5');

  // Create rich text for "Số: " (normal) + actual number (bold)
  cellA5.value = {
    richText: [
      { text: 'Số: ', font: { name: FONT_NAME, size: 11 } },
      { text: data.so_bien_ban, font: { name: FONT_NAME, size: 11, bold: true } },
    ],
  };
  cellA5.alignment = { horizontal: 'center', vertical: 'middle' };

  // ===================== Row 6: Empty spacer =====================
  ws.getRow(6).height = 6;

  // ===================== Row 7: Table Header =====================
  const headerRow = 7;
  const row7 = ws.getRow(headerRow);
  row7.height = 45;

  const headers = [
    'STT', 'Họ và tên', 'Số CMND', 'Mã CBNV/\nHSSV', 'Mã số thuế',
    'Số tiền chi trả\ntrước thuế', 'Thuế TNCN\ntạm khấu trừ', 'Số tiền thực\nchi trả',
    'Nội dung công việc đã làm', 'Kết quả công\nviệc', 'Ký xác nhận',
  ];

  headers.forEach((text, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = text;
    cell.font = { name: FONT_NAME, size: 10, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
    cell.fill = { type: 'pattern', pattern: 'none' };
  });

  // ===================== Data Rows =====================
  const dataStartRow = 8;
  data.entries.forEach((entry, idx) => {
    const rowIndex = dataStartRow + idx;
    const row = ws.getRow(rowIndex);
    row.height = 65; // Tall enough for multi-line content

    const values = [
      idx + 1,                                    // STT
      entry.ho_ten,                               // Họ và tên
      entry.cccd,                                 // Số CMND
      entry.ma_cbnv,                              // Mã CBNV/HSSV
      entry.mst,                                  // Mã số thuế
      formatMoney(entry.so_tien_truoc_thue),      // Số tiền trước thuế
      formatMoneyOrDash(entry.thue_tncn),         // Thuế TNCN
      formatMoney(entry.so_tien_thuc_chi),        // Số tiền thực chi
      entry.noi_dung_cong_viec,                   // Nội dung
      entry.ket_qua || 'Hoàn thành',             // Kết quả
      '',                                         // Ký xác nhận (trống)
    ];

    values.forEach((val, i) => {
      const cell = ws.getCell(rowIndex, i + 1);
      cell.value = val;
      cell.font = { name: FONT_NAME, size: 10 };
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', wrapText: true };

      // Specific alignments
      if (i === 0) cell.alignment = { horizontal: 'center', vertical: 'middle' }; // STT
      if (i >= 5 && i <= 7) cell.alignment = { horizontal: 'right', vertical: 'middle' }; // Money
      if (i === 9 || i === 10) cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; // Kết quả, Ký
    });
  });

  // ===================== Tổng cộng Row =====================
  const totalRowIndex = dataStartRow + data.entries.length;
  const totalRow = ws.getRow(totalRowIndex);
  totalRow.height = 22;

  // Merge A-E for "Tổng cộng"
  ws.mergeCells(totalRowIndex, 1, totalRowIndex, 5);
  const totalLabelCell = ws.getCell(totalRowIndex, 1);
  totalLabelCell.value = 'Tổng cộng';
  totalLabelCell.font = { name: FONT_NAME, size: 10, bold: true };
  totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
  totalLabelCell.border = thinBorder;

  // Apply border to merged cells
  for (let c = 2; c <= 5; c++) {
    ws.getCell(totalRowIndex, c).border = thinBorder;
  }

  // Calculate totals
  const totalTruocThue = data.entries.reduce((sum, e) => sum + (e.so_tien_truoc_thue || 0), 0);
  const totalThue = data.entries.reduce((sum, e) => sum + (e.thue_tncn || 0), 0);
  const totalThucChi = data.entries.reduce((sum, e) => sum + (e.so_tien_thuc_chi || 0), 0);

  // F - Tổng trước thuế
  const totalF = ws.getCell(totalRowIndex, 6);
  totalF.value = formatMoney(totalTruocThue);
  totalF.font = { name: FONT_NAME, size: 10, bold: true };
  totalF.alignment = { horizontal: 'right', vertical: 'middle' };
  totalF.border = thinBorder;

  // G - Tổng thuế
  const totalG = ws.getCell(totalRowIndex, 7);
  totalG.value = formatMoneyOrDash(totalThue);
  totalG.font = { name: FONT_NAME, size: 10, bold: true };
  totalG.alignment = { horizontal: 'right', vertical: 'middle' };
  totalG.border = thinBorder;

  // H - Tổng thực chi
  const totalH = ws.getCell(totalRowIndex, 8);
  totalH.value = formatMoney(totalThucChi);
  totalH.font = { name: FONT_NAME, size: 10, bold: true };
  totalH.alignment = { horizontal: 'right', vertical: 'middle' };
  totalH.border = thinBorder;

  // I, J, K - Empty with borders
  for (let c = 9; c <= 11; c++) {
    const cell = ws.getCell(totalRowIndex, c);
    cell.value = '';
    cell.border = thinBorder;
  }

  // ===================== Footer: Người lập & Người phê duyệt =====================
  const footerStartRow = totalRowIndex + 2;

  // Row with titles
  const titleFooterRow = ws.getRow(footerStartRow);
  titleFooterRow.height = 22;

  ws.mergeCells(footerStartRow, 1, footerStartRow, 4);
  const nguoiLapTitle = ws.getCell(footerStartRow, 1);
  nguoiLapTitle.value = 'NGƯỜI LẬP';
  nguoiLapTitle.font = { name: FONT_NAME, size: 11, bold: true };
  nguoiLapTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(footerStartRow, 7, footerStartRow, 11);
  const nguoiDuyetTitle = ws.getCell(footerStartRow, 7);
  nguoiDuyetTitle.value = 'NGƯỜI PHÊ DUYỆT';
  nguoiDuyetTitle.font = { name: FONT_NAME, size: 11, bold: true };
  nguoiDuyetTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  // Empty rows for signature space
  for (let i = 1; i <= 3; i++) {
    ws.getRow(footerStartRow + i).height = 18;
  }

  // Row with names
  const nameFooterRow = footerStartRow + 4;
  const nameRow = ws.getRow(nameFooterRow);
  nameRow.height = 20;

  ws.mergeCells(nameFooterRow, 1, nameFooterRow, 4);
  const nguoiLapName = ws.getCell(nameFooterRow, 1);
  nguoiLapName.value = data.nguoi_lap;
  nguoiLapName.font = { name: FONT_NAME, size: 11, bold: true };
  nguoiLapName.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(nameFooterRow, 7, nameFooterRow, 11);
  const nguoiDuyetName = ws.getCell(nameFooterRow, 7);
  nguoiDuyetName.value = data.nguoi_phe_duyet;
  nguoiDuyetName.font = { name: FONT_NAME, size: 11, bold: true };
  nguoiDuyetName.alignment = { horizontal: 'center', vertical: 'middle' };

  // ===================== Generate & Download =====================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const fileName = `BBNT_${data.so_bien_ban.replace(/[/\\?%*:|"<>]/g, '_')}.xlsx`;
  saveAs(blob, fileName);
};
