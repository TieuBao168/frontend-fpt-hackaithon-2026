// Thương hiệu – đổi tại đây nếu đội có logo/tên khác.
export const BRAND = {
  team: 'Play Hard',
  /** Tên sản phẩm theo UI spec: "FPT Play Trailer AI" (logo ảnh + chữ "Trailer AI") */
  product: 'Trailer AI',
  /** Ảnh logo dùng cho thanh bên, logo góc trên video và template (nguồn: asset/fpt-logo.png) */
  logoUrl: '/brand/fpt-play-logo.png',
  logoAlt: 'FPT Play',
  logoAspect: 45 / 11,
  watchCta: 'Xem trọn bộ trên FPT Play',
};

/** Ẩn bước Lịch sử (UC-I.1, I.2) theo spec; code vẫn giữ ở web/legacy-v4 */
export const SHOW_HIST = false;
