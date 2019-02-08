/* Vlad Sliusar - Capstone in GIS Development - UW-Madison MS GISWMP - February 2019 */

var darkscale   = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    minZoom: 5,
    id: 'mapbox.dark',
    detectRetina: true,
    accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NDg1bDA1cjYzM280NHJ5NzlvNDMifQ.d6e-nNyBDtmQCVwVNivz7A'
    })

// limit maps bounds to that of the US
var southWest = L.latLng(24.396308, -124.848974),
    northEast = L.latLng(49.384358, -66.885444),
    bounds = L.latLngBounds(southWest, northEast);

var map = L.map('map', {
    maxBounds: bounds,
    zoomControl: false,
    maxNativeZoom: 10,
    center: [37.0902, -95.7129],
    zoom: 4,
    layers: [darkscale],
    // remove attribution
    attributionControl: false
    //layersControl:false
});

var layersControl;

darkscale.addTo(map);
// zoom to Wisconsin
setTimeout(function(){map.flyTo([44.7844, -89.7879],7,{animate:true,duration:4})},3000)

var zoomHome = L.Control.zoomHome({position:'topright'});
zoomHome.setHomeCoordinates([44.7844, -89.7879]);
zoomHome.setHomeZoom(7);
zoomHome.addTo(map);

 // add attribution - bottom-left
L.control.attribution({position: 'bottomright'}).addTo(map);



