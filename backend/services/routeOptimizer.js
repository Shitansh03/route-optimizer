const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function optimizeRoute(startLocation, stops) {
  try {
    if (stops.length === 0) throw new Error('No stops to optimize');

    if (stops.length <= 68) {
      return await optimizeSingleBatch(startLocation, stops);
    } else {
      return await optimizeWithClustering(startLocation, stops);
    }
  } catch (err) {
    console.error('ORS optimization failed, using fallback:', err.message);
    return nearestNeighborFallback(startLocation, stops);
  }
}

async function optimizeSingleBatch(startLocation, stops) {
  const jobs = stops.map((stop, index) => ({
    id: index + 1,
    location: [stop.lng, stop.lat],
    service: 120,
    amount: [1]
  }));

  const vehicles = [{
    id: 1,
    profile: 'driving-car',
    start: [startLocation.lng, startLocation.lat],
    end: [startLocation.lng, startLocation.lat],
    capacity: [stops.length]
  }];

  const response = await fetch('https://api.openrouteservice.org/optimization', {
    method: 'POST',
    headers: {
      'Authorization': process.env.ORS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ jobs, vehicles })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ORS optimization error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  const optimizedOrder = data.routes[0].steps
    .filter(step => step.type === 'job')
    .map(step => step.job - 1);

  const geometry = await getRouteGeometry(startLocation, stops, optimizedOrder);

  return {
    optimizedOrder,
    totalDistance: geometry.distance,
    estimatedTime: geometry.duration,
    routeGeometry: geometry.geojson
  };
}

async function optimizeWithClustering(startLocation, stops) {
  const clusters = createGeographicClusters(stops, 60);
  console.log(`Clustering: ${stops.length} stops → ${clusters.length} clusters`);

  const clusterCenters = clusters.map(cluster => ({
    lat: cluster.reduce((sum, s) => sum + s.lat, 0) / cluster.length,
    lng: cluster.reduce((sum, s) => sum + s.lng, 0) / cluster.length
  }));

  const clusterOrder = nearestNeighborOrder(startLocation, clusterCenters);

  let globalOrder = [];
  let currentLocation = startLocation;

  for (const clusterIdx of clusterOrder) {
    const cluster = clusters[clusterIdx];
    const result = await optimizeSingleBatch(currentLocation, cluster);

    const globalIndices = cluster.map(clusterStop =>
      stops.findIndex(s => s.lat === clusterStop.lat && s.lng === clusterStop.lng)
    );

    result.optimizedOrder.forEach(localIdx => {
      globalOrder.push(globalIndices[localIdx]);
    });

    const lastLocalIdx = result.optimizedOrder[result.optimizedOrder.length - 1];
    currentLocation = cluster[lastLocalIdx];

    await sleep(1100);
  }

  const geometry = await getRouteGeometry(startLocation, stops, globalOrder);

  return {
    optimizedOrder: globalOrder,
    totalDistance: geometry.distance,
    estimatedTime: geometry.duration,
    routeGeometry: geometry.geojson
  };
}


async function getRouteGeometry(startLocation, stops, optimizedOrder) {
  try {
    const coordinates = [
      [startLocation.lng, startLocation.lat],
      ...optimizedOrder.map(i => [stops[i].lng, stops[i].lat])
    ];

    const response = await fetch(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        method: 'POST',
        headers: {
          'Authorization': process.env.ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coordinates })
      }
    );

    if (!response.ok) throw new Error(`ORS directions error: ${response.status}`);

    const data = await response.json();
    const summary = data.features[0].properties.summary;

    return {
      distance: (summary.distance / 1000).toFixed(1) + ' km',
      duration: Math.round(summary.duration / 60) + ' mins',
      geojson: data.features[0].geometry
    };

  } catch (err) {
    console.error('Route geometry error:', err.message);
    return { distance: 'N/A', duration: 'N/A', geojson: null };
  }
}


function createGeographicClusters(stops, maxSize) {
  const clusters = [];
  const remaining = [...stops];

  while (remaining.length > 0) {
    const seed = remaining.shift();
    const cluster = [seed];
    const center = { lat: seed.lat, lng: seed.lng };

    let i = 0;
    while (i < remaining.length && cluster.length < maxSize) {
      if (haversineDistance(center, remaining[i]) < 5) {
        cluster.push(remaining.splice(i, 1)[0]);
      } else {
        i++;
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}


function nearestNeighborFallback(startLocation, stops) {
  const unvisited = stops.map((_, i) => i);
  const order = [];
  let current = startLocation;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    unvisited.forEach((stopIdx, arrIdx) => {
      const dist = haversineDistance(current, stops[stopIdx]);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = arrIdx;
      }
    });

    const chosen = unvisited.splice(nearestIdx, 1)[0];
    order.push(chosen);
    current = stops[chosen];
  }

  return {
    optimizedOrder: order,
    totalDistance: 'Estimated',
    estimatedTime: 'Estimated',
    routeGeometry: null
  };
}

function nearestNeighborOrder(start, points) {
  const unvisited = points.map((_, i) => i);
  const order = [];
  let current = start;

  while (unvisited.length > 0) {
    let nearestIdx = 0, nearestDist = Infinity;
    unvisited.forEach((idx, arrIdx) => {
      const d = haversineDistance(current, points[idx]);
      if (d < nearestDist) { nearestDist = d; nearestIdx = arrIdx; }
    });
    const chosen = unvisited.splice(nearestIdx, 1)[0];
    order.push(chosen);
    current = points[chosen];
  }

  return order;
}


function haversineDistance(point1, point2) {
  const R = 6371; // Earth radius km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * Math.PI / 180; }

module.exports = { optimizeRoute };