<template>
  <dir class="map-content">
    <div id="map"></div>

    <div class="btns" v-if="showBtns">
      <div title="刷新" @click="refresh">
        <img src="../assets/images/rf.png" alt="" />
      </div>
      <div title="下载缩略图" @click="directDownloadImg">
        <img src="../assets/images/img.png" alt="" />
      </div>
    </div>

    <!-- 弹窗 -->
    <div id="popup" v-show="shopPopup">
      <div class="popup-content">
        <div v-for="(item, index) in popupContent" :key="index">
          {{ item.name }}: {{ item.value }}
        </div>
        <div class="triangle"></div>
      </div>
    </div>
  </dir>
</template>

<script>
import html2canvas from "html2canvas";
export default {
  components: {},
  props: {},
  data() {
    return {
      map: null,

      fill: null,
      stroke: null,
      image: null,

      showBtns: false,

      shopPopup: false,
      popupContent: [],
      popupObj: null
    };
  },
  created() {
    this.showBtns =
      window.top && window.top.location.href.includes("op-manage");
  },
  mounted() {
    this.addBaseMap();

    this.fill = new ol.style.Fill({
      color: "rgba(239,152,152, 0.8)",
    });
    this.stroke = new ol.style.Stroke({
      color: "#319FD3",
      width: 1,
    });
    this.image = new ol.style.Circle({
      radius: 7,
      fill: this.fill,
      stroke: this.stroke,
    });

    const catald = this.getUrlParams(window.location.search).catald;
    const layerUrl = this.getUrlParams(window.location.search).layerUrl;
    if (layerUrl) {
      this.getFunByUrl(layerUrl);
    }

    if (catald) {
      this.getServiceInfoById(catald);
    }
  },
  methods: {
    // 刷新
    refresh() {
      const view = this.map.getView();
      view.setCenter(window.mapConfig.center);
      view.setZoom(window.mapConfig.zoom + 2);
    },
    // 下载缩略图
    directDownloadImg() {
      const promises = [
        this.createPreviewImg(600, 880, "pc端预览图"),
        this.createPreviewImg(300, 300, "pc端缩略图"),
        this.createPreviewImg(300, 300, "pc端缩略图"),
        this.createPreviewImg(300, 300, "pc端缩略图"),
        this.createPreviewImg(520, 975, "移动端地图图片"),
        this.createPreviewImg(520, 975, "移动端地图图片"),
        this.createPreviewImg(520, 975, "移动端地图图片"),
      ];

      Promise.all(promises)
        .then((results) => {
          this.$message({
            message: "图片已下载！",
            type: "success",
          });
        })
        .catch((error) => {
          // 如果任何一个html2canvas操作失败，这里会捕获到错误
          console.error("渲染过程中出现错误:", error);
        });
    },
    // 创建图片
    createPreviewImg(height, width, name) {
      const element = document.querySelector(".map-content");
      const x = (window.innerWidth - width) / 2 - 5;
      const y = (window.innerHeight - 60 - height) / 2;

      let proxyUrl = "";
      if (process.env.NODE_ENV === "production") {
        if (window.isProduction) {
          proxyUrl = "https://data.gdgov.cn";
        } else {
          proxyUrl = "https://xtbgzww.digitalgd.com.cn";
        }
      } else {
        proxyUrl = "http://localhost:8077";
      }
      html2canvas(element, {
        proxy: proxyUrl,
        useCORS: true,
        allowTaint: true,
        height: height,
        width: width,
        x: x,
        y: y,
        scale: 1,
        dpi: window.devicePixelRatio * 0.5,
      }).then((canvas) => {
        const base64URL = canvas.toDataURL("image/png", 1.0);
        const a = document.createElement("a");
        a.href = base64URL;
        const imgName = `${name}_${new Date().getTime()}`;
        a.setAttribute("download", imgName);
        a.click();
      });
    },

    // 获取URL参数
    getUrlParams(url) {
      const urlParams = new URLSearchParams(url.split("?")[1]);
      const params = {};
      for (let param of urlParams.entries()) {
        params[param[0]] = param[1];
      }
      return params;
    },
    // 注册4326坐标系
    getProjection4326() {
      const projection = ol.proj.get("EPSG:4326");
      return projection;
    },
    // 注册4490坐标系
    getProjection4490() {
      proj4.defs("EPSG:4490", "+proj=longlat +ellps=GRS80 +no_defs");
      ol.proj.proj4.register(proj4);
      const projection = new ol.proj.Projection({
        code: "EPSG:4490",
        units: "degrees",
        axisOrientation: "neu",
      });
      projection.setExtent([-180, -90, 180, 90]);
      projection.setWorldExtent([-180, -90, 180, 90]);
      ol.proj.addProjection(projection);
      return projection;
    },
    // 注册4547坐标系
    getProjection4547() {
      proj4.defs(
        "EPSG:4547",
        "+proj=tmerc +lat_0=0 +lon_0=114 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs"
      );
      ol.proj.proj4.register(proj4);
      const projection = new ol.proj.Projection({
        code: "EPSG:4547",
        units: "degrees",
        axisOrientation: "neu",
      });
      projection.setExtent([-180, -90, 180, 90]);
      projection.setWorldExtent([-180, -90, 180, 90]);
      ol.proj.addProjection(projection);
      return projection;
    },
    // 天地图地图
    addBaseMap() {
      // 设置天地图底图
      const projectionExtent = this.getProjection4326().getExtent();
      const size = ol.extent.getWidth(projectionExtent) / 256;
      const resolutions = [];
      for (let z = 1; z < 21; ++z) {
        resolutions[z] = size / Math.pow(2, z);
      }
      const matrixIds = Array.from({ length: 17 }, (_, i) => i.toString());
      const list = ["vec", "cva"];
      let layerList = [];
      list.forEach((item) => {
        layerList.push(
          new ol.layer.Tile({
            source: new ol.source.WMTS({
              url: `https://t{0-6}.tianditu.gov.cn/${item}_c/wmts?tk=${window.mapConfig.tk}`, // 天地图key去官网很容易申请
              layer: item,
              matrixSet: "c",
              style: "default",
              crossOrigin: "anonymous",
              format: "tiles",
              wrapX: true,
              tileGrid: new ol.tilegrid.WMTS({
                origin: ol.extent.getTopLeft(
                  this.getProjection4326().getExtent()
                ),
                resolutions: resolutions,
                matrixIds: matrixIds,
              }),
            }),
          })
        );
      });
      this.map = new ol.Map({
        layers: layerList,
        target: "map",
        view: new ol.View({
          center: window.mapConfig.center,
          projection: this.getProjection4490(),
          zoom: window.mapConfig.zoom + 2,
        }),
      });

      console.log("天地图加载完成！");
      // window.map = this.map; //调试使用

      // 广东省边界线
      // const that = this
      // fetch('./guangdong.json')
      //   .then(function (response) {
      //     return response.text();
      //   })
      //   .then(function (json) {
      //     const vectorSource = new ol.source.Vector({
      //       features: new ol.format.GeoJSON().readFeatures(JSON.parse(json)),
      //     });

      //     const vectorLayer = new ol.layer.Vector({
      //       source: vectorSource,
      //     });

      //     that.map.addLayer(vectorLayer);
      //   })
    },
    // 航太宏图 WNTS
    addHtWMTSLayers(wmtsUrl, wmtsGetCapabilitiesUrl, layerName) {
      const that = this;
      // 请求图层的元数据
      fetch(`${wmtsGetCapabilitiesUrl}`)
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          const parser = new ol.format.WMTSCapabilities();
          const result = parser.read(text);
          const options = ol.source.WMTS.optionsFromCapabilities(result, {
            layer: layerName,
          });

          let projectionExtent = that.getProjection4490().getExtent();
          let size = ol.extent.getWidth(projectionExtent) / 512; //size就是一个像素代表的经纬度

          let matrixIds = [];
          function getResolutions2() {
            let resolutions = [];
            for (let z = 0; z < 20; ++z) {
              resolutions[z] = size / Math.pow(2, z);
              matrixIds[z] = z;
            }
            return resolutions;
          }

          const layer_wmts = new ol.layer.Tile({
            source: new ol.source.WMTS({
              url: wmtsUrl,
              layer: options.layer,
              style: options.style,
              serviceName: options.layer,
              matrixSet: options.matrixSet,
              format: options.format,
              tileGrid: new ol.tilegrid.WMTS({
                tileSize: [512, 512],
                extent: [-180.0, -90.0, 180.0, 90.0], //范围
                origin: [-180.0, 90.0],
                resolutions: getResolutions2(),
                matrixIds: matrixIds,
              }),
              wrapX: true,
            }),
          });

          that.map.addLayer(layer_wmts);
        });
    },
    // 航天宏图 WFS
    addHtWFSLayers(wfsUrL, layerName) {
      const that = this;
      const params = {
        service: "WFS",
        version: "1.1.0",
        request: "GetFeature",
        layerName: layerName,
        outputFormat: "application/json",
        maxFeatures: 1000000,
        srsName: "EPSG:4490",
      };

      const queryString = Object.keys(params)
        .map((key) => `${key}=${encodeURIComponent(params[key])}`)
        .join("&");
      const fullUrl = `${wfsUrL}?${queryString}`;

      fetch(fullUrl, { credentials: "include" })
        .then(function (response) {
          return response.text();
        })
        .then(function (res) {
          const jsonList = JSON.parse(res);

          const styles = new ol.style.Style({
            fill: that.fill,
            stroke: that.stroke,
            image: that.image,
          });

          const format = new ol.format.WKT();
          const featureList = [];
          jsonList.forEach((item) => {
            const feature = format.readFeature(item.geom)

            const _item = JSON.parse(JSON.stringify(item))
            delete _item.geom
            feature.values_ = {
              ...feature.values_,
              ..._item
            }

            featureList.push(feature);
          });

          const vectorLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
              features: featureList,
            }),
            style: styles,
          });

          that.map.addLayer(vectorLayer);

          that.popupObj = new ol.Overlay({
            element: document.getElementById('popup'),
            positioning: "bottom-center",
            stopEvent: true,
          });
          that.map.addOverlay(that.popupObj)
          that.map.on('singleclick', evt => {
            that.feature_Info(evt)
          })
        });
    },

    // 中地数码 WMTS
    addZdsmWMTSLayers(wmtsUrl, layerName) {
      const that = this;
      const url = `${wmtsUrl}?token=${window.mapConfig.zdsmToken}`;
      // 请求图层的元数据
      fetch(url)
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          const parser = new ol.format.WMTSCapabilities();
          that.getProjection4490();
          const result = parser.read(text);
          const options = ol.source.WMTS.optionsFromCapabilities(result, {
            layer: layerName,
          });

          const _layer = new ol.layer.Tile({
            opacity: 1,
            source: new ol.source.WMTS({
              url: url,
              layer: options.layer,
              matrixSet: options.matrixSet,
              format: options.format,
              projection: options.projection,
              requestEncoding: options.requestEncoding,
              style: options.style,
              tileGrid: options.tileGrid,
              token: window.mapConfig.zdsmToken,
              wrapX: true,
            }),
          });

          that.map.addLayer(_layer);
        });
    },
    // 中地数码 WFS
    addZdsmWFSLayers(layerUrl, layerName) {
      const that = this;
      const params = {
        service: "WFS",
        version: "1.1.0",
        request: "GetFeature",
        typename: `${layerName}:t0`, // 图层名称，格式为workspace:layer_name
        token: window.mapConfig.zdsmToken,
        srsName: "EPSG:4326",
        outputFormat: "JSON",
      };

      const queryString = Object.keys(params)
        .map((key) => `${key}=${encodeURIComponent(params[key])}`)
        .join("&");
      const fullUrl = `${layerUrl}?${queryString}`;

      fetch(fullUrl, { credentials: "include" })
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          const json = JSON.parse(text);

          const styles = new ol.style.Style({
            fill: that.fill,
            stroke: that.stroke,
            image: that.image,
          });
          const vectorSource = new ol.source.Vector({
            features: new ol.format.GeoJSON().readFeatures(json),
          });

          const vectorLayer = new ol.layer.Vector({
            source: vectorSource,
            style: styles,
          });

          that.map.addLayer(vectorLayer);

          that.popupObj = new ol.Overlay({
            element: document.getElementById('popup'),
            positioning: "bottom-center",
            stopEvent: true,
          });
          that.map.addOverlay(that.popupObj)
          that.map.on('singleclick', evt => {
            that.feature_Info(evt)
          })
        });
    },

    feature_Info (evt) {
      let feature = this.map.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => feature
      );
      if (feature) {
        this.shopPopup = true;
        this.popupObj.setPosition(evt.coordinate);
        const _popupContent = feature.values_

        this.popupContent = []

        const noShowList = window.noShowFileds
        for(const i in _popupContent) {
          if (!noShowList.includes(i)) {
            this.popupContent.push({
              name: i,
              value: _popupContent[i]
            })
          }
        }
      } else {
        this.shopPopup = false;
        this.popupObj.setPosition(null);
      }
    },

    // 天地图WMTS
    addTdtWMTSLayers(url) {
      function delUrlIp(url) {
        // 使用正则表达式匹配协议和域名/IP部分
        const regex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^\/\n]+)(.*)/;
        // 使用正则表达式替换匹配的部分
        return url.replace(regex, "$2");
      }
      const layerUrl = url.split("?")[0];
      const layerName = delUrlIp(layerUrl).split("/")[0];

      const projectionExtent = this.getProjection4326().getExtent();
      const size = ol.extent.getWidth(projectionExtent) / 256;
      const resolutions = [];
      for (let z = 1; z < 21; ++z) {
        resolutions[z] = size / Math.pow(2, z);
      }
      const matrixIds = Array.from({ length: 17 }, (_, i) => i.toString());

      const layer = new ol.layer.Tile({
        source: new ol.source.WMTS({
          url: `${layerUrl}?tk=${window.mapConfig.tk}`,
          layer: layerName,
          matrixSet: "c",
          style: "default",
          crossOrigin: "anonymous",
          format: "tiles",
          wrapX: true,
          tileGrid: new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft(this.getProjection4326().getExtent()),
            resolutions: resolutions,
            matrixIds: matrixIds,
          }),
        }),
      });
      this.map.addLayer(layer);
    },

    // 通过服务url判断调用哪个方法
    getFunByUrl(_url) {
      // 如果是天地图
      if (_url.includes("tianditu")) {
        this.addTdtWMTSLayers(_url);
        return
      }
      const that = this;
      function delUrlIp(url) {
        // 使用正则表达式匹配协议和域名/IP部分
        const regex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^\/\n]+)(.*)/;
        // 使用正则表达式替换匹配的部分
        return url.replace(regex, "$2");
      }

      let layerUrl = ''
      if (_url.includes('/gtserver')) {
        layerUrl = window.htBaseUrl + delUrlIp(_url);
      } else {
        layerUrl = _url
      }
      
      // 航天宏图wmts
      if (
        (layerUrl.includes("mapserver") && layerUrl.includes("WMTS")) ||
        layerUrl.includes("/image/WMTS")
      ) {
        const wmtsUrl = layerUrl.split("/getTile")[0];
        const urlParamsList = wmtsUrl.split("/");
        const layerName = urlParamsList[urlParamsList.length - 2];
        const wmtsGetCapabilitiesUrl = wmtsUrl + "/getCapabilities";
        that.addHtWMTSLayers(wmtsUrl, wmtsGetCapabilitiesUrl, layerName);
      }
      // 航天宏图wfs
      if (layerUrl.includes("mapserver") && layerUrl.includes("WFS")) {
        const wfsUrL = layerUrl;
        const urlParamsList = wfsUrL.split("/");
        const layerName = urlParamsList[urlParamsList.length - 2];
        that.addHtWFSLayers(wfsUrL, layerName);
      }

      // 中地数码
      if (layerUrl.includes("/rest/services/")) {
        const paramsList = layerUrl.split("/rest/services/")[1].split("/");
        const layerName = paramsList[paramsList.length - 2];
        if (layerUrl.includes("WMTS")) {
          that.addZdsmWMTSLayers(layerUrl, layerName);
        }
        if (layerUrl.includes("WFS")) {
          that.addZdsmWFSLayers(layerUrl, layerName);
        }
      }

      // 武大吉奥
      if (layerUrl.includes("/geostar")) {
        if (layerUrl.includes("wmts")) {
          that.addWdjaWMTSLayers(layerUrl);
        }
        if (layerUrl.includes("wfs")) {
          that.addWdjaWFSLayers(layerUrl);
        }
      }
    },

    // 工通过id获取服务信息
    getServiceInfoById(id) {
      const that = this;
      const htUrl = `${window.htBaseUrl}/share/gateway/catalog/byId?cataId=${id}`;
      fetch(htUrl, { credentials: "include" })
        .then(function (response) {
          return response.text();
        })
        .then(function (res) {
          const data = JSON.parse(res);
          if (data.status == 200) {
            if (data.data && data.data.gateway && data.data.gateway.serApiUrl) {
              const _url = data.data.gateway.serApiUrl;
              that.getFunByUrl(_url);
            }
          } else {
            // 调用吉奥查询接口
            that.getServiceInfoByGao(id);
          }
        })
        .catch((error) => {});
    },
    // 通过id获取other服务信息
    getServiceInfoByGao(id) {
      const that = this;
      const url = `https://data.gdgov.cn/index/yzt/ResourcesCenter/resource/viewInfo?id=${id}`;
      function delUrlIp(url) {
        // 使用正则表达式匹配协议和域名/IP部分
        const regex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^\/\n]+)(.*)/;
        // 使用正则表达式替换匹配的部分
        return url.replace(regex, "$2");
      }
      const _url = delUrlIp(url);
      fetch(_url)
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          const data = JSON.parse(text);
          const layerUrl = delUrlIp(data.agencyRpLinkage);
          const wmtsGetCapabilitiesUrl = `${layerUrl}&REQUEST=GetCapabilities&SERVICE=wmts`;
          // 请求图层的元数据
          fetch(wmtsGetCapabilitiesUrl)
            .then(function (response) {
              return response.text();
            })
            .then(function (text) {
              const parser = new ol.format.WMTSCapabilities();
              const result = parser.read(text);
              const layerName = result.Contents.Layer[0].Title;
              const options = ol.source.WMTS.optionsFromCapabilities(result, {
                layer: layerName,
              });
              console.log(options);

              // 设置天地图底图
              const projection = ol.proj.get("EPSG:4326");
              const projectionExtent = projection.getExtent();
              const size = ol.extent.getWidth(projectionExtent) / 256;
              const resolutions = [];
              for (let z = 1; z < 20; ++z) {
                resolutions[z] = size / Math.pow(2, z);
              }
              const matrixIds = Array.from({ length: 17 }, (_, i) =>
                i.toString()
              );

              const _layer = new ol.layer.Tile({
                opacity: 1,
                source: new ol.source.WMTS({
                  url: layerUrl,
                  layer: layerName,
                  matrixSet: options.matrixSet,
                  style: options.style,
                  format: options.format,
                  wrapX: true,
                  tileGrid: new ol.tilegrid.WMTS({
                    origin: ol.extent.getTopLeft(projection.getExtent()),
                    resolutions: resolutions,
                    matrixIds: matrixIds,
                  }),
                }),
              });

              that.map.addLayer(_layer);
            });
        });
    },

    //武大吉奥 wmts
    addWdjaWMTSLayers(layerUrl) {
      // /index/yzt/geostar/GD_2020DLG/wmts
      const that = this;
      const _layerUrl = layerUrl;
      // 请求图层的元数据
      fetch(_layerUrl + "?SERVICE=WMTS&REQUEST=GetCapabilities")
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          const parser = new ol.format.WMTSCapabilities();
          const result = parser.read(text);
          const options = ol.source.WMTS.optionsFromCapabilities(result, {
            layer: result.Contents.Layer[0].Title,
          });

          const projectionExtent = that.getProjection4326().getExtent();
          const size = ol.extent.getWidth(projectionExtent) / 256;
          const resolutions = [];
          for (let z = 7; z < 18; ++z) {
            resolutions[z] = size / Math.pow(2, z);
          }
          const matrixIds = Array.from({ length: 17 }, (_, i) => i.toString());
          const _layer = new ol.layer.Tile({
            source: new ol.source.WMTS({
              url: _layerUrl,
              layer: options.layer,
              style: options.style,
              serviceName: options.layer,
              matrixSet: options.matrixSet,
              format: options.format,
              tileGrid: new ol.tilegrid.WMTS({
                origin: ol.extent.getTopLeft(
                  that.getProjection4326().getExtent()
                ),
                resolutions: resolutions,
                matrixIds: matrixIds,
              }),
              wrapX: false,
            }),
          });
          that.map.addLayer(_layer);
        });
    },

    // 武大吉奥
    addWdjaWFSLayers (layerUrl) {
      const that = this;
      const params = {
        service: "WFS",
        version: "1.1.0",
        request: "GetFeature",
        srsName: "EPSG:4326",
        RESULTTYPE: 'result',
        outputFormat: "GEOJSON",
      };

      let _layerUrl = ''
      if (!layerUrl.includes('/wfs')) {
        _layerUrl = layerUrl + '/wfs'
      } else {
        _layerUrl = layerUrl
      }

      const queryString = Object.keys(params)
        .map((key) => `${key}=${encodeURIComponent(params[key])}`)
        .join("&");
      const fullUrl = `${_layerUrl}?${queryString}`;

      // const lll = '/index/yzt/geostar/GDS2022GJGZTB/wfs?REQUEST=GetFeature&SERVICE=wfs&outputFormat=GEOJSON'

      fetch(fullUrl, { credentials: "include" })
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          console.log(typeof text);
          const json = JSON.parse(text);

          const styles = new ol.style.Style({
            fill: that.fill,
            stroke: that.stroke,
            image: that.image,
          });

          const vectorSource = new ol.source.Vector({
            features: new ol.format.GeoJSON().readFeatures(json),
          });

          const vectorLayer = new ol.layer.Vector({
            source: vectorSource,
            style: styles,
          });

          that.map.addLayer(vectorLayer);

          that.popupObj = new ol.Overlay({
            element: document.getElementById('popup'),
            positioning: "bottom-center",
            stopEvent: true,
          });
          that.map.addOverlay(that.popupObj)
          that.map.on('singleclick', evt => {
            that.feature_Info(evt)
          })
        });
    }
  },
  computed: {},
  watch: {},
  destroyed() {},
};
</script>
<style lang="less" scoped>
.map-content {
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;

  #map {
    height: 100%;
    width: 100%;
  }

  .btns {
    position: absolute;
    right: 1%;
    top: 128px;
    z-index: 10;
    width: 30px;
    min-height: 40px;
    background: #ffffff;
    z-index: 9999;
    border: 2px solid rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    display: flex;
    flex-direction: column;

    div {
      height: 30px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: #000;
      cursor: pointer;

      img {
        height: 20px;
        width: 20px;
      }
    }

    div:first-child {
      border-bottom: 1px solid #ccc;
    }
  }
}

#popup {
  padding-bottom: 15px;
  position: relative;
}

.popup-content {
  padding: 12px;
  max-height: 300px;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  overflow: auto;
  pointer-events: auto;
  background: #ffffff;
  border-radius: 4px;
  border: 1px solid #cccccc;
}

.popup-content::-webkit-scrollbar {  //滚动条整体部分
  width: 10px;
}

.popup-content::-webkit-scrollbar-track { //滚动条的轨道（里面装有Thumb）
  border-radius: 5px;
  background-color: #eee;
}

.popup-content::-webkit-scrollbar-thumb { //滚动条里面的小方块，能向上向下移动（或向左向右移动）
  border-radius: 5px;
  background: #bbbbbb;
}

.triangle {
  position: absolute;
  left: 50%;
  margin-left: -15px;
  bottom: 0;
  height: 30px;
  width: 30px;
  background: #ffffff;
  transform: rotate(45deg)
}
</style>
