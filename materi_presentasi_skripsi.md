# 📚 Materi Presentasi Skripsi: Sistem Chatbot WhatsApp Berbasis NLP

Dokumen ini disusun untuk memudahkan Anda dalam mempresentasikan sistem Chatbot yang telah dikembangkan saat bimbingan atau sidang skripsi. 

---

## 1. Deskripsi Umum Sistem
Sistem ini adalah **Chatbot WhatsApp Interaktif Berbasis Natural Language Processing (NLP)** yang dilengkapi dengan **Dashboard Web Admin** dan terintegrasi dengan **Basis Data MySQL**. 

Tujuan utama sistem ini adalah mengotomatisasi layanan informasi (seperti chatbot akademik/kampus) melalui WhatsApp agar mahasiswa atau pengguna bisa mendapatkan balasan instan, akurat, dan natural (mendukung bahasa santai/slang) dalam 24/7.

---

## 2. Arsitektur & Teknologi yang Digunakan
Sistem ini dibangun dengan arsitektur Node.js yang modular dan handal.
*   **Backend & Dashboard:** Node.js + Express.js (Untuk server utama dan API web dashboard).
*   **WhatsApp Gateway:** `whatsapp-web.js` (Sebagai penghubung antara sistem dengan WhatsApp, tidak memerlukan API resmi berbayar).
*   **Kecerdasan Buatan (NLP):** Library `natural` (Untuk klasifikasi intent menggunakan algoritma *Naive Bayes*, deteksi kemiripan kata, dan stemming/tokenization).
*   **Database:** MySQL (Menyimpan riwayat chat, statistik penggunaan, dan data user). Intents disimpan pada JSON file (`intents.json`) untuk performa baca yang sangat cepat.

---

## 3. Alur Kerja Sistem (System Workflow)
Saat mempresentasikan bagaimana pesan dibalas, jelaskan alur berikut:
1.  **Pesan Masuk:** User mengirim pesan via WhatsApp.
2.  **Ditangkap oleh Sistem:** Modul WhatsApp Gateway meneruskan teks pesan ke modul Engine NLP.
3.  **Pre-processing:** Teks pesan dibersihkan dari karakter tidak perlu, diubah menjadi huruf kecil (lowercase), dan dipecah per kata (tokenizing).
4.  **Klasifikasi (NLP Engine):** Sistem akan mendeteksi **maksud (intent)** pengguna. *(Penjelasan detail ada di poin 4)*.
5.  **Pemilihan Balasan:** Setelah intent diketahui, sistem mengambil salah satu jawaban (response) secara acak bersadarkan intent tersebut yang ada pada `intents.json`.
6.  **Pesan Dikirim & Dicatat:** Balasan dikirim kembali ke user via WhatsApp, lalu sistem mencatat (logging) histori chat dan *confidence score* ke database MySQL untuk laporan pada Dashboard.

---

## 4. Cara Kerja Algoritma NLP (Poin Penting Sidang!)
Kunci kehebatan sistem ini adalah NLP Classifier yang menggunakan arsitektur **3-Lapis (Three-Layer Classification)** untuk memastikan akurasi maksimal, hal ini sangat bagus untuk menjadi sorotan dalam sidang:

*   **Layer 1: Exact Match (Pencocokan Persis)**
    Sistem mengecek apakah pesan user 100% sama dengan data pattern (contoh: "halo"). Jika ya, langsung berikan jawaban dengan confidence score `1.0` (100%). Sangat cepat dan efisien.
*   **Layer 2: Similarity Match (Kemiripan Karakter)**
    Jika beda sedikit (misal user typo "hallo" atau "hlo"), sistem menggunakan algoritma **Jaro-Winkler Distance**. Jika kemiripan kata di atas **85%**, sistem menganggapnya match. 
*   **Layer 3: Naive Bayes Classifier (Machine Learning)**
    Jika teks user benar-benar kalimat baru (misal: "min saya mau nanya soal pendaftaran gimana ya?"), dan gagal di layer 1 & 2, maka algoritma **Naive Bayes** bekerja. Model ini telah "dilatih" (trained) dan akan menghitung probabilitas matematis ke arah mana kalimat ini condong (intent apa).

---

## 5. Fitur Unggulan Sistem (Selling Point)
*   **Realtime Dashboard:** Terdapat tampilan web untuk melakukan scan QR Code WhatsApp, memantau *total messages*, dan *average confidence score* secara langsung.
*   **Dynamic NLP Training (Auto-Reload):** Admin dapat menambah/mengedit data Intent (apa yang dipahami oleh bot dan jawabannya) dari antarmuka Dashboard. Saat disimpan, NLP Engine akan secara otomatis menata/melatih ulang dirinya (auto-reload) tanpa perlu me-restart server!
*   **Fault-Tolerant (Standby Mode):** Jika database MySQL tiba-tiba mati / error, sistem tidak ikut crash. Sistem akan menggunakan mode *in-memory fallback* agar bot WhatsApp tetap bisa membalas chat secara normal.
*   **Tes Interaktif:** Dashboard dilengkapi menu untuk meramu simulasi kata "Test Tool", sehingga dosen penguji dapat langsung mengetikkan pertanyaan pada web admin tanpa harus memegang HP.

---

> [!TIP]
> **Saran Saat Demo / Presentasi:**
> - Buka layar terminal (Node.js) untuk memperlihatkan log *booting* yang rapi.
> - Scan QR Code di web dashboard dan tunjukkan log status berubah menjadi *"Ready!"*.
> - Kirim pesan dari hp Anda menggunakan typo yang parah agar fitur "Jaro-Winkler" (*layer 2*) atau "Naive Bayes" (*layer 3*) bisa unjuk gigi, lalu perlihatkan confidence score-nya di terminal atau layar admin.
