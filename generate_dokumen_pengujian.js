/**
 * Script Generator Dokumen Pengujian Black Box (.docx)
 * Jalankan dengan: node generate_dokumen_pengujian.js
 * Install dulu: npm install docx
 */
const {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel,
  ShadingType, convertInchesToTwip
} = require('docx');
const fs = require('fs');

// ========================
// WARNA & STYLE
// ========================
const COLOR_HEADER_BG = "2E4057";  // Biru tua
const COLOR_HEADER_TEXT = "FFFFFF"; // Putih
const COLOR_ROW_ALT = "EBF0F7";    // Biru muda selang-seling
const COLOR_BERHASIL = "1A7431";   // Hijau
const COLOR_GAGAL = "C0392B";      // Merah

// ========================
// HELPER: Buat Sel Tabel
// ========================
function createCell(text, options = {}) {
  const {
    bold = false,
    color = "000000",
    bgColor = null,
    align = AlignmentType.LEFT,
    size = 20,
    colSpan = 1,
  } = options;

  const shading = bgColor
    ? { fill: bgColor, type: ShadingType.CLEAR, color: "auto" }
    : undefined;

  return new TableCell({
    columnSpan: colSpan,
    shading,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold,
            color,
            size,
            font: "Times New Roman",
          }),
        ],
      }),
    ],
  });
}

// ========================
// HELPER: Buat Baris Header Tabel
// ========================
function createHeaderRow(headers) {
  return new TableRow({
    tableHeader: true,
    children: headers.map(h =>
      createCell(h, {
        bold: true,
        color: COLOR_HEADER_TEXT,
        bgColor: COLOR_HEADER_BG,
        align: AlignmentType.CENTER,
        size: 20,
      })
    ),
  });
}

// ========================
// HELPER: Buat Baris Data
// ========================
function createDataRow(cells, rowIndex) {
  const altBg = rowIndex % 2 !== 0 ? COLOR_ROW_ALT : null;
  return new TableRow({
    children: cells.map((cell, i) => {
      const isStatusCol = i === 1 || i === 2 || i === 3;
      const isGagal = cell === "Gagal";
      const isBerhasil = cell === "Berhasil";
      const color = isBerhasil ? COLOR_BERHASIL : isGagal ? COLOR_GAGAL : "000000";
      const bold = isStatusCol;
      const align = isStatusCol ? AlignmentType.CENTER : AlignmentType.LEFT;
      return createCell(cell, { bold, color, bgColor: altBg, align, size: 20 });
    }),
  });
}

// ========================
// HELPER: Buat Tabel Pengujian
// ========================
function createTestTable(rows) {
  const headers = ["Data", "Ekspetasi", "Hasil", "Kesimpulan"];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "2E4057" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E4057" },
      left: { style: BorderStyle.SINGLE, size: 6, color: "2E4057" },
      right: { style: BorderStyle.SINGLE, size: 6, color: "2E4057" },
      insideH: { style: BorderStyle.SINGLE, size: 4, color: "BDC3C7" },
      insideV: { style: BorderStyle.SINGLE, size: 4, color: "BDC3C7" },
    },
    rows: [
      createHeaderRow(headers),
      ...rows.map((r, i) => createDataRow(r, i)),
    ],
  });
}

// ========================
// HELPER: Heading
// ========================
function heading(text) {
  return new Paragraph({
    spacing: { before: 280, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        color: "2E4057",
        font: "Times New Roman",
      }),
    ],
  });
}

// ========================
// HELPER: Judul Tabel
// ========================
function tableTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22,
        font: "Times New Roman",
      }),
    ],
  });
}

// ========================
// HELPER: Paragraf
// ========================
function para(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 120, after: 200 },
    indent: { firstLine: convertInchesToTwip(0.5) },
    children: [
      new TextRun({
        text,
        size: 24,
        font: "Times New Roman",
      }),
    ],
  });
}

// ========================
// HELPER: Spasi / Baris Kosong
// ========================
function spacer() {
  return new Paragraph({ children: [new TextRun({ text: "", size: 22 })] });
}

