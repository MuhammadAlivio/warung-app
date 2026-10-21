/** @type {import('tailwindcss').Config} */
// Tailwind v3. Untuk Tailwind v4 lihat catatan di bawah.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        brand: {
          50: "#eaf3ee",
          100: "#d5e8dd",
          600: "#3b7658",
          700: "#2f6048",
          900: "#1f3a2d",
        },
      },
    },
  },
  plugins: [],
};

/*
 Tailwind v4 (di src/index.css):

 @import "tailwindcss";
 @theme {
   --font-sans: "Inter", system-ui, sans-serif;
   --color-brand-50: #eaf3ee;
   --color-brand-600: #3b7658;
   --color-brand-700: #2f6048;
   --color-brand-900: #1f3a2d;
 }
*/
