import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { map } from './core/MapView';
import MapMarkers from './MapMarkers';
import { formatTime, getStatusColor } from '../common/util/formatter';
import { isTopDownIcon, resolveDeviceIconKey } from './core/preloadImages';
import { useAttributePreference } from '../common/util/preferences';
import { fromMapCoordinates } from './core/mapUtil';

const ANIMATION_DURATION_MS = 1000;

const shortestAngleDelta = (fromAngle, toAngle) =>
  ((((toAngle - fromAngle) % 360) + 540) % 360) - 180;

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

const MapPositionMarkers = ({
  positions,
  onMapClick,
  onMarkerClick,
  showStatus,
  selectedPosition,
  titleField,
  disabled,
}) => {
  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const mapCluster = useAttributePreference('mapCluster', true);
  const directionType = useAttributePreference('mapDirection', 'selected');

  const animStateRef = useRef({});
  const rafRef = useRef(null);
  const [interpolatedPositions, setInterpolatedPositions] = useState(positions);

  useEffect(() => {
    const now = performance.now();
    const currentAnimState = animStateRef.current;
    const activeDeviceIds = new Set();
    let needsAnimation = false;

    positions.forEach((pos) => {
      const deviceId = pos.deviceId;
      activeDeviceIds.add(deviceId);
      const existing = currentAnimState[deviceId];
      const nextCourse = pos.course ?? 0;

      if (!existing) {
        currentAnimState[deviceId] = {
          startLat: pos.latitude,
          startLng: pos.longitude,
          startCourse: nextCourse,
          currentLat: pos.latitude,
          currentLng: pos.longitude,
          currentCourse: nextCourse,
          targetLat: pos.latitude,
          targetLng: pos.longitude,
          targetCourse: nextCourse,
          startTime: now,
          duration: 0,
          position: pos,
        };
      } else {
        const latDiff = Math.abs(pos.latitude - existing.targetLat);
        const lngDiff = Math.abs(pos.longitude - existing.targetLng);
        const courseDiff = Math.abs(shortestAngleDelta(existing.targetCourse, nextCourse));
        const moved = latDiff > 1e-7 || lngDiff > 1e-7 || courseDiff > 0.5;
        // Avoid animating jumps larger than ~10km
        const reasonableDistance = latDiff < 0.1 && lngDiff < 0.1;

        if (moved && reasonableDistance) {
          existing.startLat = existing.currentLat;
          existing.startLng = existing.currentLng;
          existing.startCourse = existing.currentCourse;
          existing.targetLat = pos.latitude;
          existing.targetLng = pos.longitude;
          existing.targetCourse = nextCourse;
          existing.startTime = now;
          existing.duration = ANIMATION_DURATION_MS;
          existing.position = pos;
          needsAnimation = true;
        } else {
          existing.position = pos;
          if (!reasonableDistance) {
            existing.startLat = pos.latitude;
            existing.startLng = pos.longitude;
            existing.startCourse = nextCourse;
            existing.currentLat = pos.latitude;
            existing.currentLng = pos.longitude;
            existing.currentCourse = nextCourse;
            existing.targetLat = pos.latitude;
            existing.targetLng = pos.longitude;
            existing.targetCourse = nextCourse;
            existing.duration = 0;
          } else if (now - existing.startTime < existing.duration) {
            needsAnimation = true;
          }
        }
      }
    });

    Object.keys(currentAnimState).forEach((id) => {
      if (!activeDeviceIds.has(Number(id)) && !activeDeviceIds.has(id)) {
        delete currentAnimState[id];
      }
    });

    const step = (timestamp) => {
      let stillAnimating = false;
      const nextList = positions.map((pos) => {
        const state = currentAnimState[pos.deviceId];
        if (!state || state.duration === 0) {
          return pos;
        }
        const elapsed = timestamp - state.startTime;
        const rawProgress = Math.min(1, Math.max(0, elapsed / state.duration));
        const progress = easeOutCubic(rawProgress);

        if (rawProgress < 1) {
          stillAnimating = true;
        }

        const lat = state.startLat + (state.targetLat - state.startLat) * progress;
        const lng = state.startLng + (state.targetLng - state.startLng) * progress;
        const deltaAngle = shortestAngleDelta(state.startCourse, state.targetCourse);
        const course = (state.startCourse + deltaAngle * progress + 360) % 360;

        state.currentLat = lat;
        state.currentLng = lng;
        state.currentCourse = course;

        return {
          ...state.position,
          latitude: lat,
          longitude: lng,
          course,
        };
      });

      setInterpolatedPositions(nextList);

      if (stillAnimating) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (needsAnimation) {
      rafRef.current = requestAnimationFrame(step);
    } else {
      step(now);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [positions]);

  const onMapClickCallback = useCallback(
    (event) => {
      if (!event.defaultPrevented && onMapClick) {
        const [longitude, latitude] = fromMapCoordinates(event.lngLat.lng, event.lngLat.lat);
        onMapClick(latitude, longitude);
      }
    },
    [onMapClick],
  );

  useEffect(() => {
    map.on('click', onMapClickCallback);
    return () => map.off('click', onMapClickCallback);
  }, [onMapClickCallback]);

  const buildMarker = (position) => {
    const device = devices[position.deviceId];
    const iconKey = resolveDeviceIconKey(device);
    const rotatable = isTopDownIcon(iconKey);

    let showDirection;
    if (rotatable) {
      showDirection = false;
    } else {
      switch (directionType) {
        case 'none':
          showDirection = false;
          break;
        case 'all':
          showDirection = position.course > 0;
          break;
        default:
          showDirection = selectedPosition?.id === position.id && position.course > 0;
          break;
      }
    }
    const color = showStatus
      ? position.attributes.color || getStatusColor(device.status)
      : 'neutral';
    const titles = { name: device.name, fixTime: formatTime(position.fixTime, 'seconds') };
    return {
      id: position.id,
      deviceId: position.deviceId,
      latitude: position.latitude,
      longitude: position.longitude,
      image: `${iconKey}-${color}`,
      title: titles[titleField || 'name'],
      rotation: position.course,
      rotateIcon: rotatable,
      direction: showDirection,
    };
  };

  const markers = interpolatedPositions
    .filter((it) => devices.hasOwnProperty(it.deviceId))
    .map(buildMarker);

  const onClick = useCallback(
    (properties) => onMarkerClick?.(properties.id, properties.deviceId),
    [onMarkerClick],
  );

  return (
    <>
      <MapMarkers
        markers={markers.filter((it) => it.deviceId !== selectedDeviceId)}
        showTitles
        direction
        cluster={mapCluster}
        onClick={onClick}
        disabled={disabled}
      />
      <MapMarkers
        markers={markers.filter((it) => it.deviceId === selectedDeviceId)}
        showTitles
        direction
        onClick={onClick}
        disabled={disabled}
      />
    </>
  );
};

export default MapPositionMarkers;
