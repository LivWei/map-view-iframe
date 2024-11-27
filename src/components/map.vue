<template>
  <div id="map"></div>
</template>

<script>
export default {
  components: {},
  props: {},
  data() {
    return {
      map: null,

      fill: null,
      stroke: null,
      image: null,
    };
  },
  created() {
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
  },
  mounted() {
    this.addBaseMap();

    const catald = this.getUrlParams(window.location.search).catald;
    this.getServiceInfoById(catald);
  },
  methods: {
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
    addHtWMTSLayers(wmtsUrl, wmtsGetCapabilitiesUrl, layerName, serviceCode) {
      const that = this;
      // 请求图层的元数据
      fetch(`${wmtsGetCapabilitiesUrl}?serviceCode=${serviceCode}`)
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
    addHtWFSLayers(wfsUrL, layerName, serviceCode) {
      const that = this;
      const params = {
        service: "WFS",
        version: "1.1.0",
        request: "GetFeature",
        layerName: layerName,
        outputFormat: "application/json",
        maxFeatures: 1000000,
        srsName: "EPSG:4490",
        serviceCode: serviceCode,
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
            featureList.push(format.readFeature(item.geom));
          });

          const vectorLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
              features: featureList,
            }),
            style: styles,
          });

          that.map.addLayer(vectorLayer);
        });
    },

    // 中地数码 WMTS
    addZdsmWMTSLayers(wmtsUrl, layerName, serviceCode) {
      const that = this;
      const url = `${wmtsUrl}?serviceCode=${serviceCode}&token=${window.mapConfig.zdsmToken}`;
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
              serviceCode: serviceCode,
              token: window.mapConfig.zdsmToken,
              wrapX: true,
            }),
          });

          that.map.addLayer(_layer);
        });
    },
    // 中地数码 WFS
    addZdsmWFSLayers(layerUrl, layerName, serviceCode) {
      const that = this;
      const params = {
        service: "WFS",
        version: "1.1.0",
        request: "GetFeature",
        typename: `${layerName}:t0`, // 图层名称，格式为workspace:layer_name
        token: window.mapConfig.zdsmToken,
        serviceCode: serviceCode,
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
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, "text/xml");
          const x2js = new X2JS();
          const json = x2js.xml2json(xmlDoc);
          const jsonList = json.FeatureCollection.featureMembers.t0;

          const styles = new ol.style.Style({
            fill: that.fill,
            stroke: that.stroke,
            image: that.image,
          });

          const featureList = [];

          if (Array.isArray(jsonList)) {
            // 如果是多点
            jsonList.forEach((item) => {
              const lonlat =
                item.the_geom.MultiPoint.pointMember.Point.pos.__text.split(
                  " "
                );
              const lon = Number(lonlat[0]);
              const lat = Number(lonlat[1]);
              const transLonlat = ol.proj.transform(
                [lon, lat],
                that.getProjection4547(),
                that.getProjection4490()
              );
              const Feature = new ol.Feature({
                geometry: new ol.geom.Point(transLonlat),
                name: item["标准名"].__text,
              });
              Feature.setStyle(
                new ol.style.Style({
                  image: that.image,
                  text: new ol.style.Text({
                    text: item["标准名"].__text,
                    offsetY: -5,
                    fill: new ol.style.Fill({ color: "#000000" }),
                  }),
                })
              );
              featureList.push(Feature);
            });
          } else if (jsonList.the_geom) {
            function getCoordinateList(coordinatesStr) {
              // 将坐标字符串分割成数组
              const coordinatesArray = coordinatesStr.split(" ");
              // 将坐标数组转换为经纬度坐标对数组
              const latLongArray = [];
              for (let i = 0; i < coordinatesArray.length; i += 2) {
                if (i + 1 < coordinatesArray.length) {
                  latLongArray.push([
                    parseFloat(coordinatesArray[i]),
                    parseFloat(coordinatesArray[i + 1]),
                  ]);
                }
              }
              // 输出经纬度坐标数组
              // console.log(latLongArray);
              return latLongArray;
            }

            function setFeature(coorStr, lon, lat) {
              const coorList = getCoordinateList(coorStr);

              const PolygonList = [];
              coorList.forEach((m) => {
                PolygonList.push(
                  ol.proj.transform(
                    [m[lon], m[lat]],
                    that.getProjection4547(),
                    that.getProjection4490()
                  )
                );
              });

              const Feature = new ol.Feature({
                geometry: new ol.geom.Polygon([PolygonList]),
              });

              Feature.setStyle(styles);
              featureList.push(Feature);
            }

            // 如果是多面
            const surfaceList = jsonList.the_geom.MultiSurface.surfaceMember;
            surfaceList.forEach((item) => {
              if (item.Polygon.exterior) {
                const coorStr = item.Polygon.exterior.LinearRing.posList.__text;
                setFeature(coorStr, 0, 1);
              }
              if (item.Polygon.interior) {
                if (Array.isArray(item.Polygon.interior)) {
                  item.Polygon.interior.forEach((m) => {
                    const coorStr = m.LinearRing.posList.__text;
                    setFeature(coorStr, 1, 0);
                  });
                } else {
                  const coorStr =
                    item.Polygon.interior.LinearRing.posList.__text;
                  setFeature(coorStr, 1, 0);
                }
              }
            });
          }

          const vectorLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
              features: featureList,
            }),
            style: styles,
          });

          that.map.addLayer(vectorLayer);
        });
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
          let serviceCode = "";
          if (data.status == 200) {
            serviceCode = data.data.gateway.serviceCode;
            if (data.data && data.data.gateway && data.data.gateway.serApiUrl) {
              const _url = data.data.gateway.serApiUrl;
              function delUrlIp(url) {
                // 使用正则表达式匹配协议和域名/IP部分
                const regex =
                  /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^\/\n]+)(.*)/;
                // 使用正则表达式替换匹配的部分
                return url.replace(regex, "$2");
              }
              const layerUrl = window.htBaseUrl + delUrlIp(_url);
              // 航天宏图wmts
              if (
                (layerUrl.includes("mapserver") && layerUrl.includes("WMTS")) ||
                layerUrl.includes("/image/WMTS")
              ) {
                const wmtsUrl = layerUrl.split("/getTile")[0];
                const urlParamsList = wmtsUrl.split("/");
                const layerName = urlParamsList[urlParamsList.length - 2];
                const wmtsGetCapabilitiesUrl = wmtsUrl + "/getCapabilities";
                that.addHtWMTSLayers(
                  wmtsUrl,
                  wmtsGetCapabilitiesUrl,
                  layerName,
                  serviceCode
                );
              }
              // 航天宏图wfs
              if (layerUrl.includes("mapserver") && layerUrl.includes("WFS")) {
                const wfsUrL = layerUrl;
                const urlParamsList = wfsUrL.split("/");
                const layerName = urlParamsList[urlParamsList.length - 2];
                that.addHtWFSLayers(wfsUrL, layerName, serviceCode);
              }

              // 中地数码
              if (layerUrl.includes("/rest/services/")) {
                const paramsList = layerUrl
                  .split("/rest/services/")[1]
                  .split("/");
                const layerName = paramsList[paramsList.length - 2];
                if (layerUrl.includes("WMTS")) {
                  that.addZdsmWMTSLayers(layerUrl, layerName, serviceCode);
                }
                if (layerUrl.includes("WFS")) {
                  that.addZdsmWFSLayers(layerUrl, layerName, serviceCode);
                }
              }
            }
          } else {
            // 调用吉奥查询接口
            that.getServiceInfoByGao(id);
          }
        })
        .catch((error) => {
        });
    },
    // 通过id获取吉奥服务信息
    getServiceInfoByGao(id) {
      const that = this
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
              const layerName = result.Contents.Layer[0].Title
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
  },
  computed: {},
  watch: {},
  destroyed() {},
};
</script>
<style lang="less" scoped></style>
