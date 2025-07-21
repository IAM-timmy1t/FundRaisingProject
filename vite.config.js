import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';

// Create a custom logger that's less noisy in development
const customLogger = createLogger();
const originalWarning = customLogger.warn;
customLogger.warn = (msg, options) => {
  // Ignore specific warnings
  if (msg.includes('is not exported by') || msg.includes('This syntax is no longer recommended')) {
    return;
  }
  originalWarning(msg, options);
};

export default defineConfig(({ mode }) => {
  const isAnalyze = mode === 'analyze';
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      // Compress assets in production
      isProduction && compression({
        algorithm: 'gzip',
        threshold: 10240, // Only compress files larger than 10kb
      }),
      isProduction && compression({
        algorithm: 'brotliCompress',
        threshold: 10240,
      }),
      // Bundle analyzer
      isAnalyze && visualizer({
        filename: './dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      })
    ].filter(Boolean),
    
    customLogger,
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    server: {
      host: true,
      port: 5173,
      hmr: {
        overlay: false, // Disable error overlay in development
      },
    },
    
    build: {
      target: 'es2015',
      minify: isProduction ? 'terser' : false,
      sourcemap: !isProduction,
      reportCompressedSize: false, // Faster builds
      chunkSizeWarningLimit: 1000,
      
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info'] : [],
        },
        format: {
          comments: false,
        },
      },
      
      rollupOptions: {
        output: {
          // Manual chunk optimization
          manualChunks: {
            // React ecosystem
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            
            // UI libraries
            'ui-vendor': ['framer-motion', 'lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
            
            // Supabase
            'supabase': ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
            
            // Utilities
            'utils': ['clsx', 'tailwind-merge', 'date-fns', 'react-hook-form'],
            
            // Charts and data visualization
            'charts': ['recharts'],
            
            // Rich text and markdown
            'editor': ['@tiptap/react', '@tiptap/starter-kit'],
          },
          
          // Better chunk naming for caching
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `js/[name]-${facadeModuleId}-[hash].js`;
          },
          
          entryFileNames: 'js/[name]-[hash].js',
          
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `images/[name]-[hash][extname]`;
            } else if (/woff2?|ttf|otf|eot/i.test(ext)) {
              return `fonts/[name]-[hash][extname]`;
            } else if (ext === 'css') {
              return `css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
        
        // External dependencies that should not be bundled
        external: [],
        
        // Tree-shaking optimizations
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
    },
    
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@supabase/auth-helpers-react',
        'framer-motion',
        'lucide-react',
      ],
      exclude: ['@vite/client', '@vite/env'],
    },
    
    // Environment variable configuration
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    
    // CSS optimizations
    css: {
      devSourcemap: !isProduction,
      modules: {
        localsConvention: 'camelCase',
      },
    },
    
    // Performance optimizations
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
      treeShaking: true,
    },
  };
});