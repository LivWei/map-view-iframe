const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: './',
  devServer: {
    port: 8077,
    open: true,
    proxy: {
      '/service-pub/': {
        target: 'https://xtbgzww.digitalgd.com.cn/',
        changeOrigin: true,
        pathRewrite: {
          '^/service-pub/': '/service-pub/'
        }
      },
      '/index/': {
        target: 'https://data.gdgov.cn/',
        changeOrigin: true,
        pathRewrite: {
          '^/index/': '/index/'
        }
      }
    },
  },
  configureWebpack: {
    devtool: "source-map" //开启debugger
  }
  // productionSourceMap: false
})
