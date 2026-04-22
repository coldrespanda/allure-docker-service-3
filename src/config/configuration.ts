export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  dataPath: process.env.DATA_PATH || './data',
  generation: {
    timeout: parseInt(process.env.GENERATION_TIMEOUT || '300000', 10),
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '3', 10),
    keepReportsCount: parseInt(process.env.KEEP_REPORTS_COUNT || '10', 10),
  },
});
