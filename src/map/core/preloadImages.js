import { grey } from '@mui/material/colors';
import { createTheme } from '@mui/material';
import { loadImage, prepareIcon, prepareTopDownIcon } from './mapUtil';

import directionSvg from '../../resources/images/direction.svg';
import backgroundSvg from '../../resources/images/background.svg';
import carCustomSvg from '../../resources/images/icons/car.svg';
import tradieUteSvg from '../../resources/images/icons/tradie-ute.svg';
import ewpSvg from '../../resources/images/icons/ewp.svg';
import trailerCustomSvg from '../../resources/images/icons/trailer.svg';
import machinerySvg from '../../resources/images/icons/machinery.svg';
import iphoneSvg from '../../resources/images/icons/iphone.svg';
import ipadSvg from '../../resources/images/icons/ipad.svg';
import testEquipmentSvg from '../../resources/images/icons/test-equipment.svg';

import animalSvg from '@material-symbols/svg-600/outlined/pets.svg';
import bicycleSvg from '@material-symbols/svg-600/outlined/directions_bike.svg';
import boatSvg from '@material-symbols/svg-600/outlined/sailing.svg';
import busSvg from '@material-symbols/svg-600/outlined/directions_bus.svg';
import camperSvg from '@material-symbols/svg-600/outlined/rv_hookup.svg';
import craneSvg from '@material-symbols/svg-600/outlined/precision_manufacturing.svg';
import defaultSvg from '@material-symbols/svg-600/outlined/location_on.svg';
import startSvg from '@material-symbols/svg-600/outlined/play_circle.svg';
import finishSvg from '@material-symbols/svg-600/outlined/stop_circle.svg';
import helicopterSvg from '@material-symbols/svg-600/outlined/helicopter.svg';
import motorcycleSvg from '@material-symbols/svg-600/outlined/motorcycle.svg';
import personSvg from '@material-symbols/svg-600/outlined/person.svg';
import planeSvg from '@material-symbols/svg-600/outlined/flight.svg';
import scooterSvg from '@material-symbols/svg-600/outlined/moped.svg';
import shipSvg from '@material-symbols/svg-600/outlined/directions_boat.svg';
import tractorSvg from '@material-symbols/svg-600/outlined/agriculture.svg';
import trainSvg from '@material-symbols/svg-600/outlined/train.svg';
import tramSvg from '@material-symbols/svg-600/outlined/tram.svg';
import truckSvg from '@material-symbols/svg-600/outlined/local_shipping.svg';
import vanSvg from '@material-symbols/svg-600/outlined/airport_shuttle.svg';

import warningSvg from '@material-symbols/svg-600/outlined/warning.svg';
import taskAltSvg from '@material-symbols/svg-600/outlined/task_alt.svg';
import arrowCircleDownSvg from '@material-symbols/svg-600/outlined/arrow_circle_down.svg';
import arrowCircleUpSvg from '@material-symbols/svg-600/outlined/arrow_circle_up.svg';
import bedtimeSvg from '@material-symbols/svg-600/outlined/bedtime.svg';
import cloudOffSvg from '@material-symbols/svg-600/outlined/cloud_off.svg';
import cloudDoneSvg from '@material-symbols/svg-600/outlined/cloud_done.svg';
import speedSvg from '@material-symbols/svg-600/outlined/speed.svg';
import cloudAlertSvg from '@material-symbols/svg-600/outlined/cloud_alert.svg';
import distanceSvg from '@material-symbols/svg-600/outlined/distance.svg';
import powerOffSvg from '@material-symbols/svg-600/outlined/power_off.svg';
import powerSvg from '@material-symbols/svg-600/outlined/power.svg';
import buildSvg from '@material-symbols/svg-600/outlined/build.svg';
import imageSvg from '@material-symbols/svg-600/outlined/image.svg';
import connectWithoutContactSvg from '@material-symbols/svg-600/outlined/connect_without_contact.svg';
import smsSvg from '@material-symbols/svg-600/outlined/sms.svg';

