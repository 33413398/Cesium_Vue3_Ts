import { defineStore } from 'pinia'
import * as Cesium from "cesium"

// useStore 可以是 useUser、useCart 之类的任何东西
// 第一个参数是应用程序中 store 的唯一 id
export default defineStore('mapStore', {
  /// 推荐使用 完整类型推断的箭头函数
  state: () => {
    return {
      // 所有这些属性都将自动推断其类型
      viewer: null as Cesium.Viewer | null,
      velocityVectorProperty: null as any,
      velocityVector: null as any,
    }
  },
  actions: {
    // 创建地图实例
    createViewer() {
      // 申请token地址： https://ion.cesium.com/tokens?page=1
      Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhYWM0YzcwMS1lOTQyLTRmZGUtYjI4NC04OTEwNzkwNjhlOGMiLCJpZCI6MTA5Mjg4LCJpYXQiOjE2NjQyMDY2Mzd9.3NK8SNjCMd8chjFa-lhZhvnoTmbaFDvmwnMDGTLi0o8';
      // 天地图Key
      const tdtKey = '003d28b20e1054d1e0bbf1039a2c5596'
      this.viewer = new Cesium.Viewer("map", {
        animation: false, // 是否开启动画
        infoBox: false, // 禁用沙箱，不显示图形信息，解决控制台报错
        baseLayerPicker: false, // 隐藏默认地图
        fullscreenButton: false, // 全屏按钮是否显示
        geocoder: false, //是否显示搜索组件
        homeButton: false, // 是否显示主页按钮
        requestRenderMode: false, // 启用请求渲染模式
        useBrowserRecommendedResolution: true, //是否使用浏览器推荐的分辨率
        // maximumRenderTimeChange: Infinity, // 无操作时自动渲染帧率，设为数字会消耗性能，Infinity为无操作不渲染
        sceneModePicker: false, // 是否显示 3D/2D 切换按钮
        navigationHelpButton: false, // 是否显示导航帮助按钮
        timeline: false, // 是否显示时间线
        selectionIndicator: false, // 是否显示选取指示器组件
        shouldAnimate: true, // 自动播放动画控件
        shadows: false, // 是否显示光照投影的阴影
        // 地图投影底图
        // terrainProvider: new Cesium.CesiumTerrainProvider({ 
        //   url: Cesium.IonResource.fromAssetId(3957), // id 加载
        // }),
        imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
          url: "http://t0.tianditu.gov.cn/vec_w/wmts?tk=" + tdtKey,
          layer: "vec",
          style: "default",
          tileMatrixSetID: "w",
          format: "tiles",
          maximumLevel: 18,
        }),
      })
      // 解决文字标注不清晰问题
      this.viewer.scene.postProcessStages.fxaa.enabled = true
      // 隐藏太阳和月亮
      this.viewer.scene.sun.show = false
      this.viewer.scene.moon.show = false
      // 暗色系
      // this.viewer.imageryLayers.get(0).hue = 6.5;  // 图层色调
      // this.viewer.imageryLayers.get(0).contrast = -1.2
      this.viewer.imageryLayers.addImageryProvider(new Cesium.WebMapTileServiceImageryProvider({
        url: "http://t{s}.tianditu.gov.cn/ibo_w/wmts?tk=" + tdtKey,
        layer: "ibo",
        style: "default",
        tileMatrixSetID: "w",
        format: "tiles",
        maximumLevel: 18,
        subdomains: ['0', '1', '2', '3', '4', '5', '6', '7']
      }))
      this.viewer.imageryLayers.addImageryProvider(new Cesium.WebMapTileServiceImageryProvider({
        url: "http://t0.tianditu.gov.cn/cva_w/wmts?tk=" + tdtKey,
        layer: "cva",
        style: "default",
        tileMatrixSetID: "w",
        format: "tiles",
        maximumLevel: 18
      }))

      this.viewer.scene.highDynamicRange = false

      // 更换右键和中键
      this.viewer.scene.screenSpaceCameraController.tiltEventTypes = [
        Cesium.CameraEventType.RIGHT_DRAG,
        Cesium.CameraEventType.PINCH,
        {
          eventType: Cesium.CameraEventType.LEFT_DRAG,
          modifier: Cesium.KeyboardEventModifier.CTRL
        },
        {
          eventType: Cesium.CameraEventType.RIGHT_DRAG,
          modifier: Cesium.KeyboardEventModifier.CTRL
        }
      ]
      this.viewer.scene.screenSpaceCameraController.zoomEventTypes = [
        Cesium.CameraEventType.WHEEL,
        Cesium.CameraEventType.PINCH
      ]

      this.viewer.scene.screenSpaceCameraController.zoomEventTypes = [Cesium.CameraEventType.MIDDLE_DRAG, Cesium.CameraEventType.WHEEL, Cesium.CameraEventType.PINCH]
      // 添加摄像机视角改动监控
      const _this: any = this
      this.viewer.camera.changed.addEventListener(function () {
        console.log("当前中心坐标: [" +
          Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(_this.viewer.camera.position).longitude) + ", " +
          Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(_this.viewer.camera.position).latitude) + "]");
        console.log("当前视角高度: " + Cesium.Cartographic.fromCartesian(_this.viewer.camera.position).height);
        console.log("当前视角角度:" + Cesium.Math.toDegrees(_this.viewer.camera.pitch));
      });
      // 添加建筑物模型
      const tileset = this.viewer.scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: Cesium.IonResource.fromAssetId(96188)
        })
      )
      // 添加鼠标事件
      const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)
      handler.setInputAction(function (movement) {
        const pick = _this.viewer.scene.pick(movement.position);
        if (Cesium.defined(pick)) { // 若多个元素可加判断id  pick.id.id === 'id'
          alert('点击了')
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    },
    // 定位到指定区域
    setMapLocatingSignals(coordinate: number[], type: string = 'flyTo', more: boolean = false) {
      if (!this.viewer) {
        console.error('请先初始化地图！');
        return
      }

      let position: any = Cesium.Cartesian3.fromDegrees(coordinate[0], coordinate[1], coordinate[2]);
      if (more) {
        position = Cesium.Cartesian3.fromDegreesArray(coordinate);
      }
      if (type === 'flyTo') {
        // 带动画
        this.viewer.camera.flyTo({
          destination: position,
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0
          },
          duration: 2 // 动画持续 秒
        })
      } else {
        // 无动画，直接跳转
        this.viewer.camera.setView({
          destination: position,
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0
          }
        })
      }
    },
    // 打点
    createPoint(coordinate: number[]) {
      if (!this.viewer) {
        console.error('请先初始化地图！');
        return
      }
      this.clearMap()
      const position = Cesium.Cartesian3.fromDegrees(coordinate[0], coordinate[1], coordinate[2]);
      const entity = this.viewer.entities.add({
        position: position,
        point: {
          pixelSize: 15,
          color: new Cesium.Color(1, 0, 0, 1)
        },
        description: '<div>我是点弹窗</div>'
      });

    },
    // 绘制线
    createLine(coordinate: number[]) {
      if (!this.viewer) {
        console.error('请先初始化地图！');
        return
      }
      this.clearMap()
      const entity = this.viewer.entities.add({
        polyline: {
          show: true,
          positions: Cesium.Cartesian3.fromDegreesArray(coordinate),
          width: 5,
          material: new Cesium.Color(0, 0, 1, 1)
        },
        description: '<div>我是线弹窗</div>'
      });

    },
    // 绘制面
    createPlane(coordinate: number[]) {
      if (!this.viewer) {
        console.error('请先初始化地图！');
        return
      }
      this.clearMap()
      const position = Cesium.Cartesian3.fromDegrees(coordinate[0], coordinate[1], coordinate[2]);
      const entity = this.viewer.entities.add({
        position: position,
        plane: {
          plane: new Cesium.Plane(Cesium.Cartesian3.UNIT_Z, 0.0), // 面得朝向--笛卡尔坐标
          dimensions: new Cesium.Cartesian2(400, 300), // 宽高
          material: Cesium.Color.RED.withAlpha(0.5), // 面颜色
          outline: true, // 显示边框
          outlineColor: Cesium.Color.BLACK // 线颜色
        },
        description: '<div>我是面弹窗</div>'
      });

    },
    // 绘制文本
    createText(coordinate: number[]) {
      if (!this.viewer) {
        console.error('请先初始化地图！');
        return
      }
      this.clearMap()
      const position = Cesium.Cartesian3.fromDegrees(coordinate[0], coordinate[1], coordinate[2]);
      const entity = this.viewer.entities.add({
        position: position,
        label: {
          text: "我是文本",
          font: "50px Helvetica",
          fillColor: Cesium.Color.SKYBLUE
        }
      });

    },
    // 绘制多边形
    createPolygon(coordinate: number[]) {
      if (!this.viewer) {
        console.error('请先初始化地图！');
        return
      }
      this.clearMap()
      const entity = this.viewer.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(coordinate),
          material: Cesium.Color.RED,
          extrudedHeight: 200, // 垂直方向拉伸实现立体效果
        },
        description: '<div>我是多边形弹窗</div>'
      });

    },
    // 绘制模型
    createModel(coordinate: number[], url: string, height: number) {
      if (!this.viewer) {
        console.error('请先初始化地图！');
        return
      }
      this.clearMap()
      this.viewer.entities.removeAll();

      const position = Cesium.Cartesian3.fromDegrees(
        coordinate[0], coordinate[1],
        height
      );
      const heading = Cesium.Math.toRadians(135);
      const pitch = 0;
      const roll = 0;
      const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
      const orientation = Cesium.Transforms.headingPitchRollQuaternion(
        position,
        hpr
      );

      const entity = this.viewer.entities.add({
        name: url,
        position: position,
        orientation: orientation,
        model: {
          uri: url,
          minimumPixelSize: 128,
          maximumScale: 20000,
        },
        description: '<div>我是模型弹窗</div>'
      });
      this.viewer.trackedEntity = entity;
    },
    // 绘制移动模型
    createMoveModel(coordinate: number[]) {
      if (!this.viewer) {
        console.error('请先初始化地图！');
        return
      }
      this.clearMap()
      const _this: any = this
      const scene = this.viewer.scene;
      const position = Cesium.Cartesian3.fromDegrees(
        coordinate[0],
        coordinate[1]
      );
      const url = "/models/CesiumMan/Cesium_Man.glb";
      const entity = (this.viewer.trackedEntity = this.viewer.entities.add({
        name: url,
        position: position,
        model: {
          uri: url,
          minimumPixelSize: 128,
          maximumScale: 20000,
        },
        description: '<div>我是移动模型弹窗</div>'
      }));

      // Shade selected model with highlight.
      const fragmentShaderSource = `
        uniform sampler2D colorTexture;
        varying vec2 v_textureCoordinates;
        uniform vec4 highlight;
        void main() {
            vec4 color = texture2D(colorTexture, v_textureCoordinates);
            if (czm_selected()) {
                vec3 highlighted = highlight.a * highlight.rgb + (1.0 - highlight.a) * color.rgb;
                gl_FragColor = vec4(highlighted, 1.0);
            } else { 
                gl_FragColor = color;
            }
        }
        `;

      const stage = scene.postProcessStages.add(
        new Cesium.PostProcessStage({
          fragmentShader: fragmentShaderSource,
          uniforms: {
            highlight: function () {
              return new Cesium.Color(1.0, 0.0, 0.0, 0.5);
            },
          },
        })
      );
      stage.selected = [];

      const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
      handler.setInputAction(function (movement: any) {
        const pickedObject = _this.viewer.scene.pick(movement.endPosition);
        if (Cesium.defined(pickedObject)) {
          stage.selected = [pickedObject.primitive];
        } else {
          stage.selected = [];
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    },
    // 清除图层
    clearMap() {
      this.viewer && this.viewer.entities.removeAll()
    }
  },
  getters: {
    getViewer: (state) => state.viewer,
  },
})