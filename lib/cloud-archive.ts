// Production için Cloud Storage Arşiv Sistemi
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Cloud Storage Interface (AWS S3, Google Cloud, vs. için)
interface CloudStorageProvider {
  uploadFile(buffer: Buffer, fileName: string, folder?: string): Promise<string>;
  getFileUrl(fileName: string, folder?: string): Promise<string>;
  deleteFile(fileName: string, folder?: string): Promise<boolean>;
}

export class ProductionArchiver {
  private cloudStorage: CloudStorageProvider;

  constructor(cloudStorage: CloudStorageProvider) {
    this.cloudStorage = cloudStorage;
  }

  /**
   * Production ortamında grup arşivi oluştur
   */
  async createGroupArchive(groupData: any): Promise<{
    success: boolean;
    archiveUrl?: string;
    downloadLinks?: string[];
    error?: string;
  }> {
    try {
      const archiveFolder = this.generateArchiveFolderName(groupData.group);
      const files: { name: string; buffer: Buffer }[] = [];

      // 1. Excel dosyası oluştur
      const excelBuffer = await this.createExcelFile(groupData);
      files.push({
        name: 'GRUP_VE_KATILIMCI_BİLGİLERİ.xlsx',
        buffer: excelBuffer
      });

      // 2. JSON meta dosyası oluştur
      const metaData = this.createArchiveMetadata(groupData);
      const jsonBuffer = Buffer.from(JSON.stringify(metaData, null, 2), 'utf8');
      files.push({
        name: 'arşiv_bilgisi.json',
        buffer: jsonBuffer
      });

      // 3. Dosyaları cloud storage'a yükle
      const uploadPromises = files.map(file => 
        this.cloudStorage.uploadFile(file.buffer, file.name, archiveFolder)
      );

      const uploadResults = await Promise.all(uploadPromises);
      
      // 4. Başarılı upload URL'lerini döndür
      return {
        success: true,
        archiveUrl: archiveFolder,
        downloadLinks: uploadResults
      };

    } catch (error) {
      console.error('Production archive error:', error);
      return {
        success: false,
        error: 'Arşiv oluşturulurken hata oluştu'
      };
    }
  }

  /**
   * Excel dosyası oluştur (memory'de)
   */
  private async createExcelFile(groupData: any): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Grup bilgileri sayfası
    const groupInfo = [
      ['Grup Adı', groupData.group.name],
      ['Türü', groupData.group.type],
      ['Başlangıç Tarihi', format(new Date(groupData.group.start_date), 'dd/MM/yyyy', { locale: tr })],
      ['Bitiş Tarihi', groupData.group.end_date ? format(new Date(groupData.group.end_date), 'dd/MM/yyyy', { locale: tr }) : ''],
      ['Rehber', groupData.group.guide_name || ''],
      ['Rehber Telefon', groupData.group.guide_phone || ''],
      ['Katılımcı Sayısı', groupData.participants.length],
      ['Arşivlenme Tarihi', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: tr })]
    ];

    const groupSheet = XLSX.utils.aoa_to_sheet(groupInfo);
    XLSX.utils.book_append_sheet(workbook, groupSheet, 'Grup Bilgileri');

    // Katılımcılar sayfası
    if (groupData.participants && groupData.participants.length > 0) {
      const participantsData = groupData.participants.map((p: any, index: number) => ({
        'Sıra No': index + 1,
        'Ad Soyad': p.full_name || '',
        'Telefon': p.phone || '',
        'E-posta': p.email || '',
        'TC No': p.tc_no || '',
        'Doğum Tarihi': p.birth_date ? format(new Date(p.birth_date), 'dd/MM/yyyy', { locale: tr }) : '',
        'Cinsiyet': p.gender || '',
        'Pasaport No': p.passport_no || '',
        'Acil Durum Kişisi': p.emergency_contact || '',
        'Acil Durum Telefonu': p.emergency_phone || '',
        'Oda Tercihi': p.room_preference || '',
        'Kayıt Tarihi': p.created_at ? format(new Date(p.created_at), 'dd/MM/yyyy', { locale: tr }) : ''
      }));

      const participantsSheet = XLSX.utils.json_to_sheet(participantsData);
      XLSX.utils.book_append_sheet(workbook, participantsSheet, 'Katılımcılar');
    }

    // Buffer olarak döndür
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }

  /**
   * Arşiv meta verileri oluştur
   */
  private createArchiveMetadata(groupData: any) {
    return {
      created_at: new Date().toISOString(),
      group_name: groupData.group.name,
      group_type: groupData.group.type,
      participants_count: groupData.participants?.length || 0,
      start_date: groupData.group.start_date,
      end_date: groupData.group.end_date,
      archived_by: 'System',
      files: [
        'GRUP_VE_KATILIMCI_BİLGİLERİ.xlsx',
        'arşiv_bilgisi.json'
      ],
      cloud_storage: true,
      production_archive: true
    };
  }

  /**
   * Arşiv klasör adı oluştur
   */
  private generateArchiveFolderName(group: any): string {
    const year = new Date(group.start_date).getFullYear();
    const cleanName = group.name
      .replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9\s]/g, '')
      .replace(/\s+/g, '-');
    
    return `archives/${year}/${cleanName}`;
  }
}

// AWS S3 Implementation Example
export class S3StorageProvider implements CloudStorageProvider {
  private bucketName: string;
  
  constructor(bucketName: string) {
    this.bucketName = bucketName;
  }

  async uploadFile(buffer: Buffer, fileName: string, folder?: string): Promise<string> {
    // AWS S3 SDK kullanarak dosya yükle
    const key = folder ? `${folder}/${fileName}` : fileName;
    
    // S3 upload implementation
    // const result = await s3.upload({
    //   Bucket: this.bucketName,
    //   Key: key,
    //   Body: buffer
    // }).promise();
    
    // return result.Location;
    
    // Mock implementation
    return `https://s3.amazonaws.com/${this.bucketName}/${key}`;
  }

  async getFileUrl(fileName: string, folder?: string): Promise<string> {
    const key = folder ? `${folder}/${fileName}` : fileName;
    return `https://s3.amazonaws.com/${this.bucketName}/${key}`;
  }

  async deleteFile(fileName: string, folder?: string): Promise<boolean> {
    // S3 delete implementation
    return true;
  }
}

// Email ile gönderim alternatifi
export class EmailArchiver {
  async sendArchiveByEmail(groupData: any, recipientEmail: string): Promise<boolean> {
    try {
      const archiver = new ProductionArchiver(new S3StorageProvider('temp-bucket'));
      const excelBuffer = await archiver['createExcelFile'](groupData);
      
      // Email service (NodeMailer, SendGrid, vs.)
      // await emailService.send({
      //   to: recipientEmail,
      //   subject: `${groupData.group.name} - Grup Arşivi`,
      //   text: 'Grup arşivi ekte yer almaktadır.',
      //   attachments: [{
      //     filename: 'GRUP_VE_KATILIMCI_BİLGİLERİ.xlsx',
      //     content: excelBuffer
      //   }]
      // });

      return true;
    } catch (error) {
      console.error('Email archive error:', error);
      return false;
    }
  }
}