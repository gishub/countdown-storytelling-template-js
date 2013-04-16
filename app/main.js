dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("esri.arcgis.utils");
dojo.require("esri.map");

/******************************************************
***************** begin config section ****************
*******************************************************/

var TITLE = "World's Largest Container Ports"
var BYLINE = "This is the byline"
var WEBMAP_ID = "3732b8a6d0bc4a09b00247e8daf69af8";
var LOCATIONS_LAYER_TITLE = "Largest Container Ports";
var GEOMETRY_SERVICE_URL = "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer";

var BASEMAP_SERVICE_NATGEO = "http://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer";
var BASEMAP_SERVICE_SATELLITE = "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";


/******************************************************
***************** end config section ******************
*******************************************************/

var _map;
var _mapOV;
var _scroll;

var _locations;

var _lutIconSpecs = {
	normal:new IconSpecs(22,28,3,8),
	medium:new IconSpecs(24,30,3,8),
	large:new IconSpecs(32,40,3,11)
}

var ICON_PREFIX = "resources/icons/red/NumberIcon";
var ICON_SUFFIX = ".png";

var _dojoReady = false;
var _jqueryReady = false;

var _homeExtent; // set this in init() if desired; otherwise, it will 
				 // be the default extent of the web map;

var _isMobile = isMobile();

var _isEmbed = false;

dojo.addOnLoad(function() {_dojoReady = true;init()});
jQuery(document).ready(function() {_jqueryReady = true;init()});

if (document.addEventListener) {
	document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
} else {
	document.attachEvent('touchmove', function (e) { e.preventDefault(); }, false);
}


function init() {
	
	if (!_jqueryReady) return;
	if (!_dojoReady) return;
	
	// determine whether we're in embed mode
	
	var queryString = esri.urlToObject(document.location.href).query;
	if (queryString) {
		if (queryString.embed) {
			if (queryString.embed.toUpperCase() == "TRUE") {
				_isEmbed = true;
				$("#header").height(0);
				$("#zoomToggle").css("top", "55px");
				$("body").css("min-width","600px");
				$("body").css("min-height","500px");			
				$("body").width(600);
				$("body").height(400);
			}
		}
	}
	
	// jQuery event assignment
	
	$(this).resize(handleWindowResize);
	
	$("#zoomIn").click(function(e) {
        _map.setLevel(_map.getLevel()+1);
    });
	$("#zoomOut").click(function(e) {
        _map.setLevel(_map.getLevel()-1);
    });
	$("#zoomExtent").click(function(e) {
        _map.setExtent(_homeExtent);
    });
	
	$("#title").append(TITLE);
	$("#subtitle").append(BYLINE);	
	
	
	_map = new esri.Map("map");
	_map.addLayer(new esri.layers.ArcGISTiledMapServiceLayer(BASEMAP_SERVICE_SATELLITE));
	_map.setLevel(7);

	var mapDeferred = esri.arcgis.utils.createMap(WEBMAP_ID, "mapOV", {
		mapOptions: {
			slider: false,
			wrapAround180: true,
			extent:_homeExtent
		},
		ignorePopups: false,
		geometryServiceURL: GEOMETRY_SERVICE_URL
	});
	
	mapDeferred.addCallback(function(response) {	  

		_mapOV = response.map;
				
		_sourceLayer = $.grep(
			response.itemInfo.itemData.operationalLayers,
			function(n,i){
				return $.trim(n.title).toLowerCase() == $.trim(LOCATIONS_LAYER_TITLE).toLowerCase()
			})[0].featureCollection.layers[0];
		
		var locationsService = new LocationsParserService();
		var numDiv;
		var nameDiv;
		var li;		  

		locationsService.process(_sourceLayer.featureSet.features, function(locations){
			_locations = locations;
			var spec = _lutIconSpecs.normal;
			$.each(_locations, function(index, value) {
				value.setSymbol(new esri.symbol.PictureMarkerSymbol(
					ICON_PREFIX+value.attributes.getRank()+ICON_SUFFIX, 
					spec.getWidth(), 
					spec.getHeight()).setOffset(spec.getOffsetX(), spec.getOffsetY())
				);
			   _mapOV.graphics.add(value);
			   numDiv = $("<div class='numberDiv'>"+value.attributes.getRank()+"</div>");
			   nameDiv = $("<div class='nameDiv'>"+value.attributes.getName()+"</div>");
			   li = $("<li></li>");
			   $(li).append(numDiv);
			   $(li).append(nameDiv);
			   $("#thelist").append(li);
			});
		});
		
		_scroll = new iScroll('wrapper', {snap:'li',momentum:true});	
	
			
		$("li").click(function(e) 
		{
			if ($(this).find(".numberDiv").hasClass("selected")) {
				backToList();
			} else {
				$("li .nameDiv").removeClass("selected");
				$("li .numberDiv").removeClass("selected");
				$(this).find(".numberDiv").addClass("selected");
				$(this).find(".nameDiv").addClass("selected");
				/*
				var index = $.inArray(this,$("#scroller li"));
				_scroll.scrollToPage(0, index, 500);
				*/			
				$("#divInfo").empty();
				$("#divInfo").append($(this).find(".nameDiv").html());			
				setTimeout(function(){$("#blot").animate({left:40},"slow")}, 400);
			}
		});
		
		if(_mapOV.loaded){
			initMap();
		} else {
			dojo.connect(_mapOV,"onLoad",function(){
				initMap();
			});
		}
				
	});
	
}

function initMap() {
	
	// if _homeExtent hasn't been set, then default to the initial extent
	// of the web map.  On the other hand, if it HAS been set AND we're using
	// the embed option, we need to reset the extent (because the map dimensions
	// have been changed on the fly).

	if (!_homeExtent) {
		_homeExtent = _map.extent;
	} else {
		if (_isEmbed) {
			setTimeout(function(){
				_map.setExtent(_homeExtent)
			},500);
		}	
	}
	
	handleWindowResize();
	
	$("#case #blot").css("left", $("#case").width());

}

function handleWindowResize() {
	
	$("#leftPane").height($("body").height() - $("#header").height());
	$("#leftPane").width(parseInt($("body").width() * .4));
	
	$("#case #wrapper #scroller .nameDiv").width($("#leftPane").width() - $("#case #wrapper #scroller .numberDiv").width()); 
	$("#case #blot").width($("#leftPane").width() - 40);	
	$("#case #blot").height($("#leftPane").height());
		
	$("#map").height($("body").height() - $("#header").height());
	$("#map").width($("body").width() - $("#leftPane").width() - parseInt($("#leftPane").css("border-right-width")));
	
	$("#mapOV").width($("#case #blot").width() - (parseInt($("#case #blot #mapOV").css("margin-left")) + parseInt($("#case #blot #mapOV").css("margin-right"))));
	$("#mapOV").height($("#case #blot").height() - 135);
	
	_map.resize();
	_mapOV.resize();
	
}

function backToList() 
{
	$(".numberDiv").removeClass("selected");
	$(".nameDiv").removeClass("selected");
	$("#case #blot").animate({left:$("#case").width()});
}
