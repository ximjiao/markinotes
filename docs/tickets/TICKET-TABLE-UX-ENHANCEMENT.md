# [TICKET] Notion & Excel Style Table UX Enhancement

**Status:** 📋 Ready for Implementation  
**Priority:** High  
**Target:** `apps/desktop` (Tauri + React + Novel/TipTap Editor + SQLite)

---

## 🎯 Overview & Objectives
Tingkatkan User Experience (UX) komponen tabel di Markinotes dengan menggabungkan:
1. **Notion-Style Interactions:** Pill handle interaktif pada kolom & baris (hover indicator, click menu toolbar, dan Drag-and-Drop reordering).
2. **Excel-Style Visual Customization:** Kustomisasi warna header, zebra striping baris selang-seling, dan penyimpanan preferensi global via backend SQLite.

---

## 🏗️ Technical Architecture & Design Decisions

### 1. Persistence Layer (SQLite + Node Attributes)
* **Local Document Scope:** Disimpan langsung di dalam JSON schema dokumen TipTap via atribut node `Table` (`zebra: boolean`, `headerColor: string`).
* **Global Workspace Scope:** Disimpan di backend SQLite (`.markidown/db.sqlite`) pada tabel `workspace_settings` atau config store Tauri, agar tiap pembuatan tabel baru (`insertTable`) otomatis menggunakan default style yang dipilih user.

### 2. Floating Pill Handles & Context Menu (Overlay Architecture)
* **UI Pattern:** React Floating Overlay yang memantau koordinat `hover` pada `<th>` (kolom) dan `<tr>` (baris) tabel aktif.
* **Non-intrusive DOM:** Tidak merusak hierarki HTML `<table>` asli (menghindari error render / ProseMirror desync).

### 3. Drag-and-Drop Reordering Engine (Native Pointer Events + ProseMirror Tr)
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

---

## 🧪 Verification & QA Checklist
- [x] **Table-layout Auto & Full-bleed Compatibility:** Memastikan resize manual dan scroll-x tetap bekerja mulus bersamaan dengan pill handles.
- [x] **Undo / Redo Safety:** Setiap aksi DND dan perubahan warna masuk ke history history ProseMirror (`Cmd+Z` / `Cmd+Shift+Z`).
- [x] **Export Integrity:** Dokumen yang memiliki tabel zebra/header berwarna tetap ter-render rapi saat diexport ke Markdown, PDF, dan Docx.
- [x] **Bubble Toolbar Suppression:** Bubble menu teks dinonaktifkan di dalam sel tabel agar tidak menumpuk/menghalangi pill handle & konten header.
