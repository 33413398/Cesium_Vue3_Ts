let Cesium = null
let dfSt = undefined
/**
 * 外部插件模块
 * @param {*} viewer
 */
function Plugin(viewer, cesiumGlobal, defaultStatic) {
  if (viewer) {
    this._viewer = viewer
    Cesium = cesiumGlobal
    dfSt = defaultStatic
    this._pluginLayer = new Cesium.CustomDataSource('pluginLayer')

    viewer && viewer.dataSources.add(this._pluginLayer)

    this._installPlugin()
  }
}

Plugin.prototype = {
  // 安装插件
  _installPlugin: function () {
    this._installCss3Renderer()
    this._installTerrainClipPlan()
  },
  /**
   * 地形裁剪
   */
  _installTerrainClipPlan: function () {
    function TerrainClipPlan(t, i) {
      ;(this.viewer = t),
        (this.options = i || {}),
        (this._positions = i.positions),
        (this._height = this.options.height || 0),
        (this.bottomImg = i.bottomImg),
        (this.wallImg = i.wallImg),
        (this.splitNum = Cesium.defaultValue(i.splitNum, 50)),
        this._positions &&
          this._positions.length > 0 &&
          this.updateData(this._positions)
    }

    Object.defineProperties(TerrainClipPlan.prototype, {
      show: {
        get: function () {
          return this._show
        },
        set: function (e) {
          ;(this._show = e),
            this.viewer.scene.globe.clippingPlanes &&
              (this.viewer.scene.globe.clippingPlanes.enabled = e),
            this._switchExcavate(e)
        }
      },

      height: {
        get: function () {
          return this._height
        },
        set: function (e) {
          ;(this._height = e), this._updateExcavateDepth(e)
        }
      }
    })
    TerrainClipPlan.prototype.updateData = function (e) {
      // this.clear()
      var t = [],
        i = e.length - 1,
        a = new Cesium.Cartesian3(),
        n = Cesium.Cartesian3.subtract(e[0], e[1], a)
      ;(n = n.x > 0), (this.excavateMinHeight = 9999)
      for (var r = 0; r < i; r++) {
        var s = (r + 1) % i,
          l = Cesium.Cartesian3.midpoint(e[r], e[s], new Cesium.Cartesian3()),
          u = Cesium.Cartographic.fromCartesian(e[r]),
          c = this.viewer.scene.globe.getHeight(u) || u.height
        c < this.excavateMinHeight && (this.excavateMinHeight = c)
        var d,
          h = Cesium.Cartesian3.normalize(l, new Cesium.Cartesian3())
        ;(d = n
          ? Cesium.Cartesian3.subtract(e[r], l, new Cesium.Cartesian3())
          : Cesium.Cartesian3.subtract(e[s], l, new Cesium.Cartesian3())),
          (d = Cesium.Cartesian3.normalize(d, d))
        var f = Cesium.Cartesian3.cross(d, h, new Cesium.Cartesian3())
        f = Cesium.Cartesian3.normalize(f, f)
        var p = new Cesium.Plane(f, 0),
          m = Cesium.Plane.getPointDistance(p, l)
        t.push(new Cesium.ClippingPlane(f, m))
      }

      ;(this.viewer.scene.globe.clippingPlanes = new Cesium.ClippingPlaneCollection(
        {
          planes: t,
          edgeWidth: 1,
          edgeColor: Cesium.Color.WHITE,
          enabled: !0
        }
      )),
        this._prepareWell(e),
        this._createWell(this.wellData)
    }

    TerrainClipPlan.prototype.clear = function () {
      this.viewer.scene.globe.clippingPlanes &&
        ((this.viewer.scene.globe.clippingPlanes.enabled = !1),
        this.viewer.scene.globe.clippingPlanes.removeAll(),
        this.viewer.scene.globe.clippingPlanes.isDestroyed() ||
          this.viewer.scene.globe.clippingPlanes.destroy()),
        (this.viewer.scene.globe.clippingPlanes = void 0),
        this.bottomSurface &&
          this.viewer.scene.primitives.remove(this.bottomSurface),
        this.wellWall && this.viewer.scene.primitives.remove(this.wellWall),
        delete this.bottomSurface,
        delete this.wellWall,
        this.viewer.scene.render()
    }

    TerrainClipPlan.prototype._prepareWell = function (e) {
      var t = this.splitNum,
        i = e.length
      if (0 != i) {
        for (
          var a = this.excavateMinHeight - this.height,
            n = [],
            r = [],
            s = [],
            l = 0;
          l < i;
          l++
        ) {
          var u = l == i - 1 ? 0 : l + 1,
            c = Cesium.Cartographic.fromCartesian(e[l]),
            d = Cesium.Cartographic.fromCartesian(e[u]),
            h = [c.longitude, c.latitude],
            f = [d.longitude, d.latitude]

          0 == l &&
            (s.push(new Cesium.Cartographic(h[0], h[1])),
            r.push(Cesium.Cartesian3.fromRadians(h[0], h[1], a)),
            n.push(Cesium.Cartesian3.fromRadians(h[0], h[1], 0)))

          for (var p = 1; p <= t; p++) {
            var m = Cesium.Math.lerp(h[0], f[0], p / t),
              g = Cesium.Math.lerp(h[1], f[1], p / t)
            ;(l == i - 1 && p == t) ||
              (s.push(new Cesium.Cartographic(m, g)),
              r.push(Cesium.Cartesian3.fromRadians(m, g, a)),
              n.push(Cesium.Cartesian3.fromRadians(m, g, 0)))
          }
        }
        this.wellData = {
          lerp_pos: s,
          bottom_pos: r,
          no_height_top: n
        }
      }
    }

    TerrainClipPlan.prototype._createWell = function (e) {
      if (this.viewer.terrainProvider._layers) {
        var t = this
        this._createBottomSurface(e.bottom_pos)
        var i = Cesium.sampleTerrainMostDetailed(
          this.viewer.terrainProvider,
          e.lerp_pos
        )
        Cesium.when(i, function (i) {
          for (var a = i.length, n = [], r = 0; r < a; r++) {
            var s = Cesium.Cartesian3.fromRadians(
              i[r].longitude,
              i[r].latitude,
              i[r].height
            )
            n.push(s)
          }
          t._createWellWall(e.bottom_pos, n)
        })
      } else {
        this._createBottomSurface(e.bottom_pos)
        this._createWellWall(e.bottom_pos, e.no_height_top)
      }
    }

    TerrainClipPlan.prototype._getMinHeight = function (e) {
      let minHeight = 5000000
      let minPoint = null
      for (let i = 0; i < e.length; i++) {
        let height = e[i]['z']
        if (height < minHeight) {
          minHeight = height
          minPoint = this._ellipsoidToLonLat(e[i])
        }
      }
      return minPoint.altitude
    }

    TerrainClipPlan.prototype._ellipsoidToLonLat = function (c) {
      let ellipsoid = this.viewer.scene.globe.ellipsoid
      let cartesian3 = new Cesium.Cartesian3(c.x, c.y, c.z)
      let cartographic = ellipsoid.cartesianToCartographic(cartesian3)
      let lat = Cesium.Math.toDegrees(cartographic.latitude)
      let lng = Cesium.Math.toDegrees(cartographic.longitude)
      let alt = cartographic.height
      return {
        longitude: lng,
        latitude: lat,
        altitude: alt
      }
    }
    TerrainClipPlan.prototype._createBottomSurface = function (e) {
      if (e.length) {
        let minHeight = this._getMinHeight(e)
        let positions = []
        for (let i = 0; i < e.length; i++) {
          let p = this._ellipsoidToLonLat(e[i])
          positions.push(p.longitude)
          positions.push(p.latitude)
          positions.push(minHeight)
        }

        let polygon = new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArrayHeights(positions)
          ),
          perPositionHeight: true
        })
        let geometry = Cesium.PolygonGeometry.createGeometry(polygon)

        var i = new Cesium.Material({
            fabric: {
              type: 'Image',
              uniforms: {
                image: this.bottomImg
              }
            }
          }),
          a = new Cesium.MaterialAppearance({
            translucent: !1,
            flat: !0,
            material: i
          })
        ;(this.bottomSurface = new Cesium.Primitive({
          geometryInstances: new Cesium.GeometryInstance({
            geometry: geometry
          }),
          appearance: a,
          asynchronous: !1
        })),
          this.viewer.scene.primitives.add(this.bottomSurface)
      }
    }

    TerrainClipPlan.prototype._createWellWall = function (e, t) {
      let minHeight = this._getMinHeight(e)
      let maxHeights = []
      let minHeights = []
      for (let i = 0; i < t.length; i++) {
        maxHeights.push(this._ellipsoidToLonLat(t[i]).altitude)
        minHeights.push(minHeight)
      }
      let wall = new Cesium.WallGeometry({
        positions: t,
        maximumHeights: maxHeights,
        minimumHeights: minHeights
      })
      let geometry = Cesium.WallGeometry.createGeometry(wall)
      var a = new Cesium.Material({
          fabric: {
            type: 'Image',
            uniforms: {
              image: this.wallImg
            }
          }
        }),
        n = new Cesium.MaterialAppearance({
          translucent: !1,
          flat: !0,
          material: a
        })
      ;(this.wellWall = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: geometry,
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              Cesium.Color.GREY
            )
          },
          id: 'PitWall'
        }),
        appearance: n,
        asynchronous: !1
      })),
        this.viewer.scene.primitives.add(this.wellWall)
    }
    TerrainClipPlan.prototype._switchExcavate = function (e) {
      e
        ? ((this.viewer.scene.globe.material = Cesium.Material.fromType(
            'WaJue'
          )),
          (this.wellWall.show = !0),
          (this.bottomSurface.show = !0))
        : ((this.viewer.scene.globe.material = null),
          (this.wellWall.show = !1),
          (this.bottomSurface.show = !1))
    }

    TerrainClipPlan.prototype._updateExcavateDepth = function (e) {
      this.bottomSurface &&
        this.viewer.scene.primitives.remove(this.bottomSurface),
        this.wellWall && this.viewer.scene.primitives.remove(this.wellWall)
      for (
        var t = this.wellData.lerp_pos, i = [], a = t.length, n = 0;
        n < a;
        n++
      )
        i.push(
          Cesium.Cartesian3.fromRadians(
            t[n].longitude,
            t[n].latitude,
            this.excavateMinHeight - e
          )
        )
      ;(this.wellData.bottom_pos = i),
        this._createWell(this.wellData),
        this.viewer.scene.primitives.add(this.bottomSurface),
        this.viewer.scene.primitives.add(this.wellWall)
    }

    Cesium.Scene.TerrainClipPlan = TerrainClipPlan
  },
  // 灯光扫描插件
  buildLightScanGraphics: function (data) {
    if (this._viewer && data) {
      var $this = this
      //生成 entityCList面--形成圆锥
      var createLightScan_entityCList = function (point, data) {
        var lon = data.observer[0],
          lat = data.observer[1],
          h = data.observer[2]
        var entityCList = []
        //创建 面
        for (var i = 0; i < point.length; i++) {
          var hierarchy
          if (i === point.length - 1) {
            hierarchy = new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArrayHeights([
                lon,
                lat,
                h,
                point[i].x,
                point[i].y,
                0,
                point[0].x,
                point[0].y,
                0
              ])
            )
          } else {
            hierarchy = new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArrayHeights([
                lon,
                lat,
                h,
                point[i].x,
                point[i].y,
                0,
                point[i + 1].x,
                point[i + 1].y,
                0
              ])
            )
          }

          var entityC = $this._pluginLayer.entities.add({
            name: '三角形',
            polygon: {
              hierarchy: hierarchy,
              outline: false,
              perPositionHeight: true, //允许三角形使用点的高度
              material: data.material
            }
          })
          entityCList.push(entityC)
        }

        return entityCList
      }
      /**
       * 改变每个面的位置
       * @param {*} data
       * @param {*} entity
       * @param {*} arr
       */
      var createLightScan_changeOnePosition = function (data, entity, arr) {
        var positionList = data.positionList
        var x,
          y,
          x0,
          y0,
          X0,
          Y0,
          n = 0,
          a = 0 //x代表差值 x0代表差值等分后的值，X0表示每次回调改变的值。a表示回调的循环窜次数，n表示扫描的坐标个数
        function f(i) {
          x = positionList[i + 1][0] - positionList[i][0] //差值
          y = positionList[i + 1][1] - positionList[i][1] //差值
          x0 = x / data.number //将差值等分500份
          y0 = y / data.number
          a = 0
        }

        f(n)
        entity.polygon.hierarchy = new Cesium.CallbackProperty(function () {
          //回调函数
          if (Math.abs(X0) >= Math.abs(x) && Math.abs(Y0) >= Math.abs(y)) {
            //当等分差值大于等于差值的时候 就重新计算差值和等分差值  Math.abs
            n = n + 1
            if (n === positionList.length - 1) {
              n = 0
            }
            arr[0] = arr[0] + X0
            arr[1] = arr[1] + Y0
            arr[2] = arr[2] + X0
            arr[3] = arr[3] + Y0
            f(n) //重新赋值 x y x0 y0
          }
          X0 = a * x0 //将差值的等份逐渐递增。直到大于差值 会有精度丢失,所以扩大再加 x0=x0+0.0001
          Y0 = a * y0 //将差值的等份逐渐递增。直到大于差值 会有精度丢失,所以扩大再加
          a++
          return new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArrayHeights([
              data.observer[0],
              data.observer[1],
              data.observer[2],
              arr[0] + X0,
              arr[1] + Y0,
              0,
              arr[2] + X0,
              arr[3] + Y0,
              0
            ])
          )
        }, false)
      }

      //生成分割点
      var point = $this._getCirclePoints(
        data.circle[0],
        data.circle[1],
        data.circle[2],
        data.circle[3]
      ) //生成分割点
      //生成 entityCList 圆锥
      var entityCList = createLightScan_entityCList(point, data) //生成 entityCList 圆锥

      for (var i = 0; i < entityCList.length; i++) {
        if (i !== entityCList.length - 1) {
          createLightScan_changeOnePosition(data, entityCList[i], [
            point[i].x,
            point[i].y,
            point[i + 1].x,
            point[i + 1].y
          ]) //中间arr 代表的是点的坐标
        } else {
          createLightScan_changeOnePosition(data, entityCList[i], [
            point[i].x,
            point[i].y,
            point[0].x,
            point[0].y
          ])
        }
      }
      return entityCList
    }
  },
  // 路径漫游
  buildPathRoaming: function (options) {
    if (this._viewer && options && options.paths) {
      var _paths = options.paths,
        _rEntity = this.createGraphics()
      // 添加图形
      var polyline = []
      for (var i = 0; i < _paths.length; i++) {
        var cartesian = Cesium.Cartesian3.fromDegrees(
          Number(_paths[i].lng),
          Number(_paths[i].lat),
          Number(_paths[i].alt)
        )
        polyline.push(cartesian)
      }
      _rEntity.position = this._createSampledPosition(polyline)
      _rEntity.name = options.name || '路径漫游'
      _rEntity.availability = new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({
          start: this.startTime,
          stop: this.stopTime
        })
      ]) // 和时间轴关联

      _rEntity.orientation = this._sampleOrientation() //基于位置移动自动计算方向

      if (options.polyline) {
        const { width, material, clampToGround, ...resOpt } = options.polyline
        _rEntity.polyline = {
          positions: new Cesium.CallbackProperty(function () {
            return polyline
          }, false),
          width: width || 10,
          material:
            material ||
            new Cesium.PolylineGlowMaterialProperty({
              glowPower: 1,
              color: Cesium.Color.RED
            }),
          clampToGround: clampToGround || true,
          resOpt
        }
      }

      if (options.model) {
        _rEntity.model = this.getModelGraphics(options.model)
      }

      if (options.label) {
        _rEntity.label = this.getLabelGraphics(options)
      }
      if (options.billboard) {
        _rEntity.billboard = this.getBillboardGraphics(options)
      }
      this.droneEntity = _rEntity
      this._beginRoamTrace(options)
      return this._viewer.entities.add(_rEntity)
    }
  },
  _beginRoamTrace(options) {
    // 再绘制的每一帧中监听实体位置修改相机xyzw值
    this._viewer.clock.onTick.addEventListener(() => {
      if (this._viewer.clock.shouldAnimate) {
        let currentTime = this._viewer.clock.currentTime
        // 当前实体的位置
        let position = this.droneEntity.position.getValue(currentTime)
        //  当前实体的朝向
        let orientation = this.droneEntity.orientation.getValue(currentTime)
        if (position && orientation) {
          //计算相机的四维矩阵
          let transform = Cesium.Matrix4.fromRotationTranslation(
            Cesium.Matrix3.fromQuaternion(orientation),
            position
          )
          this._viewer.camera.lookAtTransform(transform, options.cameraOffset())
        }
      }
    })
  },
  _createSampledPosition(positions) {
    // 起始时间
    this.startTime = Cesium.JulianDate.now()
    // 结束时间（长度*60）计算总时长
    this.stopTime = Cesium.JulianDate.addSeconds(
      this.startTime,
      positions.length * 60,
      new Cesium.JulianDate()
    )
    // 设置时钟开始时间
    this._viewer.clock.startTime = this.startTime.clone()
    // 设置始终停止时间
    this._viewer.clock.stopTime = this.stopTime.clone()
    // 设置时钟当前时间
    this._viewer.clock.currentTime = this.startTime.clone()
    //循环执行,即为2，到达终止时间，重新从起点时间开始
    this._viewer.clock.clockRange = Cesium.ClockRange.CLAMPED
    // 创建取样对象
    let property = new Cesium.SampledPositionProperty()
    // 设置到达每一个位置点所需要的时间（秒）
    for (let j = 0; j < positions.length; j++) {
      let time = Cesium.JulianDate.addSeconds(
        this.startTime,
        j * 60,
        new Cesium.JulianDate()
      )
      let position = positions[j]
      property.addSample(time, position)
    }
    return property
  },
  _sampleOrientation() {
    let positionA
    let positionB
    let orientationCurr
    return new Cesium.CallbackProperty((currentTime) => {
      let position = this.droneEntity.position.getValue(currentTime)
      //下一帧的位置，计算出一秒钟六十帧的时间时所处位置
      positionB = this.droneEntity.position.getValue(
        Cesium.JulianDate.addSeconds(
          currentTime,
          1 / 60,
          new Cesium.JulianDate()
        )
      )
      if (position && positionB) {
        positionA = position
        //向量AB差获得朝向
        const vector2 = Cesium.Cartesian3.subtract(
          positionB,
          positionA,
          new Cesium.Cartesian3()
        )
        //归一化获得单位向量（方向）
        const normal = Cesium.Cartesian3.normalize(
          vector2,
          new Cesium.Cartesian3()
        )
        //将位置和速度转换为旋转矩阵
        const rotationMatrix3 = Cesium.Transforms.rotationMatrixFromPositionVelocity(
          positionA,
          normal,
          Cesium.Ellipsoid.WGS84
        )
        // 使用旋转矩阵转换思维矩阵设置实体真实朝向与位置
        orientationCurr = Cesium.Quaternion.fromRotationMatrix(rotationMatrix3)
      }
      return orientationCurr
    }, false)
  },
  /**
   * 拓展css3的动画 html元素
   */
  _installCss3Renderer: function () {
    /**
     * 添加css3 html元素
     * @param app
     * @param elements
     * @param isBackHide
     * @constructor
     */
    if (this._viewer) {
      var viewer = this._viewer

      function Css3Renderer(elements, isBackHide) {
        this._scratch = new Cesium.Cartesian2()
        this._viewer = viewer
        ;(this._scene = viewer.scene), (this._camera = viewer.camera)

        this._container = null
        this._elements = elements
        this._isBackHide = isBackHide

        this.init()
      }
      Css3Renderer.prototype.init = function () {
        var container = document.createElement('div')
        container.className = `ys-css3-container`
        // document.body.appendChild(container)
        document.getElementById('info-warp').appendChild(container)
        this._container = container

        this._elements.forEach(function (e) {
          container.insertAdjacentHTML('beforeend', e.element)
        })
        var $this = this
        this._scene.preRender.addEventListener(function () {
          //
          for (var i = 0; i < container.children.length; i++) {
            var p = Cesium.Cartesian3.fromDegrees(
              $this._elements[i].position[0],
              $this._elements[i].position[1],
              $this._elements[i].position[2] || 0
            )
            var canvasPosition = $this._scene.cartesianToCanvasCoordinates(
              p,
              $this._scratch
            )
            if (Cesium.defined(canvasPosition)) {
              container.children[i].style.left =
                parseFloat(canvasPosition.x) +
                parseFloat($this._elements[i].offset[0]) +
                'px'
              container.children[i].style.top =
                parseFloat(canvasPosition.y) +
                parseFloat($this._elements[i].offset[1]) +
                'px'
              if ($this._isBackHide) {
                var j = $this._camera.position,
                  n = $this._scene.globe.ellipsoid.cartesianToCartographic(j)
                    .height
                if (
                  !((n += 1 * $this._scene.globe.ellipsoid.maximumRadius),
                  Cesium.Cartesian3.distance(j, p) > n)
                ) {
                  container.children[i].style.display = 'block'
                } else {
                  container.children[i].style.display = 'none'
                }
              }
            }
          }
        })
      }
      Css3Renderer.prototype.remove = function (id) {
        this._elements = this._elements.filter(function (e) {
          e.id !== id
        })
        this._container.removeChild(document.getElementById(id))
      }

      Css3Renderer.prototype.append = function (object) {
        this._elements.push(object)
        this._container.insertAdjacentHTML('beforeend', object.element)
      }

      Css3Renderer.prototype.removeEntityLayer = function (id) {
        this._viewer.entities.removeById(id + '_1')
        this._viewer.entities.removeById(id + '_2')
        this._viewer.entities.removeById(id + '_3')
        this.remove(id)
      }

      Css3Renderer.prototype.addEntityLayer = function (object) {
        var lon = object.position[0],
          lat = object.position[1],
          sStartFlog = false,
          $this = this,
          s1 = 0.001,
          s2 = s1,
          s3 = s1,
          s4 = s1
        setTimeout(function (sStartFlog) {
          sStartFlog = true
        }, 300)
        var rotation = Cesium.Math.toRadians(30)
        var rotation2 = Cesium.Math.toRadians(30)

        //构建entity
        var height = object.boxHeight || 300,
          heightMax = object.boxHeightMax || 400,
          heightDif = object.boxHeightDif || 10
        var goflog = true
        //添加正方体
        if (object.boxShow) {
          this._viewer.entities.add({
            id: object.id + '_1',
            name: '立方体盒子',
            position: new Cesium.CallbackProperty(function () {
              height = height + heightDif
              if (height >= heightMax) {
                height = heightMax
              }
              return Cesium.Cartesian3.fromDegrees(lon, lat, height / 2)
            }, false),
            box: {
              dimensions: new Cesium.CallbackProperty(function () {
                height = height + heightDif
                if (height >= heightMax) {
                  height = heightMax
                  if (goflog) {
                    //需要增加判断 不然它会一直执行; 导致对div的dom操作 会一直重复
                    goflog = false
                    $this.append(object, true)
                  }
                }
                return new Cesium.Cartesian3(
                  object.boxSide || 100,
                  object.boxSide || 100,
                  height
                )
              }, false),
              material:
                object.boxMaterial || Cesium.Color.DEEPSKYBLUE.withAlpha(0.5)
            }
          })
        } else {
          // 只要弹出框
          setTimeout(function () {
            $this.append(object, true)
          }, 100)
        }
        if (object.circleShow) {
          object.circleSize = object.circleSize || 120
          //添加底座 一 外环
          this._viewer.entities.add({
            id: object.id + '_2',
            name: '椭圆',
            position: Cesium.Cartesian3.fromDegrees(lon, lat),
            ellipse: {
              // semiMinorAxis : object.circleSize, //直接这个大小 会有一个闪白的材质 因为cesium材质默认是白色 所以我们先将大小设置为0
              // semiMajorAxis : object.circleSize,
              semiMinorAxis: new Cesium.CallbackProperty(function () {
                if (sStartFlog) {
                  s1 = s1 + object.circleSize / 20
                  if (s1 >= object.circleSize) {
                    s1 = object.circleSize
                  }
                }
                return s1
              }, false),
              semiMajorAxis: new Cesium.CallbackProperty(function () {
                if (sStartFlog) {
                  s2 = s2 + object.circleSize / 20
                  if (s2 >= object.circleSize) {
                    s2 = object.circleSize
                  }
                }
                return s2
              }, false),
              material:
                this.getDfSt(['plugin', 'Css3Renderer_one']) ||
                'static/data/images/Textures/circle2.png',
              rotation: new Cesium.CallbackProperty(function () {
                rotation += 0.05
                return rotation
              }, false),
              stRotation: new Cesium.CallbackProperty(function () {
                rotation += 0.05
                return rotation
              }, false),
              zIndex: 2
            }
          })
          //添加底座二 内环
          this._viewer.entities.add({
            id: object.id + '_3',
            name: '椭圆',
            position: Cesium.Cartesian3.fromDegrees(lon, lat),
            ellipse: {
              semiMinorAxis: new Cesium.CallbackProperty(function () {
                if (sStartFlog) {
                  s3 = s3 + object.circleSize / 20
                  if (s3 >= object.circleSize / 2) {
                    s3 = object.circleSize / 2
                  }
                }
                return s3
              }, false),
              semiMajorAxis: new Cesium.CallbackProperty(function () {
                if (sStartFlog) {
                  s4 = s4 + object.circleSize / 20
                  if (s4 >= object.circleSize / 2) {
                    s4 = object.circleSize / 2
                  }
                }
                return s4
              }, false),
              material:
                this.getDfSt(['plugin', 'Css3Renderer_two']) ||
                'static/data/images/Textures/circle1.png',
              rotation: new Cesium.CallbackProperty(function () {
                rotation2 -= 0.03
                return rotation2
              }, false),
              stRotation: new Cesium.CallbackProperty(function () {
                rotation2 -= 0.03
                return rotation2
              }, false),
              zIndex: 3
            }
          })
        }
      }
      Cesium.Scene.Css3Renderer = Css3Renderer
    }
  }
}

export { Plugin }
