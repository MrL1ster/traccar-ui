import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
  IconButton,
  Tooltip,
  Avatar,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Typography,
  Divider,
} from '@mui/material';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import Battery60Icon from '@mui/icons-material/Battery60';
import BatteryCharging60Icon from '@mui/icons-material/BatteryCharging60';
import Battery20Icon from '@mui/icons-material/Battery20';
import BatteryCharging20Icon from '@mui/icons-material/BatteryCharging20';
import ErrorIcon from '@mui/icons-material/Error';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { devicesActions } from '../store';
import {
  formatAlarm,
  formatBoolean,
  formatPercentage,
  formatSpeed,
  formatStatus,
  getStatusColor,
} from '../common/util/formatter';
import { speedFromKnots } from '../common/util/converter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { isTopDownIcon, mapIcons, resolveDeviceIconKey } from '../map/core/preloadImages';
import { useAdministrator } from '../common/util/permissions';
import EngineIcon from '../resources/images/data/engine.svg?react';
import { useAttributePreference } from '../common/util/preferences';
import GeofencesValue from '../common/components/GeofencesValue';
import DriverValue from '../common/components/DriverValue';
import MotionBar from './components/MotionBar';

dayjs.extend(relativeTime);

const formatTimePassed = (lastTime) => {
  if (!lastTime) {
    return null;
  }
  const parsed = dayjs(lastTime);
  if (!parsed.isValid()) {
    return null;
  }
  const diffMs = Math.max(0, Date.now() - parsed.valueOf());
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) {
    return '< 1 min ago';
  }
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
  }
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  const diffDays = Math.floor(diffMs / 86400000);
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
};

export const shouldShowGroupDivider = (devices, index) => {
  if (index <= 0 || !devices[index] || !devices[index - 1]) {
    return false;
  }
  const prev = devices[index - 1];
  const curr = devices[index];
  const prevOnline = prev.status === 'online';
  const currOnline = curr.status === 'online';
  if (prevOnline !== currOnline) {
    return true;
  }
  return resolveDeviceIconKey(prev) !== resolveDeviceIconKey(curr);
};

const useStyles = makeStyles()((theme) => ({
  rowContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  groupDivider: {
    margin: theme.spacing(0.5, 1.5),
    borderColor: theme.palette.divider,
  },
  rowButton: {
    flex: 1,
    minHeight: 0,
    padding: theme.spacing(0.5, 1.5),
  },
  avatarWrapper: {
    minWidth: 40,
  },
  avatar: {
    width: 32,
    height: 32,
  },
  icon: {
    width: '20px',
    height: '20px',
    filter: 'brightness(0) invert(1)',
  },
  topDownIcon: {
    width: '24px',
    height: '24px',
  },
  text: {
    margin: 0,
  },
  primaryText: {
    fontSize: '0.875rem',
    lineHeight: 1.2,
  },
  secondaryText: {
    fontSize: '0.72rem',
    lineHeight: 1.15,
  },
  statusIconButton: {
    padding: 4,
  },
  speedBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1,
    marginRight: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
  speedUnit: {
    fontSize: '0.65rem',
    fontWeight: 400,
    marginLeft: 2,
  },
  speedMoving: {
    color: theme.palette.text.primary,
  },
  batteryText: {
    fontSize: '0.75rem',
    fontWeight: 'normal',
    lineHeight: '0.875rem',
  },
  success: {
    color: theme.palette.success.main,
  },
  warning: {
    color: theme.palette.warning.main,
  },
  error: {
    color: theme.palette.error.main,
  },
  neutral: {
    color: theme.palette.neutral.main,
  },
  selected: {
    backgroundColor: theme.palette.action.selected,
  },
}));

