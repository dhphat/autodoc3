import Papa from 'papaparse';

export interface BankData {
  bankName: string;
  branchName: string;
}

export const loadBankData = async (): Promise<BankData[]> => {
  try {
    const response = await fetch('/danh_sach_ngan_hang.csv');
    const csvText = await response.text();
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data.map((row: any) => {
            // Handle possibility of BOM in keys
            const bankKey = Object.keys(row).find(k => k.includes('Tên ngân hàng')) || 'Tên ngân hàng';
            const branchKey = Object.keys(row).find(k => k.includes('Tên chi nhánh')) || 'Tên chi nhánh';
            
            return {
              bankName: (row[bankKey] || '').trim(),
              branchName: (row[branchKey] || '').trim(),
            };
          }).filter((item: any) => item.bankName && item.branchName);
          resolve(data);
        }
      });
    });
  } catch (error) {
    console.error('Failed to load bank data from CSV:', error);
    return [];
  }
};

export const getUniqueBanks = (data: BankData[]): string[] => {
  return Array.from(new Set(data.map(item => item.bankName))).sort();
};

export const getBranchesByBank = (data: BankData[], bankName: string): string[] => {
  return data
    .filter(item => item.bankName === bankName)
    .map(item => item.branchName)
    .sort();
};
