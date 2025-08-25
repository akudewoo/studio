# **App Name**: Alur Distribusi

## Core Features:

- Daftar Produk: Manajemen Daftar Produk: Admin dapat memasukkan dan mengelola daftar produk dengan detail seperti nama produk, harga beli, dan harga jual.
- Data Kios: Manajemen Data Kios: Admin dapat memasukkan dan mengelola data kios termasuk nama kios dan informasi relevan lainnya.
- Penebusan: Input Penebusan: Admin memasukkan detail penebusan termasuk NO DO, pemasok, tanggal penebusan, nama produk, kuantitas, harga beli (diambil dari daftar produk), dan jumlah total (kuantitas * harga beli).
- Penerbitan DO: Penerbitan DO: Berdasarkan Penebusan, admin menerbitkan Surat Pengiriman (DO) dengan memasukkan NO DO, tanggal, nama produk (diisi otomatis), kuantitas (tidak boleh melebihi kuantitas penebusan), nilai total penebusan, sisa kuantitas DO, dan sisa kuantitas penebusan.
- Distribusi Kios: Distribusi Kios: Setelah penerbitan DO, catat distribusi ke kios, termasuk NO DO, tanggal distribusi, nama produk (diisi otomatis), nama kios (dipilih dari data kios), kuantitas (tidak boleh melebihi kuantitas DO), harga jual (diambil dari daftar produk), nilai total (kuantitas * harga jual), pembayaran langsung, saldo, total pembayaran kredit (diambil dari catatan PEMBAYARAN untuk NO DO), dan total pembayaran.
- Pencatatan Pembayaran: Pencatatan Pembayaran: Catat pembayaran kios, termasuk tanggal, NO DO, nama kios, dan jumlah total pembayaran.

## Style Guidelines:

- Warna primer: Indigo (#4B0082) untuk membangkitkan perasaan keandalan, kepercayaan, dan keamanan, yang sesuai dengan aplikasi manajemen data.
- Warna latar belakang: Biru Keabu-abuan Muda (#E6E8EA), corak yang hampir putih dari warna primer, memberikan latar belakang yang profesional dan menenangkan.
- Warna aksen: Violet (#8F00FF), lebih terang dan lebih jenuh dari warna primer, untuk menyoroti ajakan bertindak.
- Pasangan font: 'Space Grotesk' (sans-serif) untuk tajuk dan 'Inter' (sans-serif) untuk teks tubuh.
- Gunakan ikon sederhana dan bersih untuk mewakili titik masuk data dan tindakan, memastikan kemudahan navigasi dan pemahaman yang cepat.
- Rancang tata letak agar intuitif dengan bagian yang jelas untuk setiap fungsi (entri data, transaksi, laporan), menggunakan sistem grid untuk tampilan yang teratur.
- Masukkan transisi halus untuk tindakan seperti pengiriman formulir dan pemuatan data untuk meningkatkan pengalaman pengguna tanpa mengganggu.