const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function buildQueryVariants(rawAddress) {
  const variants = [];

  variants.push(rawAddress);

  const noFloor = rawAddress
    .replace(/\b(flat\s*no\.?|flat|floor|f\/|room\s*no\.?|room|apt\.?|apartment|unit|suite|shop\s*no\.?|shop|cabin|qtr\.?|quarter|plote?\s*no\.?|plot\s*no\.?|h\.?no\.?|house\s*no\.?|door\s*no\.?)\s*[a-z0-9#\-/]*/gi, '')
    .replace(/\b\d{1,3}(st|nd|rd|th)\s+floor\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (noFloor !== rawAddress && noFloor.length > 5) {
    variants.push(noFloor);
  }

  const parts = rawAddress.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 4) variants.push(parts.slice(1).join(', '));
  if (parts.length >= 3) variants.push(parts.slice(-3).join(', '));
  if (parts.length >= 2) variants.push(parts.slice(-2).join(', '));

  const city = parts[parts.length - 1] || '';
  if (city.length > 2 && !/^\d+$/.test(city)) variants.push(city);

  const seen = new Set();
  return variants.filter(v => {
    const k = v.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(k) || k.length < 3) return false;
    seen.add(k);
    return true;
  });
}

let mapplsTokenCache = null;
let mapplsTokenExpiry = 0;

async function getMapplsToken() {
  if (mapplsTokenCache && Date.now() < mapplsTokenExpiry) {
    return mapplsTokenCache;
  }

  const key = process.env.MAPPLS_API_KEY;
  if (!key) return null;

  try {
    mapplsTokenCache = key;
    mapplsTokenExpiry = Date.now() + (5 * 60 * 60 * 1000);
    return key;
  } catch (err) {
    console.error('Mappls token error:', err.message);
    return null;
  }
}


async function geocodeWithMappls(query) {
  const token = await getMapplsToken();
  if (!token) return null;

  try {
    const params = new URLSearchParams({
      address: query,
      region: 'IND',
      itemCount: '5',
    });

    const res = await fetch(
      `https://apis.mappls.com/advancedmaps/v1/${token}/geocode?${params}`,
      {
        headers: { 'User-Agent': 'RouteOptimizer/1.0' },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        mapplsTokenCache = null;
      }
      return null;
    }

    const data = await res.json();
    const results = data?.copResults;

    if (!results || results.length === 0) return null;

    const best = results[0];
    const lat = parseFloat(best.latitude);
    const lng = parseFloat(best.longitude);

    if (!lat || !lng) return null;

    return {
      lat,
      lng,
      formattedAddress: best.formattedAddress || query,
      confidence: parseFloat(best.confidenceScore || 0.7),
      source: 'mappls',
      eloc: best.eLoc || '',
    };

  } catch (err) {
    if (err.name !== 'TimeoutError') {
      console.error('Mappls geocode error:', err.message);
    }
    return null;
  }
}


async function mapplsAutosuggest(query, biasLat, biasLng) {
  const token = await getMapplsToken();
  if (!token) return [];

  try {
    const params = new URLSearchParams({
      query,
      region: 'IND',
      tokenizeAddress: '1',
      'pod': 'CITY',
      itemCount: '7',
    });


    if (biasLat && biasLng) {
      params.set('location', `${biasLat},${biasLng}`);
    }

    const res = await fetch(
      `https://atlas.mappls.com/api/places/search/json?${params}`,
      {
        headers: {
          'Authorization': `bearer ${token}`,
          'User-Agent': 'RouteOptimizer/1.0',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    const suggestions = data?.suggestedLocations || [];

    return suggestions.map(s => ({
      label: s.placeName + (s.placeAddress ? ', ' + s.placeAddress : ''),
      eloc: s.eLoc,
      lat: parseFloat(s.latitude) || null,
      lng: parseFloat(s.longitude) || null,
      type: s.type || '',
      source: 'mappls',
    }));

  } catch (err) {
    console.error('Mappls autosuggest error:', err.message);
    return [];
  }
}


async function resolveMapplsEloc(eloc) {
  const token = await getMapplsToken();
  if (!token || !eloc) return null;

  try {
    const res = await fetch(
      `https://apis.mappls.com/advancedmaps/v1/${token}/place_detail?place_id=${eloc}`,
      {
        headers: { 'User-Agent': 'RouteOptimizer/1.0' },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.pageInfo;
    if (!place) return null;

    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
      formattedAddress: place.address || place.placeName || eloc,
      source: 'mappls',
    };
  } catch (err) {
    console.error('Mappls eLoc resolve error:', err.message);
    return null;
  }
}

async function geocodeWithPhoton(query, biasLat, biasLng) {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: '5',
      lang: 'en',
      lat: biasLat || '20.5937',
      lon: biasLng || '78.9629',
    });
    params.append('countrycodes', 'in');

    const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
      headers: { 'User-Agent': 'RouteOptimizer/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const features = data.features || [];
    if (features.length === 0) return null;

    const typeScore = { house: 10, building: 9, street: 7, suburb: 5, city: 3 };
    const best = features
      .map(f => ({ f, score: typeScore[f.properties?.osm_value || ''] || 2 }))
      .sort((a, b) => b.score - a.score)[0].f;

    const p = best.properties || {};
    const [lng, lat] = best.geometry.coordinates;
    const addrParts = [p.name, p.street, p.suburb, p.city || p.town, p.postcode]
      .filter(Boolean);

    return {
      lat,
      lng,
      formattedAddress: addrParts.join(', ') || query,
      confidence: 0.6,
      source: 'photon',
    };
  } catch (err) {
    if (err.name !== 'TimeoutError') console.error('Photon error:', err.message);
    return null;
  }
}


async function geocodeWithNominatim(query) {
  try {
    const encoded = encodeURIComponent(query + ', India');
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=3&countrycodes=in`,
      {
        headers: { 'User-Agent': 'RouteOptimizer/1.0 (delivery-route-app)' },
        signal: AbortSignal.timeout(10000),
      }
    );
    const results = await res.json();
    if (!results || results.length === 0) return null;

    const best = results.sort((a, b) =>
      parseFloat(b.importance || 0) - parseFloat(a.importance || 0)
    )[0];

    return {
      lat: parseFloat(best.lat),
      lng: parseFloat(best.lon),
      formattedAddress: best.display_name,
      confidence: parseFloat(best.importance || 0.3),
      source: 'nominatim',
    };
  } catch (err) {
    console.error('Nominatim error:', err.message);
    return null;
  }
}


async function geocodeAddress(address, biasLat, biasLng) {
  const variants = buildQueryVariants(address);
  const usesMappls = !!process.env.MAPPLS_API_KEY;

  for (const variant of variants) {
    if (usesMappls) {
      const result = await geocodeWithMappls(variant);
      if (result) {
        console.log(`Mappls: "${address.slice(0, 45)}" → "${variant.slice(0, 35)}" [${result.source}]`);
        return result;
      }
      await sleep(100);
    }

    const photon = await geocodeWithPhoton(variant, biasLat, biasLng);
    if (photon) {
      console.log(`Photon: "${address.slice(0, 45)}" → "${variant.slice(0, 35)}"`);
      return photon;
    }
    await sleep(200);

    const nom = await geocodeWithNominatim(variant);
    if (nom) {
      console.log(`Nominatim: "${address.slice(0, 45)}" → "${variant.slice(0, 35)}"`);
      return nom;
    }
    await sleep(300);
  }

  console.warn(`All geocoders failed for: "${address}"`);
  return null;
}


async function geocodeBatch(addresses) {
  const results = [];
  for (let i = 0; i < addresses.length; i++) {
    const geocoded = await geocodeAddress(addresses[i]);
    results.push({ original: addresses[i], geocoded });
    if (i < addresses.length - 1) {
      await sleep(process.env.MAPPLS_API_KEY ? 300 : 1100);
    }
  }
  return results;
}


async function autocompleteAddress(query, biasLat, biasLng) {
  if (!query || query.length < 2) return [];

  if (process.env.MAPPLS_API_KEY) {
    try {
      const results = await mapplsAutosuggest(query, biasLat, biasLng);
      if (results.length > 0) return results;
    } catch { /* fall through */ }
  }

  try {
    const params = new URLSearchParams({
      q: query,
      limit: '6',
      lang: 'en',
      lat: biasLat || '20.5937',
      lon: biasLng || '78.9629',
    });
    params.append('countrycodes', 'in');

    const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
      headers: { 'User-Agent': 'RouteOptimizer/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const features = data.features || [];
      if (features.length > 0) {
        return features.map(f => {
          const p = f.properties || {};
          const [lng, lat] = f.geometry.coordinates;
          const label = [p.name, p.street, p.suburb, p.city || p.town, p.postcode]
            .filter(Boolean).join(', ');
          return {
            label: label || p.name || query,
            lat,
            lng,
            eloc: null,
            source: 'photon',
            type: p.osm_value || '',
          };
        });
      }
    }
  } catch { /* fall through */ }

  try {
    const encoded = encodeURIComponent(query + ', India');
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&countrycodes=in&addressdetails=1`,
      {
        headers: { 'User-Agent': 'RouteOptimizer/1.0 (delivery-route-app)' },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return data.map(r => {
          const addr = r.address || {};
          const parts = [
            addr.amenity || addr.building || addr.office || addr.shop,
            addr.road || addr.pedestrian || addr.suburb,
            addr.city || addr.town || addr.village || addr.county,
            addr.state,
          ].filter(Boolean);

          const label = parts.length >= 2
            ? parts.join(', ')
            : r.display_name.split(',').slice(0, 3).join(',').trim();

          return {
            label: label || r.display_name,
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            eloc: null,
            source: 'nominatim',
            type: r.type || r.class || '',
          };
        });
      }
    }
  } catch (err) {
    console.error('Nominatim autocomplete error:', err.message);
  }

  return [];
}


async function validatePIN(pin) {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    if (data[0].Status === 'Success') {
      return {
        valid: true,
        district: data[0].PostOffice[0].District,
        state: data[0].PostOffice[0].State,
      };
    }
    return { valid: false };
  } catch {
    return { valid: null };
  }
}

module.exports = {
  geocodeAddress,
  geocodeBatch,
  autocompleteAddress,
  resolveMapplsEloc,
  validatePIN,
};