
const chuSo = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const tien = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];

function docSo3ChuSo(baso: number) {
    let tram, chuc, donvi;
    let KetQua = '';
    tram = Math.floor(baso / 100);
    chuc = Math.floor((baso % 100) / 10);
    donvi = baso % 10;
    
    if (tram === 0 && chuc === 0 && donvi === 0) return '';
    
    // Hàng trăm
    if (tram !== 0) {
        KetQua += chuSo[tram] + ' trăm';
        // Nếu có hàng trăm mà hàng chục = 0 và hàng đơn vị != 0 thì thêm "linh"
        if (chuc === 0 && donvi !== 0) KetQua += ' linh';
    }
    
    // Hàng chục
    if (chuc !== 0 && chuc !== 1) {
        KetQua += ' ' + chuSo[chuc] + ' mươi';
        if (chuc === 0 && donvi !== 0) KetQua += ' linh';
    }
    if (chuc === 1) KetQua += ' mười';
    
    // Hàng đơn vị
    switch (donvi) {
        case 1:
            if (chuc !== 0 && chuc !== 1) {
                KetQua += ' mốt';
            } else {
                KetQua += ' ' + chuSo[donvi];
            }
            break;
        case 5:
            if (chuc === 0) {
                KetQua += ' ' + chuSo[donvi];
            } else {
                KetQua += ' lăm';
            }
            break;
        default:
            if (donvi !== 0) {
                KetQua += ' ' + chuSo[donvi];
            }
            break;
    }
    return KetQua;
}

export function numberToVietnameseText(so: number | string): string {
    if (!so) return '';
    let strSo = so.toString().replace(/[\.,\s]/g, '');
    let num = parseInt(strSo);
    
    if (isNaN(num)) return '';
    if (num === 0) return 'Không đồng';
    
    let Lan = 0;
    let i = 0;
    let soAm = 0;
    let KetQua = '';
    let ViTri: number[] = [];
    
    if (num < 0) {
        soAm = 1;
        num = Math.abs(num);
    }
    
    if (num > 0) {
        ViTri[5] = Math.floor(num / 1000000000000000);
        if (isNaN(ViTri[5])) ViTri[5] = 0;
        num = num - parseFloat(ViTri[5].toString()) * 1000000000000000;
        
        ViTri[4] = Math.floor(num / 1000000000000);
        if (isNaN(ViTri[4])) ViTri[4] = 0;
        num = num - parseFloat(ViTri[4].toString()) * 1000000000000;
        
        ViTri[3] = Math.floor(num / 1000000000);
        if (isNaN(ViTri[3])) ViTri[3] = 0;
        num = num - parseFloat(ViTri[3].toString()) * 1000000000;
        
        ViTri[2] = Math.floor(num / 1000000);
        if (isNaN(ViTri[2])) ViTri[2] = 0;
        
        ViTri[1] = Math.floor((num % 1000000) / 1000);
        if (isNaN(ViTri[1])) ViTri[1] = 0;
        
        ViTri[0] = num % 1000;
        if (isNaN(ViTri[0])) ViTri[0] = 0;
        
        if (ViTri[5] > 0) Lan = 5;
        else if (ViTri[4] > 0) Lan = 4;
        else if (ViTri[3] > 0) Lan = 3;
        else if (ViTri[2] > 0) Lan = 2;
        else if (ViTri[1] > 0) Lan = 1;
        else Lan = 0;
        
        for (i = Lan; i >= 0; i--) {
            let tmp = docSo3ChuSo(ViTri[i]);
            if (tmp.length > 0) {
                // Change: Append space instead of comma
                if (KetQua.length > 0) KetQua += ' ';
                
                KetQua += tmp;
                if (ViTri[i] > 0) KetQua += tien[i];
            }
        }
        
        // Clean up spaces
        // Regex to replace multiple spaces with single space
        KetQua = KetQua.replace(/\s+/g, ' ').trim();
        
        // Fix Capitalization
        if (KetQua.length > 0) {
            KetQua = KetQua.substring(0, 1).toUpperCase() + KetQua.substring(1);
        }
        
        if (soAm) return 'Âm ' + KetQua + ' đồng';
        return KetQua + ' đồng';
    }
    return '';
}
