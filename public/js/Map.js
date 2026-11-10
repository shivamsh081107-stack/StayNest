const map = new mapboxgl.Map({

    accessToken: mapToken,

    container: 'map',

    style: 'mapbox://styles/mapbox/streets-v12',

    center: cordinates,

    zoom: 9

});

const marker1 = new mapboxgl.Marker()

    .setLngLat(cordinates)
    .setPopup(new mapboxgl.Popup({offset: 25})
    .setHTML("<h4>Exact location provided after booking</h4>"))
    .addTo(map);