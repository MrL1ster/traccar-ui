import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { resolveDeviceIconKey } from '../map/core/preloadImages';

const ICON_SORT_ORDER = {
  car: 1,
  tradieUte: 2,
  ewp: 3,
  trailer: 4,
  machinery: 5,
  testEquipment: 6,
  iphone: 7,
  ipad: 8,
};

const getIconPriority = (iconKey) => {
  if (ICON_SORT_ORDER[iconKey] !== undefined) {
    return ICON_SORT_ORDER[iconKey];
  }
  if (iconKey === 'default') {
    return 99;
  }
  return 50;
};

const compareByIcon = (device1, device2) => {
  const icon1 = resolveDeviceIconKey(device1);
  const icon2 = resolveDeviceIconKey(device2);
  const priorityDiff = getIconPriority(icon1) - getIconPriority(icon2);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }
  return icon1.localeCompare(icon2);
};

const getOfflineRank = (device) => {
  if (device.status === 'online') {
    return 0;
  }
  if (device.status === 'unknown') {
    return 1;
  }
  return 2;
};

export default (
  keyword,
  filter,
  filterSort,
  filterMap,
  positions,
  setFilteredDevices,
  setFilteredPositions,
) => {
  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);

  useEffect(() => {
    const deviceGroups = (device) => {
      const groupIds = [];
      let { groupId } = device;
      while (groupId) {
        groupIds.push(groupId);
        groupId = groups[groupId]?.groupId || 0;
      }
      return groupIds;
    };

    const filtered = Object.values(devices)
      .filter((device) => !filter.statuses.length || filter.statuses.includes(device.status))
      .filter(
        (device) =>
          !filter.groups.length || deviceGroups(device).some((id) => filter.groups.includes(id)),
      )
      .filter(
        (device) =>
          !filter.geofences.length ||
          (positions[device.id]?.geofenceIds || []).some((id) => filter.geofences.includes(id)),
      )
      .filter((device) => {
        const lowerCaseKeyword = keyword.toLowerCase();
        return [device.name, device.uniqueId, device.phone, device.model, device.contact].some(
          (s) => s && s.toLowerCase().includes(lowerCaseKeyword),
        );
      });

    filtered.sort((device1, device2) => {
      const statusDiff = getOfflineRank(device1) - getOfflineRank(device2);
      if (statusDiff !== 0) {
        return statusDiff;
      }

      if (filterSort === 'name') {
        const nameDiff = (device1.name || '').localeCompare(device2.name || '');
        if (nameDiff !== 0) {
          return nameDiff;
        }
        return compareByIcon(device1, device2);
      }

      if (filterSort === 'lastUpdate') {
        const time1 = device1.lastUpdate ? dayjs(device1.lastUpdate).valueOf() : 0;
        const time2 = device2.lastUpdate ? dayjs(device2.lastUpdate).valueOf() : 0;
        if (time2 !== time1) {
          return time2 - time1;
        }
        return compareByIcon(device1, device2);
      }

      const iconDiff = compareByIcon(device1, device2);
      if (iconDiff !== 0) {
        return iconDiff;
      }
      return (device1.name || '').localeCompare(device2.name || '');
    });

    setFilteredDevices(filtered);
    setFilteredPositions(
      filterMap
        ? filtered.map((device) => positions[device.id]).filter(Boolean)
        : Object.values(positions),
    );
  }, [
    keyword,
    filter,
    filterSort,
    filterMap,
    groups,
    devices,
    positions,
    setFilteredDevices,
    setFilteredPositions,
  ]);
};
