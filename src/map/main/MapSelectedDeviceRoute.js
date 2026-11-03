import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import useMapLayer from '../core/useMapLayer';
import getSpeedColor from '../../common/util/colors';
import { useAttributePreference } from '../../common/util/preferences';
import { toMapCoordinates } from '../core/mapUtil';
import fetchOrThrow from '../../common/util/fetchOrThrow';

const ONE_HOUR_MS = 60 * 60 * 1000;

const MapSelectedDeviceRoute = () => {
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const livePosition = useSelector((state) =>
    selectedDeviceId ? state.session.positions[selectedDeviceId] : null,
  );

  const mapLineWidth = useAttributePreference('mapLineWidth', 4);
  const mapLineOpacity = useAttributePreference('mapLineOpacity', 0.9);

  const [routePositions, setRoutePositions] = useState([]);

  useEffect(() => {
    if (!selectedDeviceId) {
      setRoutePositions([]);
      return undefined;
    }

    const controller = new AbortController();
    const to = dayjs().toISOString();
    const from = dayjs().subtract(1, 'hour').toISOString();
    const query = new URLSearchParams({
      deviceId: selectedDeviceId,
      from,
      to,
    });

    fetchOrThrow(`/api/positions?${query.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        if (!controller.signal.aborted) {
          setRoutePositions(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRoutePositions([]);
        }
      });

    return () => controller.abort();
  }, [selectedDeviceId]);

  useEffect(() => {
    if (!selectedDeviceId || !livePosition || livePosition.deviceId !== selectedDeviceId) {
      return;
    }
    setRoutePositions((prev) => {
      const cutoff = Date.now() - ONE_HOUR_MS;
      const filtered = prev.filter((p) => {
        const time = p.fixTime ? new Date(p.fixTime).getTime() : Date.now();
        return time >= cutoff;
      });
      const last = filtered.at(-1);
      if (
        !last ||
        last.id !== livePosition.id ||
        last.latitude !== livePosition.latitude ||
        last.longitude !== livePosition.longitude
      ) {
        return [...filtered, livePosition];
      }
      return filtered;
    });
  }, [selectedDeviceId, livePosition]);

  const rawMinSpeed = routePositions
    .map((p) => p.speed ?? 0)
    .reduce((a, b) => Math.min(a, b), Infinity);
  const rawMaxSpeed = routePositions
    .map((p) => p.speed ?? 0)
    .reduce((a, b) => Math.max(a, b), -Infinity);
  const minSpeed = Number.isFinite(rawMinSpeed) ? rawMinSpeed : 0;
  const maxSpeed =
    Number.isFinite(rawMaxSpeed) && rawMaxSpeed > minSpeed ? rawMaxSpeed : minSpeed + 1;

  const features = [];
  const lineWidth = Math.max(mapLineWidth, 4);
  for (let i = 0; i < routePositions.length - 1; i += 1) {
    const segmentSpeed = routePositions[i + 1].speed ?? 0;
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          toMapCoordinates(routePositions[i].longitude, routePositions[i].latitude),
          toMapCoordinates(routePositions[i + 1].longitude, routePositions[i + 1].latitude),
        ],
      },
      properties: {
        color: getSpeedColor(segmentSpeed, minSpeed, maxSpeed),
        width: lineWidth,
        opacity: mapLineOpacity,
      },
    });
  }

  useMapLayer({
    layers: [
      {
        key: 'selected-device-route-casing',
        type: 'line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': 'rgba(15, 23, 42, 0.55)',
          'line-width': ['+', ['get', 'width'], 2],
          'line-opacity': ['*', ['get', 'opacity'], 0.85],
        },
      },
      {
        key: 'selected-device-route-line',
        type: 'line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity'],
        },
      },
    ],
    layersDeps: [],
    data: {
      type: 'FeatureCollection',
      features,
    },
    dataDeps: [routePositions, mapLineWidth, mapLineOpacity],
  });

  return null;
};

export default MapSelectedDeviceRoute;
