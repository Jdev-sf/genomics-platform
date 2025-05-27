// components/theme-script.tsx
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var storageKey = 'genomics-ui-theme';
              var theme = localStorage.getItem(storageKey);
              var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              
              if (!theme) {
                theme = 'system';
              }
              
              var resolvedTheme = theme === 'system' ? systemTheme : theme;
              
              if (resolvedTheme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (e) {
              // Fallback to light mode if anything goes wrong
              document.documentElement.classList.remove('dark');
            }
          })();
        `,
      }}
    />
  );
}