var counter = 0;
function startApp(weight,overlayMaps){
  counter++;

    // Wisconsin tracts
    $.getJSON('data/cancer_tracts_simpl.json', function (tracts) {
        var tractsLayer = tractsLayerFn(tracts)
        tractsLayer.name = "tracts_layer"
        createLayersArray(tractsLayer)
    })

    function tractsLayerFn(tracts){
        tractsL = L.geoJSON(tracts, {
        color: 'white',
        opacity: 1,
        weight: 0.5,
        fillColor: "#fff",
        fillOpacity: 0.2
      })//.addTo(map);
      // add popup on click
      tractsL.bindPopup("Wisconsin Census Tracts")
      // remove popup on hover out
      tractsL.on('mouseout', function (e) {
            this.closePopup();
      });
      tractsL.bringToBack()
      return tractsL
    }


    // wells - water sample colection locations
    $.getJSON('data/well_nitrate.geojson', function (wells) {
        var wellsLayer = wellsLayerFn(wells);
        wellsLayer.name = "wells_layer"
        createLayersArray(wellsLayer)
    })

    function wellsLayerFn(wells){

        var geojsonMarkerOptions = {
          radius: 4,
          fillColor: "#9aebf3",
          color: "black",
          weight: 0.3,
          opacity: 0.6,
          fillOpacity: 1
        };
        wellsL = L.geoJSON(wells, {
          pointToLayer: function (feature, latlng) {
              return L.circleMarker(latlng, geojsonMarkerOptions);
          }
        })//.addTo(map)
        return wellsL

    }


    $.getJSON('data/OLS_tracts_mapshaper.json', function(residuals){
      var regressionLayer = regressionLayerFn(residuals)
      regressionLayer.name = "regression_layer"
      createLayersArray(regressionLayer)
    })

    // lenear regression ArcGIS data
    function regressionLayerFn(residuals){

            function highlightFeature(e) {
              var layer = e.target;

              layer.setStyle({
                  weight: 3,
                  color: '#464646',
                  dashArray: '',
                  fillOpacity: 1
              });

              if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                  layer.bringToFront();
              }
          }

            function resetHighlight(e) {
                regressionL.resetStyle(e.target);
            }

          var myValuesResiduals = [];

          regressionL = L.choropleth(residuals, {
              valueProperty: 'StdResid', //['#4575b5','#849eba','#c0ccbe','#ffffbf','#fab984','#ed7551','#d62f27'], ['#4575b4','#91bfdb','#e0f3f8','#ffffbf','#fee090','#fc8d59','#d73027'], ['#2166ac','#67a9cf','#d1e5f0','#f7f7f7','#fddbc7','#ef8a62','#b2182b']
              scale: ['#4575b4','#91bfdb','#e0f3f8','#ffffbf','#fee090','#fc8d59','#d73027'],
              steps: 7,
              mode: 'k',
              style: {
                color: '#6b6b6b',
                weight: 0.6,
                fillOpacity: 1,
                 dashArray: '2',
                opacity:1
              },
              onEachFeature: function (feature, layer) {
                layer.bindPopup('Standardized Residual: '+ feature.properties.StdResid.toLocaleString() + '<br>' + 'Cancer Rate: ' + feature.properties.canrate.toLocaleString()+ '<br>' + 'Nitrate Value: '+feature.properties.nitrate.toLocaleString())
                    // activate popup on hover
                    layer.on('mouseover', function (e) {
                          this.openPopup();
                      });
                      layer.on('mouseout', function (e) {
                          this.closePopup();
                      });
                      layer.on({
                          mouseover: highlightFeature,
                          mouseout: resetHighlight,

                      });

                    myValuesResiduals.push(feature.properties.StdResid);
              }
          })//.addTo(map)
          // add zoom to feature
          regressionL.on('click', function (e) {
                 map.setView(e.latlng, 10)
              });
          // create regression legend
          regressionLegend(myValuesResiduals)
          return regressionL
    }



    var idwK = function(k){
    $.getJSON('data/well_nitrate.geojson', function (points) {
      var kFactor = k
      var choroplethLayer = idwLayerFn(points,kFactor);
      choroplethLayer.name = "choropleth_layer";
      //console.log(choroplethLayer)
      createLayersArray(choroplethLayer);

    })
    }
    idwK(weight);


    // interpolation IDW
    function idwLayerFn(points, k = 1){
      if (counter >= 2){
        map.removeControl(layersControl);
        map.removeLayer(overlayMaps["GIS Analysis Layers"]["IDW"]);
        map.removeLayer(overlayMaps["GIS Analysis Layers"]["Regression"])
        map.removeLayer(overlayMaps["Base Layers"]["WI Census Tracts"])
        map.removeLayer(overlayMaps["Base Layers"]["Test Water Wells"])
      }
          console.log(k)
          var myValues = [];
          var options = {gridType: 'hex', property: 'nitr_ran', units: 'miles', weight: k};
          var grid = turf.interpolate(points, 7, options);

          var interpolat = L.geoJSON(grid)//.addTo(map)

          choroplethL = L.choropleth(grid, {
              valueProperty: 'nitr_ran',
              //'#feebe2','#fcc5c0','#fa9fb5','#f768a1','#dd3497','#ae017e','#7a0177'
              scale: ['#ffffcc','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#0c2c84'],
              steps: 7,
              mode: 'q',
              style: {
                color: '#fff',
                weight: 1.6,
                fillOpacity: 1
              },
              onEachFeature: function (feature, layer) {
                layer.bindPopup('Nitrate Value: '+ '<br>' +
                    feature.properties.nitr_ran.toLocaleString(),{
                      className : 'popupCustom'
                    })
                    // activate popup on hover
                    layer.on('mouseover', function (e) {
                          this.openPopup();
                      });
                      layer.on('mouseout', function (e) {
                          this.closePopup();
                      });

                    myValues.push(feature.properties.nitr_ran);
              }
           })//.addTo(map);
           IDWLegend(myValues)
           return choroplethL;

    }


    // create an array of layers once called back data is recieved
    var layers = [];
    function createLayersArray(layer){

        layers.push(layer)
        //var overlayMaps = {};
        var overlayMaps = {
      "Base Layers": {
      },
      "GIS Analysis Layers": {

      }
    };
        if (layers.length === 4){
          //console.log(layers)
            var i;
            // loop through all 4 layer objects
            for (i = 0; i < layers.length; i++){
                // Checks the name property of each layer object. Once matched, it is added to the overlayMaps object.
                if (layers[i].name === "choropleth_layer"){
                  overlayMaps["GIS Analysis Layers"]["IDW"] = layers[i]
                } else if (layers[i].name === "regression_layer"){
                  overlayMaps["GIS Analysis Layers"]["Regression"] = layers[i]
                } else if (layers[i].name === "tracts_layer"){
                  overlayMaps["Base Layers"]["WI Census Tracts"] = layers[i]
                } else if (layers[i].name === "wells_layer"){
                  overlayMaps["Base Layers"]["Test Water Wells"] = layers[i]
                }
            }
        // calls the function which adds the overlayMaps object to the map's layer control
        createMap(overlayMaps)
        //console.log(overlayMaps)
        } else {};

    }

}
startApp()



