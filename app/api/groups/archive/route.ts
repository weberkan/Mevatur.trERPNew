import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
});

// JWT token'dan kullanıcı bilgisini al
async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const client = await pool.connect();
    const result = await client.query(
      'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
      [decoded.userId]
    );
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    return null;
  }
}

// POST - Grubu arşivle
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId, notes } = await request.json();

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID gerekli' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Grup bilgilerini al
      const groupResult = await client.query(
        'SELECT * FROM groups WHERE id = $1',
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        client.release();
        return NextResponse.json(
          { error: 'Grup bulunamadı' },
          { status: 404 }
        );
      }

      const group = groupResult.rows[0];

      // Grup zaten arşivlendi mi kontrol et
      if (group.status === 'archived') {
        client.release();
        return NextResponse.json(
          { error: 'Grup zaten arşivlendi' },
          { status: 400 }
        );
      }

      // Katılımcıları al
      const participantsResult = await client.query(
        'SELECT * FROM participants WHERE group_id = $1 ORDER BY full_name',
        [groupId]
      );

      // Arşiv klasörü oluştur
      const archivePath = await createArchiveFolder(group, participantsResult.rows);

      // Grup durumunu güncelle
      await client.query(
        `UPDATE groups 
         SET status = 'archived', 
             archived_at = CURRENT_TIMESTAMP,
             archive_path = $1
         WHERE id = $2`,
        [archivePath, groupId]
      );

      client.release();

      return NextResponse.json({
        success: true,
        message: 'Grup başarıyla arşivlendi',
        archivePath: archivePath,
        archivedGroup: {
          id: group.id,
          name: group.name,
          archivePath: archivePath
        }
      });

    } catch (dbError) {
      client.release();
      throw dbError;
    }

  } catch (error) {
    console.error('Group archiving error:', error);
    return NextResponse.json(
      { error: 'Grup arşivlenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Arşiv klasörü oluştur ve dosyaları export et
async function createArchiveFolder(group: any, participants: any[]): Promise<string> {
  const year = new Date(group.start_date).getFullYear().toString();
  const folderName = `${group.name.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9\s]/g, '').replace(/\s+/g, '-')}`;
  const archivePath = path.join(process.cwd(), 'public', 'archives', year, folderName);
  
  // Klasör yoksa oluştur
  if (!fs.existsSync(archivePath)) {
    fs.mkdirSync(archivePath, { recursive: true });
  }
  
  // Belgeler alt klasörlerini oluştur
  const subFolders = ['belgeler', 'belgeler/sözleşmeler', 'belgeler/faturalar', 'belgeler/fotoğraflar'];
  subFolders.forEach(folder => {
    const subFolderPath = path.join(archivePath, folder);
    if (!fs.existsSync(subFolderPath)) {
      fs.mkdirSync(subFolderPath, { recursive: true });
    }
  });

  // Excel dosyası oluştur
  const workbook = XLSX.utils.book_new();
  
  // Grup bilgileri sayfası
  const groupData = [
    ['Grup Adı', group.name],
    ['Türü', group.type],
    ['Başlangıç Tarihi', new Date(group.start_date).toLocaleDateString('tr-TR')],
    ['Bitiş Tarihi', group.end_date ? new Date(group.end_date).toLocaleDateString('tr-TR') : ''],
    ['Kapasite', group.capacity || 0],
    ['Para Birimi', group.currency || 'TRY'],
    ['Notlar', group.notes || ''],
    ['Rehber', group.guide_name || ''],
    ['Rehber Telefon', group.guide_phone || ''],
    ['Arşivlenme Tarihi', new Date().toLocaleDateString('tr-TR')]
  ];
  
  const groupSheet = XLSX.utils.aoa_to_sheet(groupData);
  XLSX.utils.book_append_sheet(workbook, groupSheet, 'Grup Bilgileri');

  // Katılımcılar sayfası
  if (participants.length > 0) {
    const participantsData = participants.map((p, index) => ({
      'Sıra No': index + 1,
      'Ad Soyad': p.full_name || '',
      'Telefon': p.phone || '',
      'E-posta': p.email || '',
      'TC No': p.tc_no || '',
      'Doğum Tarihi': p.birth_date ? new Date(p.birth_date).toLocaleDateString('tr-TR') : '',
      'Cinsiyet': p.gender || '',
      'Pasaport No': p.passport_no || '',
      'Acil Durum Kişisi': p.emergency_contact || '',
      'Acil Durum Telefonu': p.emergency_phone || '',
      'Oda Tercihi': p.room_preference || '',
      'Kayıt Tarihi': p.created_at ? new Date(p.created_at).toLocaleDateString('tr-TR') : ''
    }));

    const participantsSheet = XLSX.utils.json_to_sheet(participantsData);
    XLSX.utils.book_append_sheet(workbook, participantsSheet, 'Katılımcılar');
  }

  // Excel dosyasını kaydet
  XLSX.writeFile(workbook, path.join(archivePath, 'GRUP_VE_KATILIMCI_BİLGİLERİ.xlsx'));
  
  // Arşiv bilgi dosyası oluştur
  const archiveInfo = {
    created_at: new Date().toISOString(),
    group_name: group.name,
    group_type: group.type,
    participants_count: participants.length,
    start_date: group.start_date,
    end_date: group.end_date,
    files: [
      'GRUP_VE_KATILIMCI_BİLGİLERİ.xlsx'
    ]
  };
  
  fs.writeFileSync(
    path.join(archivePath, 'arşiv_bilgisi.json'), 
    JSON.stringify(archiveInfo, null, 2), 
    'utf8'
  );

  // Public'dan sonraki relative path'i döndür
  return `/archives/${year}/${folderName}`;
}