/* Klaster laporan: setiap kategori dikelompokkan ke salah satu klaster (diatur di Pengaturan > Kategori) */
export const CLUSTERS = [
  { k: 'A', n: 'SDM & Insentif', c: 'var(--purple)' },
  { k: 'B', n: 'Energi & Utilitas', c: 'var(--orange)' },
  { k: 'C', n: 'Dapur & Kebersihan', c: 'var(--pink)' },
  { k: 'D', n: 'ATK & Administrasi', c: 'var(--lime)' },
];
export const CLUSTER_NAMES = CLUSTERS.map((c) => c.n);
export const DEFAULT_CLUSTER = CLUSTER_NAMES[3];

/* indeks klaster untuk sebuah kategori; gaji pegawai selalu klaster A */
export function clusterIndex(category, categories) {
  if (category === 'Gaji pegawai') return 0;
  const i = CLUSTER_NAMES.indexOf(categories.find((c) => c.name === category)?.cluster);
  return i < 0 ? 3 : i;
}
