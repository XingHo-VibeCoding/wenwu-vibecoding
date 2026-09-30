import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" —— 用相对路径引用资源，静态托管放在子路径下也能正常加载
export default defineConfig({
  plugins: [react()],
  base: "./",
});
