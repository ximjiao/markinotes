# [TICKET] Notion & Excel Style Table & Block Grab UX Enhancement

**Status:** 📋 Ready for Implementation  
**Priority:** High  
**Target:** `apps/desktop` (Tauri + React + Novel/TipTap Editor + SQLite)

---

## 🎯 Overview & Objectives
Tingkatkan User Experience (UX) editor dan tabel di Markinotes dengan arsitektur **2-Level Grab** ala Notion & Excel:
1. **Level 1 (Block-Level Grab & Action Menu Helper):**
   - Handle `+` dan `::` di sisi kiri setiap blok (`p`, `h1-h4`, `li`, `blockquote`, `pre`, `table`).
   - Drag & drop untuk memindahkan seluruh blok atau item list terpisah.
   - Klik `::` memunculkan **Contextual Action Menu Popover** lengkap (`Turn into >`, `Color >`, `Duplicate ⌘D`, `Delete Del`, `Copy link`, search action bar, serta kontrol spesifik per tipe blok seperti table/list).
2. **Level 2 (Detail-Item Grab / Table Pill Handles):**
   - Pill handle interaktif pada kolom (atas) & baris (kiri) tabel untuk reordering DND dan menu cepat kolom/baris.
3. **Excel-Style Visual Customization:**
   - Kustomisasi warna header, zebra striping baris selang-seling, dan penyimpanan preferensi global via backend SQLite.

---

## 🏗️ Technical Architecture & Design Decisions

### 1. Two-Level Grab Architecture
* **Level 1 (Block Scope):** Ditangani oleh `notion-block-side-handle.tsx`. Membedakan aksi *Click* (membuka Popover Action Helper) dan *Drag* (>3px movement untuk reorder blok).
* **Level 2 (Detail Item Scope):** Ditangani oleh `notion-table-pill-handles.tsx`. Mengontrol cell boundary internal tabel.

### 2. Persistence Layer (SQLite + Node Attributes)
* **Local Document Scope:** Disimpan langsung di dalam JSON schema dokumen TipTap via atribut node `Table` (`zebra: boolean`, `headerColor: string`).
* **Global Workspace Scope:** Disimpan di backend SQLite (`.markidown/db.sqlite`) pada tabel `workspace_settings` atau config store Tauri, agar tiap pembuatan tabel baru (`insertTable`) otomatis menggunakan default style yang dipilih user.

### 3. Floating Pill Handles & Context Menu (Overlay Architecture)
* **UI Pattern:** React Floating Overlay yang memantau koordinat `hover` pada `<th>` (kolom) dan `<tr>` (baris) tabel aktif.
* **Non-intrusive DOM:** Tidak merusak hierarki HTML `<table>` asli (menghindari error render / ProseMirror desync).

### 4. Drag-and-Drop Reordering Engine (Native Pointer Events + ProseMirror Tr)
* **Drag Visualizer:** Menggunakan native `pointerdown`, `pointermove`, `pointerup` untuk merender ghost card dan drop indicator line.
* **State Mutation:** Menjalankan transaksi atomik ProseMirror (`state.tr`) saat drop:
  * **Row Reorder:** Cut `tableRow` lama dan insert di target index.
  * **Column Reorder:** Re-order cell ke-$i$ di setiap `tableRow` + sinkronisasi array `colwidth`.

---

## 📅 Phased Implementation Roadmap

### 🔹 Phase 1: Custom Styling & SQLite Workspace Persistence
- [x] **1.1. Extension Schema Update:** Tambahkan atribut `zebra` dan `headerColor` pada `CustomTable` di `novel-editor.tsx`.
- [x] **1.2. CSS Styling Rules:** Buat rules CSS dinamis untuk zebra striping (`tr:nth-child(even)`) dan header palette di `globals.css`.
- [x] **1.3. SQLite Backend Integration:** Tambahkan endpoint Tauri IPC untuk read/write default table preferences di SQLite.
- [x] **1.4. Table Toolbar / Context Controls:** Sediakan toggle Zebra & Color Picker pada toolbar tabel.

### 🔹 Phase 2: Pill Handles & Contextual Quick Toolbar
- [x] **2.1. Table Hover Overlay Component (`notion-table-pill-handles.tsx`):**
  - Render Horizontal Pill di atas kolom (`<th>`) saat hover.
  - Render Vertical 6-dot Grip Pill di sebelah kiri baris (`<tr>`) saat hover.
  - Sinkronisasi koordinat real-time dengan horizontal scroll `.tableWrapper`.
