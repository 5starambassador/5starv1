// Force rebuild - restored git state
import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: 'class',
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                'ui-primary': "var(--ui-primary)",
                'ui-accent': "var(--ui-accent)",
                'primary-maroon': '#800000',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
export default config;