const DeviceRow = ({ devices, index, style }) => {
  const { classes, cx } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const admin = useAdministrator();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const item = devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);
  const iconKey = resolveDeviceIconKey(item);
  const showDivider = shouldShowGroupDivider(devices, index);

  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const deviceSecondary = useAttributePreference('deviceSecondary', '');
  const speedUnit = useAttributePreference('speedUnit', 'kmh');

  const resolveFieldValue = (field) => {
    if (field === 'geofenceIds') {
      const geofenceIds = position?.geofenceIds;
      return geofenceIds?.length ? <GeofencesValue geofenceIds={geofenceIds} /> : null;
    }
    if (field === 'driverUniqueId') {
      const driverUniqueId = position?.attributes?.driverUniqueId;
      return driverUniqueId ? <DriverValue driverUniqueId={driverUniqueId} /> : null;
    }
    if (field === 'motion') {
      return <MotionBar deviceId={item.id} />;
    }
    return item[field];
  };

  const primaryValue = resolveFieldValue(devicePrimary);
  const secondaryValue = resolveFieldValue(deviceSecondary);

  const secondaryText = () => {
    let status;
    if (item.status === 'online') {
      status = formatStatus(item.status, t);
    } else {
      const lastOnline = item.lastUpdate || position?.fixTime || position?.serverTime;
      status = formatTimePassed(lastOnline) || formatStatus(item.status, t);
    }
    return (
      <>
        {secondaryValue && (
          <>
            {secondaryValue}
            {' • '}
          </>
        )}
        <span className={classes[getStatusColor(item.status)]}>{status}</span>
      </>
    );
  };

  const speedValue =
    position && position.speed != null
      ? Math.round(speedFromKnots(position.speed, speedUnit))
      : null;

  return (
    <div style={style} className={classes.rowContainer}>
      {showDivider && <Divider className={classes.groupDivider} />}
      <ListItemButton
        key={item.id}
        onClick={() => dispatch(devicesActions.selectId(item.id))}
        disabled={!admin && item.disabled}
        selected={selectedDeviceId === item.id}
        className={cx(classes.rowButton, selectedDeviceId === item.id && classes.selected)}
      >
        <ListItemAvatar className={classes.avatarWrapper}>
          <Avatar className={classes.avatar}>
            <img
              className={isTopDownIcon(iconKey) ? classes.topDownIcon : classes.icon}
              src={mapIcons[iconKey]}
              alt=""
            />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          className={classes.text}
          primary={primaryValue}
          secondary={secondaryText()}
          slots={{
            primary: Typography,
            secondary: Typography,
          }}
          slotProps={{
            primary: { noWrap: true, className: classes.primaryText },
            secondary: { noWrap: true, className: classes.secondaryText },
          }}
        />
        {position && (
          <>
            {position.attributes.hasOwnProperty('alarm') && (
              <Tooltip title={`${t('eventAlarm')}: ${formatAlarm(position.attributes.alarm, t)}`}>
                <IconButton size="small" className={classes.statusIconButton}>
                  <ErrorIcon fontSize="small" className={classes.error} />
                </IconButton>
              </Tooltip>
            )}
            {speedValue !== null && (
              <Tooltip
                title={`${t('positionSpeed')}: ${formatSpeed(position.speed, speedUnit, t)}`}
              >
                <span className={cx(classes.speedBadge, speedValue > 0 && classes.speedMoving)}>
                  {speedValue}
                  <span className={classes.speedUnit}>km/h</span>
                </span>
              </Tooltip>
            )}
            {position.attributes.hasOwnProperty('ignition') && (
              <Tooltip
                title={`${t('positionIgnition')}: ${formatBoolean(position.attributes.ignition, t)}`}
              >
                <IconButton size="small" className={classes.statusIconButton}>
                  {position.attributes.ignition ? (
                    <EngineIcon width={18} height={18} className={classes.success} />
                  ) : (
                    <EngineIcon width={18} height={18} className={classes.neutral} />
                  )}
                </IconButton>
              </Tooltip>
            )}
            {position.attributes.hasOwnProperty('batteryLevel') && (
              <Tooltip
                title={`${t('positionBatteryLevel')}: ${formatPercentage(position.attributes.batteryLevel)}`}
              >
                <IconButton size="small" className={classes.statusIconButton}>
                  {(position.attributes.batteryLevel > 70 &&
                    (position.attributes.charge ? (
                      <BatteryChargingFullIcon fontSize="small" className={classes.success} />
                    ) : (
                      <BatteryFullIcon fontSize="small" className={classes.success} />
                    ))) ||
                    (position.attributes.batteryLevel > 30 &&
                      (position.attributes.charge ? (
                        <BatteryCharging60Icon fontSize="small" className={classes.warning} />
                      ) : (
                        <Battery60Icon fontSize="small" className={classes.warning} />
                      ))) ||
                    (position.attributes.charge ? (
                      <BatteryCharging20Icon fontSize="small" className={classes.error} />
                    ) : (
                      <Battery20Icon fontSize="small" className={classes.error} />
                    ))}
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </ListItemButton>
    </div>
  );
};

export default DeviceRow;
