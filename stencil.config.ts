import { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'speciesidentification',
  //globalStyle: 'src/assets/global.css',
  taskQueue: 'async',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader'
    },
    {
      type: 'docs-readme'
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers,
      copy: [
        { src: 'data' },
        { src: 'assets' }
      ]
    }
  ]
};
