import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // handoff-finish test dosyalarını runs/<runId>/artifacts/ altına kopyalıyor.
    // Bunlar hariç tutulmazsa vitest kopyaları da toplar: test sayısı her run'da
    // ikiye katlanır ve eski, artık geçerli olmayan test kopyaları koşulmaya
    // devam eder.
    exclude: ['**/node_modules/**', '**/dist/**', 'runs/**', 'handoffs/**'],
  },
});
