!function (root, $) {

  'use strict';

  /*==============================================================
  =            RigCollection Class/Object/Constructor            =
  ==============================================================*/

  var RigCollection = function () {
    this.collection         = []

    this.apiData            = { type: 'rigs', action: 'overview' }
    this.overallHashrate    = 0
    this._ready             = true
    this._rigsActive        = 0
    this._rigsResponded     = 0

    this.$overview          = $('#overview')
    this.$overviewTable     = $('#overview table')
    this.$overviewTableBody = $('#overview tbody')
    this.overviewTableData  = ''
  }

  /*-----  End of RigCollection Class/Object/Constructor  ------*/


  /*====================================================
  =            RigCollection Public Methods            =
  ====================================================*/

  RigCollection.prototype.start = function () {
    var _self = this // caching self ref for passing down in scope

    /*==========  Generate collection  ==========*/
    $('.panel-rig').each(function() {
      _self._add(this.getAttribute('data-id'))
    })

    /*==========  Initial data call  ==========*/
    this._getData(function (data) {
    //   _self._buildOverview(data)

      _self.apiData = { type: 'rigs', action: 'update' }

      _self._update() // Populate all devices in the collection

      /*==========  Setup polling  ==========*/
      setInterval(function () {
        if (_self._ready) {
          _self._rigsResponded = 0
          _self._ready = false
          _self._update() // Update both devices and summary stats
        }
      }, root.rigUpdateTime)
    })
  }

  /*-----  End of RigCollection Public Methods  ------*/


  /*=====================================================
  =            RigCollection Private Methods            =
  =====================================================*/

  RigCollection.prototype._add = function (rigId) {
    this.collection.push(new this.SubClass(rigId))
  }

  RigCollection.prototype._update = function () {
    var _self = this // caching self ref for passing down in scope
    var overviewData = []

    this.collection.forEach(function (rig, index) {
      _self.apiData.id = rig.rigID
      _self._getData(function (data) {
        rig.update(data)
        overviewData[index] = data
        _self._rigsResponded++
        if (_self._rigsResponded === _self.collection.length) {
          _self._ready = true
          _self._buildOverview(overviewData)
          $(document).trigger('masonry-update')
        }
      })
    })

    return true;
  }

  RigCollection.prototype._getData = function (callback) {
    var _self = this // caching self ref for passing down in scope

    $.ajax({
      url: 'ajax.php',
      data : _self.apiData,
      dataType: 'json'
    })
    .done(callback)
    .fail(function (xhr, status, message) {
      //console.error(message)
    })
  }

  RigCollection.prototype._buildOverview = function (data) {
    var _self = this // caching self ref for passing down in scope

    var algorithms = { }

    function build(res, index) {
      if (res.overview) {
        res = res.overview
      }

      _self.overviewTableData += _self._buildOverviewRow(res, index + 1)
      _self.overallHashrate += parseFloat(res.hashrate_avg)

      if (typeof algorithms[res.algorithm] == 'undefined') {
        var algorithm = res.algorithm;
        algorithms[algorithm] = 0;
      }
      algorithms[res.algorithm] += parseFloat(res.hashrate_avg)
    }

    this.overviewTableData = ''
    this.overallHashrate = 0

    if (data.overview) {
      data = data.overview
    }

    data.forEach(build)

    this.overallHashrate = Util.getSpeed(this.overallHashrate)

    this.$overviewTableBody.html(this.overviewTableData)

    if (cG.showTotalHashrate == 'true') {
        for (var key in algorithms) {
          if (algorithms[key]) {
            if ($('#hashrate_' + key).length == 0) {
              var aTag = document.createElement('a');
              aTag.setAttribute('id',"hashrate_"+key);
              aTag.setAttribute('class',"total-hashrate hidden");
              $('#total-hashrates li').append(aTag)
            }
            $('#hashrate_' + key).removeClass('hidden').html('<span class="hashrate-algo">' + key + '</span>' + Util.getSpeed(algorithms[key]))
          }
          else {
            $('#total-hashrates #hashrate_' + key).addClass('hidden')
          }
        }
    }

    this._updateDocumentTitle(this.overallHashrate)

  }

  RigCollection.prototype._updateDocumentTitle = function (str) {
    document.title = str + ' :: Dashboard (cryptoGlance)'
  }

  RigCollection.prototype._buildOverviewRow = function (overview, index) {
    var icon = overview.status.icon || 'ban-circle'
    var colour = overview.status.colour || 'grey'
    var hashrate_5s = colour !== 'grey' ? Util.getSpeed(overview.hashrate_5s) : '--'
    var hashrate_avg = colour !== 'grey' ? Util.getSpeed(overview.hashrate_avg) : '--'
    var active_pool_url = overview.active_pool.url || '--'
    var uptime = overview.uptime || '--'
    return '<tr data-rig="'+ index +'">' +
           '<td><i class="icon icon-'+ icon +' '+ colour +'"></i></td>' +
           '<td><a href="#rig-'+ index +'" class="anchor-offset rig-'+ index +' '+ colour +'">'+ $('#rig-'+ index + ' h1').html() +'</a></td>' +
           '<td>'+ overview.algorithm +'</td>' +
           '<td>'+ hashrate_avg +'</td>' +
           '<td>'+ hashrate_5s +'</td>' +
           '<td>'+ active_pool_url +'</td>' +
           '<td>'+ uptime +'</td>' +
           '</tr>'
  }

  /*-----  End of RigCollection Private Methods  ------*/


  /*============================================
  =            RigCollection Export            =
  ============================================*/

  root.RigCollection = RigCollection

  /*-----  End of RigCollection Export  ------*/

}(window, window.jQuery)