// create overlayMaps and controls
function createMap(overlayMaps){
    //console.log(overlayMaps["GIS Analysis Layers"])

    var options = {
    // Make the "GIS Analysis Layers" group exclusive (use radio inputs)
    //exclusiveGroups: ["GIS Analysis Layers"],
    // keep controls open
    collapsed: false,
    groupRadioboxes: true,
    position:"topleft",
    //groupCheckboxes: true
    };


    if (counter <= 1){
      layersControl = L.control.groupedLayers(null, overlayMaps, options,{layer:overlayMaps["Base Layers"]["WI Census Tracts"].addTo(map)},{layer:overlayMaps["Base Layers"]["Test Water Wells"].addTo(map)}).addTo(map);
    } else if (counter >=2) {
      layersControl = L.control.groupedLayers(null, overlayMaps, options,{layer:overlayMaps["Base Layers"]["WI Census Tracts"].addTo(map)}).addTo(map);

    if (!map.hasLayer(overlayMaps["GIS Analysis Layers"]["IDW"])){
        $(".leaflet-control-layers-selector").prop('checked')
        map.addLayer(overlayMaps["GIS Analysis Layers"]["IDW"]);
    }

    }
    
    //prevent map zooming while using the layers control
    $(".leaflet-control-container").on('mousedown dblclick', function(e){
        L.DomEvent.stopPropagation(e);
     });
     //prevent map panning while using the layers control
     $(".leaflet-control-container").mousedown(function () {
         map.dragging.disable();
     });
     $(document).mouseup(function () {
         map.dragging.enable();
     });


    $(".leaflet-control-layers-list").prepend("<p id='control_title'>ANALYSIS CONTROLS</p>");
    $(".leaflet-control-layers-list").append("<p id='control_k'>Enter k Value for IDW</p>");
    $(".leaflet-control-layers-list").append('<input type="text" name="k_field" id="k_input" autocomplete="off" data-toggle="tooltip" data-placement="bottom" title="k is the distance decay coefficient which determines how fast weight will decrease as distance increases. Although there is no universal proper value, the accepted good range varies between 1 and 3. Where smaller number is used for a long range spatial autocorelation, while a larger number is used for a short range autocorrelation."/><button id="k_button" type="button" class="btn">Interpolate</button>');
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })

    map.on('overlayadd', function (eventLayer) {

        if (eventLayer.name === 'Regression') {
            map.removeLayer(overlayMaps["GIS Analysis Layers"]["IDW"]);
        } else if (eventLayer.name === 'IDW'){
            map.removeLayer(overlayMaps["GIS Analysis Layers"]["Regression"]);
        }
    })

    map.on('overlayeremove', function (eventLayer) {
        if (eventLayer.name === 'Regression') {
            $( ".leaflet-control-layers-selector" ).prop( "checked", false )
        } else if (eventLayer.name === 'IDW'){
            $( ".leaflet-control-layers-selector" ).prop( "checked", false )
        }
    })

    var inputBox = $("#k_input");
    var submitButton = $("#k_button");
    submitButton.click(function(){
        if(map.hasLayer(overlayMaps["GIS Analysis Layers"]["Regression"])){
          alert('Please select the IDW layer to use the interpolation feature.')
        } else if (map.hasLayer(overlayMaps["GIS Analysis Layers"]["IDW"])){
          if ($( ".leaflet-control-layers-selector" ).prop( "checked", true )){
          }

        var getval = ($("#k_input").val()?$("#k_input").val():alert('Please provide a value of k from 1 to 5.'))
        var weight = parseInt(getval);

        // check k input values
        if (isNaN(weight) || weight < 1 || weight > 5) {
            alert('Please provide a value of k from 1 to 5.')
            startApp(1,overlayMaps);
          } else {
            startApp(weight,overlayMaps);
          }
        } else {
          alert('Please select the IDW layer to use the interpolation feature.')
        }
    });

}