// ========================
// DATA PENGUJIAN
// ========================
const data = {
  intro: `Pengujian Black Box dilakukan untuk memverifikasi apakah seluruh fitur dan fungsi utama pada sistem Chatbot WhatsApp Berbasis NLP ini telah berjalan sesuai dengan perancangan awal. Metode pengujian ini berfokus pada sisi perilaku dan keluaran (output) sistem tanpa melihat atau mengetahui bagaimana kode sumber program bekerja di dalam (internal logic). Setiap skenario diuji dari sudut pandang pengguna nyata, baik mahasiswa sebagai pengguna chatbot maupun admin program studi sebagai pengelola sistem. Hasil pengujian dikategorikan sebagai "Berhasil" apabila keluaran sistem sesuai ekspektasi, dan "Gagal" apabila sistem dengan tepat menolak atau tidak memproses input yang tidak valid.`,
  tables: [
    {
      title: "Tabel 1. Pengujian Modul Chatbot (NLP & Balasan)",
      desc_before: `Pada modul ini, pengujian dilakukan untuk memastikan kemampuan mesin pemrosesan bahasa alami (Natural Language Processing) dalam mengenali berbagai variasi pesan yang dikirim mahasiswa melalui WhatsApp. Skenario yang diuji mencakup berbagai kondisi, mulai dari pesan yang diketik dengan sempurna, pesan dengan kesalahan pengetikan (typo), pesan yang tidak ada di data latih (di luar konteks), hingga permintaan yang membutuhkan balasan berupa file dokumen atau gambar. Tujuan pengujian modul ini adalah memastikan bot merespons dengan tepat, relevan, dan tidak memberikan jawaban yang menyesatkan.`,
      rows: [
        ['"berapa biaya spp" (Pencocokan Persis / Exact Match)', "Berhasil", "Berhasil", "Berhasil"],
        ['"biya sppp" (Mendeteksi Kesalahan Ketik / Typo)', "Berhasil", "Berhasil", "Berhasil"],
        ['"kasih tahu info uang kuliah" (Prediksi Naive Bayes)', "Berhasil", "Berhasil", "Berhasil"],
        ['"asdfqwerzxcv" (Pesan di luar konteks / tidak dimengerti)', "Gagal", "Gagal", "Berhasil"],
        ['"syarat kkd" (Permintaan pengiriman Dokumen PDF)', "Berhasil", "Berhasil", "Berhasil"],
        ['"kalender akademik" (Permintaan pengiriman Gambar)', "Berhasil", "Berhasil", "Berhasil"],
      ],
      desc_after: `Berdasarkan hasil pengujian pada Tabel 1, algoritma NLP yang terdiri atas tiga lapisan (Exact Match, Jaro-Winkler Similarity, dan Naive Bayes) terbukti bekerja secara efektif dan saling melengkapi. Ketika pesan masuk identik dengan data latih, sistem langsung mencocokkan secara persis dengan tingkat kepercayaan 100%. Ketika ada kesalahan ketik, algoritma Jaro-Winkler berhasil mengidentifikasi kemiripan di atas ambang batas 85%, sehingga bot tetap mampu memberikan jawaban yang benar. Sementara itu, pesan yang sepenuhnya tidak berkaitan dengan topik akademik menghasilkan respons bawaan (fallback) dengan nilai kepercayaan (confidence) 0%, yang menandakan sistem memiliki mekanisme pengamanan dari respons yang tidak relevan. Keberhasilan pengiriman lampiran file PDF dan gambar juga mengkonfirmasi bahwa integrasi fitur media pada bot telah berfungsi dengan sempurna.`,
    },
    {
      title: "Tabel 2. Pengujian Modul Autentikasi Dasbor Admin",
      desc_before: `Modul autentikasi adalah garis pertahanan pertama sistem terhadap akses yang tidak sah. Pengujian ini bertujuan untuk memastikan bahwa hanya pihak yang memiliki kredensial (username dan password) yang benar dan terdaftar saja yang diizinkan masuk ke halaman Dasbor Admin. Selain pengujian login normal, skenario juga mencakup percobaan peretasan sederhana seperti memasukkan kata sandi yang salah ataupun mencoba mengakses halaman data dan API secara langsung tanpa proses login terlebih dahulu.`,
      rows: [
        ["Username: admin, Password: password123 (Data Benar)", "Berhasil", "Berhasil", "Berhasil"],
        ["Username: admin, Password: salah (Password Salah)", "Gagal", "Gagal", "Berhasil"],
        ["Mengakses API sistem secara langsung tanpa token login", "Gagal", "Gagal", "Berhasil"],
        ['Menekan tombol "Logout" untuk mengakhiri sesi', "Berhasil", "Berhasil", "Berhasil"],
      ],
      desc_after: `Berdasarkan hasil pengujian pada Tabel 2, sistem autentikasi berjalan sebagaimana mestinya. Mekanisme otorisasi berbasis token (Bearer Token) yang diterapkan pada sisi server terbukti mampu memblokir seluruh percobaan akses tanpa kredensial yang valid, baik percobaan melalui antarmuka web maupun melalui permintaan API langsung (direct API request). Proses pemutusan sesi (logout) juga berhasil menghapus token yang tersimpan di server sehingga sesi lama tidak dapat lagi digunakan, memastikan bahwa keamanan dasbor terjaga dengan baik dari penyalahgunaan oleh pihak yang tidak berwenang.`,
    },
    {
      title: "Tabel 3. Pengujian Modul Kelola Pengetahuan (Data Intent)",
      desc_before: `Fitur pengelolaan data intent merupakan inti dari kemampuan administrator dalam memperbarui dan mengembangkan pengetahuan chatbot tanpa perlu mengubah kode program secara langsung. Pengujian modul ini memverifikasi apakah fungsi tambah, ubah, dan hapus data intent berjalan dengan benar, termasuk validasi data yang tidak lengkap, serta memastikan proses reload otomatis mesin NLP berjalan setelah setiap perubahan agar efek perubahan langsung terasa tanpa restart server.`,
      rows: [
        ["Menambah intent baru dengan nama dan isian lengkap", "Berhasil", "Berhasil", "Berhasil"],
        ['Menambah intent baru tanpa mengisi kolom "Balasan"', "Gagal", "Gagal", "Berhasil"],
        ["Memperbarui/Edit balasan pada intent yang sudah ada", "Berhasil", "Berhasil", "Berhasil"],
        ["Menghapus intent yang sudah tidak relevan", "Berhasil", "Berhasil", "Berhasil"],
        ["Sistem reload NLP Engine secara otomatis setelah perubahan", "Berhasil", "Berhasil", "Berhasil"],
      ],
      desc_after: `Berdasarkan hasil pengujian pada Tabel 3, seluruh operasi CRUD (Create, Read, Update, Delete) untuk manajemen pengetahuan chatbot berjalan dengan lancar dan tervalidasi. Sistem berhasil menangkap dan menolak permintaan penambahan intent yang datanya tidak lengkap, sekaligus memastikan data yang sudah tersimpan dapat diperbarui dan dihapus tanpa menimbulkan kesalahan pada sistem. Fitur kunci yang menjadi keunggulan utama modul ini adalah kemampuan auto-reload yang secara otomatis melatih ulang (retrain) model Naive Bayes setiap kali terjadi perubahan pada data, sehingga chatbot bisa langsung lebih cerdas tanpa mengganggu operasional yang sedang berjalan.`,
    },
    {
      title: "Tabel 4. Pengujian Modul Koneksi WhatsApp & Eksternal",
      desc_before: `Modul ini mencakup dua aspek konektivitas utama sistem. Pertama, proses penghubungan server bot ke akun WhatsApp milik administrator program studi melalui pemindaian kode QR (QR Code Scan). Kedua, pengujian jalur komunikasi API untuk menerima pesan masuk dari sistem eksternal seperti website WordPress milik program studi. Pengujian ini memastikan kedua jalur komunikasi tersebut bekerja secara aman dan handal.`,
      rows: [
        ["Membuka dasbor saat server baru berjalan (Generate QR)", "Berhasil", "Berhasil", "Berhasil"],
        ["Memindai (Scan) QR Code menggunakan HP Admin", "Berhasil", "Berhasil", "Berhasil"],
        ['Menekan tombol "Putuskan Koneksi" dari Dasbor', "Berhasil", "Berhasil", "Berhasil"],
        ["Mengirim pesan API dengan Secret Key yang Benar", "Berhasil", "Berhasil", "Berhasil"],
        ["Mengirim pesan API dengan Secret Key yang Salah", "Gagal", "Gagal", "Berhasil"],
      ],
      desc_after: `Berdasarkan hasil pengujian pada Tabel 4, proses autentikasi perangkat WhatsApp melalui mekanisme QR Code yang ditampilkan pada halaman Dasbor berjalan dengan stabil menggunakan library Baileys. Server mampu membangkitkan kode QR baru setiap kali sesi diputus, memastikan administrator dapat menghubungkan kembali perangkatnya kapan saja diperlukan. Pada sisi integrasi eksternal, sistem API telah dilengkapi dengan lapisan keamanan Secret Key yang berhasil memfilter seluruh permintaan pengiriman pesan yang tidak memiliki kunci yang sah, sehingga bot tidak dapat disalahgunakan oleh pihak ketiga yang tidak bertanggung jawab untuk mengirim pesan massal (spam).`,
    },
    {
      title: "Tabel 5. Pengujian Modul Database MySQL (Riwayat Log)",
      desc_before: `Pencatatan riwayat percakapan ke dalam database MySQL merupakan bagian krusial untuk keperluan pemantauan, analisis kinerja, dan evaluasi kualitas chatbot secara berkelanjutan. Pengujian modul ini memverifikasi bahwa setiap pesan yang masuk dan balasan yang dikirim bot terekam dengan lengkap dan akurat ke dalam basis data, serta memastikan tersedianya mekanisme cadangan (fallback) yang menjamin keberlangsungan sistem ketika koneksi ke database MySQL mengalami gangguan.`,
      rows: [
        ["User (mahasiswa) mengirim pesan baru ke WhatsApp", "Berhasil", "Berhasil", "Berhasil"],
        ['Refresh tabel "Riwayat Percakapan" di menu Dasbor', "Berhasil", "Berhasil", "Berhasil"],
        ["Panel metrik (Total Pesan & Rata-rata Confidence) ter-update", "Berhasil", "Berhasil", "Berhasil"],
        ["Menjalankan bot tanpa MySQL (Fallback ke Memori Sementara)", "Berhasil", "Berhasil", "Berhasil"],
      ],
      desc_after: `Berdasarkan hasil pengujian pada Tabel 5, sistem pencatatan data (logging) beroperasi secara real-time dan komprehensif. Setiap transaksi percakapan, mulai dari isi pesan, nomor pengirim, nama intent yang terdeteksi, hingga nilai skor kepercayaan (confidence score), tersimpan secara otomatis ke tabel MySQL dan langsung dapat dipantau melalui menu Riwayat Percakapan di Dasbor Admin. Selain itu, mekanisme fallback yang menyimpan data ke dalam memori aplikasi sementara (in-memory) terbukti berhasil menjaga keberlangsungan operasional chatbot dan pencatatan log meskipun layanan database MySQL sedang tidak dapat diakses, sehingga tidak ada data percakapan yang hilang pada kondisi darurat.`,
    },
  ],
};

