/**
 * 基于three的融合
 *
 * cesium 需要关闭自带的循环渲染
 * useDefaultRenderLoop: false
 * @param {*} viewer
 */
function ThreeJs(viewer) {
  if (viewer) {

    this._initContainer()
    this._initThree()
  }
}

ThreeJs.prototype = {
  /**
   * 初始化容器
   */
  _initContainer: function () {

    this.cesiumContainer = undefined
    this.threeContainer = undefined
    this.cesiumContainer = document.getElementById('cesiumContainer')
    this.threeContainer = document.getElementById('threeContainer')

    //元素都已经创建默认集成
    if (this.cesiumContainer && this.threeContainer) {

      return false
    }
    if (!this.cesiumContainer) {

      alert('未获取到 cesiumContainer 容器!')
      return false

    } else {
      //是否符合
      if (this.cesiumContainer.style.position !== 'absolute') {
        // 重写样式
        this.cesiumContainer.style.position = 'absolute'
        this.cesiumContainer.style.top = 0
        this.cesiumContainer.style.left = 0
        this.cesiumContainer.style.height = '100%'
        this.cesiumContainer.style.width = '100%'
        this.cesiumContainer.style.margin = 0
        this.cesiumContainer.style.overflow = 'hidden'
        this.cesiumContainer.style.padding = 0
        this.cesiumContainer.style.fontFamily = 'sans-serif'
      }
    }
    //no create
    if (!this.threeContainer) {
      var body = document.getElementsByTagName('body')[0]
      if (body) {
        this.threeContainer = document.createElement('div')
        this.threeContainer.id = 'threeContainer'
        this.threeContainer.style.position = 'absolute'
        this.threeContainer.style.top = 0
        this.threeContainer.style.left = 0
        this.threeContainer.style.height = '100%'
        this.threeContainer.style.width = '100%'
        this.threeContainer.style.margin = 0
        this.threeContainer.style.overflow = 'hidden'
        this.threeContainer.style.padding = 0
        this.threeContainer.style.fontFamily = 'sans-serif'
        this.threeContainer.style.pointerEvents = 'none'
        body.appendChild(this.threeContainer)
      }
    }
  },
  /**
   * 初始化three
   */
  _initThree: function () {

    var fov = 45,
      width = window.innerWidth,
      height = window.innerHeight,
      aspect = width / height,
      near = 1,
      far = 10 * 1000 * 1000

    this._three = {
      renderer: null,
      camera: null,
      scene: null
    }

    this._three.scene = new THREE.Scene()
    this._three.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    this._three.renderer = new THREE.WebGLRenderer({
      alpha: true
    })

    if (this.threeContainer) {

      this.threeContainer.appendChild(this._three.renderer.domElement)
    }
  },
  /**
   * threeObjects 对象
   *
   * 用于实例化到cesium球上
   */
  createThreeObject: function () {

    function _3DObject() {
      this.threeMesh = null
      this.minWGS84 = null
      this.maxWGS84 = null
    }

    return new _3DObject()
  },
  /**
   * 添加three obj对象
   */
  addThreeObjects: function (objects) {

    if (objects && objects.length > 0) {

      this._3Dobjects = objects
      //注册
      this._renderCesium()
      this._renderThreeObj()
      this._loop()
    }
  },
  /**
   * 开始渲染cesium和three
   */
  _loop: function () {

    window.loop = function () {
      //循环渲染
      requestAnimationFrame(window.loop)
      //渲染cesium
      window.renderCesium()
      //渲染three
      window.renderThreeObj()
    }

    window.loop()
  },

  /**
   * 渲染cesium
   */
  _renderCesium: function () {

    var $this = this
    window.renderCesium = function () {

      $this._viewer && $this._viewer.render()
    }
  },
  /**
   * 渲染three
   */
  _renderThreeObj: function () {
    var $this = this
    window.renderThreeObj = function () {

      var cartToVec = function (cart) {
        return new THREE.Vector3(cart.x, cart.y, cart.z)
      }

      if ($this._three && $this._viewer && $this._3Dobjects) {
        //同步相机事件
        $this._three.camera.fov = Cesium.Math.toDegrees($this._viewer.camera.frustum.fovy)
        $this._three.camera.updateProjectionMatrix()

        // 同步位置 Configure Three.js meshes to stand against globe center position up direction
        for (var id in $this._3Dobjects) {
          var minWGS84 = $this._3Dobjects[id].minWGS84,
            maxWGS84 = $this._3Dobjects[id].maxWGS84,
            // convert lat/long center position to Cartesian3
            center = Cesium.Cartesian3.fromDegrees((minWGS84[0] + maxWGS84[0]) / 2, (minWGS84[1] + maxWGS84[1]) / 2),
            // get forward direction for orienting model
            centerHigh = Cesium.Cartesian3.fromDegrees((minWGS84[0] + maxWGS84[0]) / 2, (minWGS84[1] + maxWGS84[1]) / 2, 1)
          // use direction from bottom left to top left as up-vector
          var bottomLeft = cartToVec(Cesium.Cartesian3.fromDegrees(minWGS84[0], minWGS84[1]))
          var topLeft = cartToVec(Cesium.Cartesian3.fromDegrees(minWGS84[0], maxWGS84[1]))
          var latDir = new THREE.Vector3().subVectors(bottomLeft, topLeft).normalize()
          // configure entity position and orientation
          $this._3Dobjects[id].threeMesh.position.copy(center)
          $this._3Dobjects[id].threeMesh.lookAt(centerHigh)
          $this._3Dobjects[id].threeMesh.up.copy(latDir)
        }

        // Clone Cesium Camera projection position so the
        // Three.js Object will appear to be at the same place as above the Cesium Globe
        $this._three.camera.matrixAutoUpdate = false
        var cvm = $this._viewer.camera.viewMatrix,
          civm = $this._viewer.camera.inverseViewMatrix
        $this._three.camera.matrixWorld.set(
          civm[0], civm[4], civm[8], civm[12],
          civm[1], civm[5], civm[9], civm[13],
          civm[2], civm[6], civm[10], civm[14],
          civm[3], civm[7], civm[11], civm[15]
        )
        $this._three.camera.matrixWorldInverse.set(
          cvm[0], cvm[4], cvm[8], cvm[12],
          cvm[1], cvm[5], cvm[9], cvm[13],
          cvm[2], cvm[6], cvm[10], cvm[14],
          cvm[3], cvm[7], cvm[11], cvm[15]
        )
        $this._three.camera.lookAt(new THREE.Vector3(0, 0, 0))

        var width = $this.threeContainer.clientWidth,
          height = $this.threeContainer.clientHeight,
          aspect = width / height
        $this._three.camera.aspect = aspect
        $this._three.camera.updateProjectionMatrix()

        $this._three.renderer.setSize(width, height)
        $this._three.renderer.render($this._three.scene, $this._three.camera)
      }
    }

  }
}