// Regression Legend
function regressionLegend(myValuesResiduals){

  function getColor(d) {
    return d > 1000 ? '#4575b5' :
           d > 500  ? '#849eba' :
           d > 200  ? '#c0ccbe' :
           d > 100  ? '#ffffbf' :
           d > 50 ? '#fab984' :
           d > 20 ? '#ed7551' :
           d > 10 ? '#d62f27' :
                      '#d62f27';
}
    var legendResiduals = L.control({position: 'bottomleft'});
    legendResiduals.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'info legend'),
            grades = [1000,500,200,100,50,20,10,0],
            labels = ['< -2.5'+ '<br>','-2.5 - -1.5'+ '<br>','-1.5 - -0.5' + '<br>','-0.5 - 0.5' +
                      '<br>','0.5 - 1.5' + '<br>','1.5 - 2.5' + '<br>','> 2.5'];
        //add title
        div.innerHTML +="<p id='RegressionLegend_title'>Standardized Residuals</p>";
        var domain = (myValuesResiduals, 'k',7)
        // generate a label with a colored square for each interval
        for (var i = 0; i < labels.length & i<grades.length; i++) {
            div.innerHTML +='<i id = "idResiduals" style="background:' + getColor(grades[i] + 1) + '"></i> '+labels[i]
                //labels[i] + (labels[i + 1] ? '&ndash;' + labels[i + 1] + '<br>' : '+');
        }
        return div;
    };
    // add name property to the regression legend
    legendResiduals.name = "regression_legend";
    // add IDW legend to an array
    createLegendArray(legendResiduals)
}


// IDW Legend
function IDWLegend(myValues){

  //console.log(myValues)
  var legend = L.control({position: 'bottomleft'});

  legend.onAdd = function (map) {
      var getColor = chroma.scale(['#ffffcc','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#0c2c84']).domain(myValues,7);
      var div = L.DomUtil.create('div', 'info legend'),
          grades = chroma.limits(myValues, 'e', 30),
          labels = ['High'+'<br>',''+'<br>',''+'<br>',''+'<br>',''+'<br>',''+'<br>','Low'];
          // add title
          div.innerHTML +="<p id='idwLegend_title'>Nitrate Values</p>";

          for (var i = 0; i < labels.length & i<grades.length; i++) {
              div.innerHTML +='<i style="background:' + getColor(grades[i] + 1) + '"></i> '+labels[i]
                  //labels[i] + (labels[i + 1] ? '&ndash;' + labels[i + 1] + '<br>' : '+');
          }

      return div;
   };
  //add name property to the legend object
  legend.name = "IDW_legend"
  // add IDW legend to an array
  createLegendArray(legend)
}


// create an array of legends once callback data is recieved
// assign legends to variables and pass them to the addLegends function
var legends = [];
function createLegendArray(legend){

  legends.push(legend)

  var i = 0;
  if (legends.length === 2){
    for (i = 0; i < legends.length; i++){
      if (legends[i].name === 'regression_legend'){
        var regLegend = legends[i];
      } else if (legends[i].name === 'IDW_legend'){
        var idwLegend = legends[i];
      }
    };
    addLegends(idwLegend,regLegend)
  } else {};

}


// adds/removes legends when corresponding layers are added/removed
function addLegends(idwLegend,regLegend){
    // Add legends when layer is selected
    map.on('overlayadd', function (eventLayer) {
        if (eventLayer.name === 'Regression') {
            regLegend.addTo(map);
        } else if (eventLayer.name === 'IDW'){
            idwLegend.addTo(map)
        }
    })
    // remove legend when layer is deselected
    map.on('overlayremove', function(eventLayer){
        if (eventLayer.name == 'Regression'){
             map.removeControl(regLegend);
        }
    });
    map.on('overlayremove', function(eventLayer){
        if (eventLayer.name == 'IDW'){
             map.removeControl(idwLegend);
        }
    });

};