- [x] **2.2. Contextual Quick Menu (On Click):**
  - **Column Actions:** Add Column Left/Right, Delete Column, Clear Contents.
  - **Row Actions:** Add Row Above/Below, Delete Row, Toggle Header Row.

### 🔹 Phase 3: Drag-and-Drop Row & Column Reordering
- [x] **3.1. Drag Indicator Visuals:** Drop target guide line (garis aksen horizontal untuk baris, vertikal untuk kolom).
- [x] **3.2. Row Reorder Transaction:** ProseMirror transaction handler untuk memindahkan baris `<tr>`.
- [x] **3.3. Column Reorder Transaction:** ProseMirror transaction handler untuk memindahkan kolom ke-$i$ di seluruh baris beserta array `colwidth`.

### 🔹 Phase 4: Notion 2-Level Grab System & Contextual Action Menu Helper
- [x] **4.1. Block-Level vs Detail-Item Grab Architecture:**
  - **Level 1 (Block Grab `::`):** Meng-handle seluruh blok (`h1-h4`, `p`, `li`, `blockquote`, `pre`, `table`). Hover menampilkan `+` dan `::`.
  - **Level 2 (Detail-Item Grab):** Meng-handle bagian internal blok seperti Pill Handle pada kolom/baris `table`.
  - **Ergonomic Spacing:** Jarak tombol `+` dan `::` pada Level 1 digeser lebih ke kiri (`-76px` dari margin block) agar memberikan ruang yang sangat lega dan tidak bertabrakan dengan Pill Handle baris tabel (Level 2).
- [x] **4.2. Notion Block Action Menu Popover (On `::` Click):**
  - **Search Actions Filter:** Input pencarian aksi cepat di atas menu.
  - **Contextual Block Info:** Badge/Header tipe blok aktif (misal `Heading 3`, `Bulleted list`, `Table`, `Paragraph`).
  - **General Block Turn into & Colors:** Submenu ubah block type & warna font/background.
  - **Table Block Level 1 Controls (Spesifik Table):**
    - **Zigzag / Zebra Row Striping & Color Decider:** Toggle zebra striping + selector warna selang-seling (Gray, Blue, Green, Yellow, Red, Purple, dll).
    - **Header Theme Color Palette:** Selector warna background khusus baris header.
    - **Header Row & Column Toggles:** Mengaktifkan/menonaktifkan baris header utama atau kolom header.
    - **Table Width & Utilities:** `Fit to page width`, `Duplicate Table` (`⌘D`), `Delete Table` (`Del`).
- [x] **4.3. Single Header Enforcement Rule (Level 1 vs Level 2 Sync):**
  - **Aturan 1 Header per Table:** 1 tabel hanya boleh memiliki 1 header row (di posisi baris teratas).
  - **Level 2 Menu Filter:** Pada row pill handle (Level 2), jika tabel sudah memiliki header row, baris di bawahnya **tidak boleh** menampilkan opsi "Set as header" lagi. Opsi toggle header row hanya tersedia di baris pertama atau dikontrol secara global via menu Level 1.
- [x] **4.4. Granular List Item Isolation:**
  - Tiap item list (`<li>`, `[data-type="taskItem"]`) memiliki side handle tersendiri sehingga bisa dipindah, di-duplicate, atau diubah tanpa mempengaruhi seluruh list parent.

---

## 🧪 Verification & QA Checklist
- [x] **Table-layout Auto & Full-bleed Compatibility:** Memastikan resize manual dan scroll-x tetap bekerja mulus bersamaan dengan pill handles.
- [x] **Undo / Redo Safety:** Setiap aksi DND dan perubahan warna masuk ke history ProseMirror (`Cmd+Z` / `Cmd+Shift+Z`).
- [x] **Export Integrity:** Dokumen yang memiliki tabel zebra/header berwarna tetap ter-render rapi saat diexport ke Markdown, PDF, dan Docx.
- [x] **Bubble Toolbar Suppression:** Bubble menu teks dinonaktifkan di dalam sel tabel agar tidak menumpuk/menghalangi pill handle & konten header.
- [x] **Block Helper Menu Precision:** Menu popover `::` muncul tepat di koordinat klik tanpa memicu drag, dan menutup saat item dipilih atau diklik di luar.
- [x] **List Item Independence:** Men-drag atau mengubah bullet list item individual tidak merusak struktur DOM list ProseMirror.
