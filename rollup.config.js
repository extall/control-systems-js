import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/control-systems.js',
    format: 'umd',
    name: 'ControlSystems'
  },
  plugins: [resolve()]
};
