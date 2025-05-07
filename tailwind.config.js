/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/app/**/*.{js,ts,jsx,tsx}',
      './src/components/**/*.{js,ts,jsx,tsx}',
    ],
    darkMode: 'class', // 👈 nécessaire pour `next-themes`
    theme: {
      extend: {
        colors: {
        //   primary: '#2563eb',
        //   secondary: '#64748b',
          // ajoute tes propres couleurs ici si tu veux
        },
      },
    },
    plugins: [],
  }
  