// ========================
// SUSUN ISI DOKUMEN
// ========================
const docChildren = [];

// Judul Utama
docChildren.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 300 },
    children: [
      new TextRun({
        text: "Pengujian Black Box Keseluruhan Sistem Chatbot NLP",
        bold: true,
        size: 28,
        font: "Times New Roman",
      }),
    ],
  })
);

// Paragraf Pendahuluan
docChildren.push(para(data.intro));
docChildren.push(spacer());

// Setiap Modul
for (const t of data.tables) {
  docChildren.push(para(t.desc_before));
  docChildren.push(tableTitle(t.title));
  docChildren.push(createTestTable(t.rows));
  docChildren.push(spacer());
  docChildren.push(para(t.desc_after));
  docChildren.push(spacer());
}

// ========================
// BUILD & SIMPAN DOKUMEN
// ========================
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Times New Roman", size: 24 },
        paragraph: { spacing: { line: 360 } }, // 1.5 spasi
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.5),
            right: convertInchesToTwip(1),
          },
        },
      },
      children: docChildren,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const outputPath = "Pengujian_Black_Box_Chatbot_NLP.docx";
  fs.writeFileSync(outputPath, buffer);
  console.log(`\n✅ File Word berhasil dibuat: ${outputPath}`);
  console.log(`📁 Lokasi: ${process.cwd()}\\${outputPath}`);
});