export const mapIcons = {
  animal: animalSvg,
  bicycle: bicycleSvg,
  boat: boatSvg,
  bus: busSvg,
  car: carCustomSvg,
  camper: camperSvg,
  crane: craneSvg,
  default: defaultSvg,
  ewp: ewpSvg,
  finish: finishSvg,
  helicopter: helicopterSvg,
  ipad: ipadSvg,
  iphone: iphoneSvg,
  machinery: machinerySvg,
  motorcycle: motorcycleSvg,
  person: personSvg,
  plane: planeSvg,
  scooter: scooterSvg,
  ship: shipSvg,
  start: startSvg,
  testEquipment: testEquipmentSvg,
  tractor: tractorSvg,
  tradieUte: tradieUteSvg,
  trailer: trailerCustomSvg,
  train: trainSvg,
  tram: tramSvg,
  truck: truckSvg,
  van: vanSvg,
};

const topDownIcons = new Set(['car', 'tradieUte', 'ewp', 'trailer', 'machinery']);

export const isTopDownIcon = (key) => topDownIcons.has(key);

export const mapIconKey = (category) => {
  if (!category) {
    return 'default';
  }
  const normalized = String(category).trim();
  switch (normalized.toLowerCase()) {
    case 'iphone':
    case 'iphones':
      return 'iphone';
    case 'ipad':
    case 'ipads':
      return 'ipad';
    case 'car':
    case 'offroad':
      return 'car';
    case 'pickup':
    case 'tradieute':
    case 'tradie_ute':
    case 'tradie-ute':
    case 'tradie ute with canopy':
      return 'tradieUte';
    case 'ewp':
      return 'ewp';
    case 'trailer':
      return 'trailer';
    case 'machinery':
      return 'machinery';
    case 'testequipment':
    case 'test_equipment':
    case 'test-equipment':
    case 'test equipment':
      return 'testEquipment';
    case 'trolleybus':
      return 'bus';
    default:
      return mapIcons.hasOwnProperty(normalized) ? normalized : 'default';
  }
};

export const resolveDeviceIconKey = (device) => {
  const customIcon = device?.attributes?.deviceIcon || device?.attributes?.icon;
  if (customIcon) {
    const resolved = mapIconKey(customIcon);
    if (resolved !== 'default' || customIcon === 'default') {
      return resolved;
    }
  }
  return mapIconKey(device?.category);
};

export const eventIcons = {
  alarm: warningSvg,
  commandResult: taskAltSvg,
  deviceFuelDrop: arrowCircleDownSvg,
  deviceFuelIncrease: arrowCircleUpSvg,
  deviceInactive: bedtimeSvg,
  deviceMoving: startSvg,
  deviceOffline: cloudOffSvg,
  deviceOnline: cloudDoneSvg,
  deviceOverspeed: speedSvg,
  deviceStopped: finishSvg,
  deviceUnknown: cloudAlertSvg,
  driverChanged: personSvg,
  geofenceCrossed: distanceSvg,
  geofenceEnter: distanceSvg,
  geofenceExit: distanceSvg,
  ignitionOff: powerOffSvg,
  ignitionOn: powerSvg,
  maintenance: buildSvg,
  media: imageSvg,
  proximityEnter: connectWithoutContactSvg,
  proximityExit: connectWithoutContactSvg,
  queuedCommandSent: taskAltSvg,
  textMessage: smsSvg,
  unaccompaniedMotion: connectWithoutContactSvg,
};

export const eventIconKey = (type) => (eventIcons.hasOwnProperty(type) ? type : 'alarm');

export const mapImages = {};

const theme = createTheme({
  palette: {
    neutral: { main: grey[500] },
  },
});

export default async () => {
  const background = await loadImage(backgroundSvg);
  mapImages.background = await prepareIcon(background);
  mapImages.direction = await prepareIcon(await loadImage(directionSvg));
  await Promise.all(
    Object.keys(mapIcons).map(async (key) => {
      const results = [];
      ['info', 'success', 'error', 'neutral'].forEach((color) => {
        results.push(
          loadImage(mapIcons[key]).then((icon) => {
            mapImages[`${key}-${color}`] = isTopDownIcon(key)
              ? prepareTopDownIcon(background, icon, theme.palette[color].main)
              : prepareIcon(background, icon, theme.palette[color].main);
          }),
        );
      });
      await Promise.all(results);
    }),
  );
  await Promise.all(
    Object.keys(eventIcons).map((key) =>
      loadImage(eventIcons[key]).then((icon) => {
        mapImages[key] = prepareIcon(background, icon, theme.palette.neutral.main);
      }),
    ),
  );
};
