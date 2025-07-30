module.exports = {
  mongoMemoryServerOptions: {
    binary: {
      skipMD5: true,
      downloadDir: './.cache/mongodb-binaries',
    },
    instance: {
      dbName: 'test',
      port: 27018,
    },
  },
};
